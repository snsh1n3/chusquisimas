/**
 * Operaciones de fotografías sobre D1. Cada cambio va en un batch atómico con
 * su registro de auditoría. R2 se maneja en la ruta: este módulo solo devuelve
 * qué objetos quedaron sin uso.
 */
import { ConflictError } from "../observability/errors.ts";
import {
  applyImageOrder, assertCurrentOrder, thumbnailKeyFor, type ImageOrderAction,
} from "./image-order.ts";

export interface ImageDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      all<T>(): Promise<{ results: T[] }>;
    };
  };
  batch(statements: unknown[]): Promise<Array<{ success: boolean; meta: { changes?: number } }>>;
}

export interface StoredImage {
  id: string;
  productId: string;
  storageKey: string;
  alt: string;
  sortOrder: number;
}

interface ImageRow {
  id: string;
  product_id: string;
  storage_key: string;
  alt_text: string;
  sort_order: number;
}

const toImage = (row: ImageRow): StoredImage => ({
  id: row.id.toLowerCase(),
  productId: row.product_id,
  storageKey: row.storage_key,
  alt: row.alt_text,
  sortOrder: row.sort_order,
});

export async function listProductImages(db: ImageDatabase, productId: string): Promise<StoredImage[]> {
  const { results } = await db.prepare(
    `SELECT id, product_id, storage_key, alt_text, sort_order FROM store_product_images
      WHERE product_id = ? ORDER BY sort_order, id`
  ).bind(productId).all<ImageRow>();
  return results.map(toImage);
}

/** Producto al que pertenece una foto (para validar acciones por id). */
export async function findImageProduct(db: ImageDatabase, imageId: string): Promise<string | null> {
  const { results } = await db.prepare(
    "SELECT product_id FROM store_product_images WHERE id = ? COLLATE NOCASE"
  ).bind(imageId).all<{ product_id: string }>();
  return results[0]?.product_id ?? null;
}

function assertAllChanged(results: Array<{ success: boolean; meta: { changes?: number } }>, expected: number) {
  if (results.length !== expected || results.some((r) => !r.success || r.meta.changes !== 1)) {
    throw new ConflictError(
      "No se pudo aplicar el cambio porque las fotografías cambiaron. Recarga la página.",
      "image_write_conflict"
    );
  }
}

export async function reorderProductImages(
  db: ImageDatabase,
  input: { productId: string; expectedOrder: readonly string[]; action: ImageOrderAction },
  actorId: string,
  auditId: string
): Promise<string[]> {
  const images = await listProductImages(db, input.productId);
  const current = images.map((image) => image.id);
  assertCurrentOrder(current, input.expectedOrder);
  const next = applyImageOrder(current, input.action);
  if (next.every((id, index) => id === current[index])) return next;

  const updates = next.map((id, index) => db.prepare(
    "UPDATE store_product_images SET sort_order = ? WHERE id = ? COLLATE NOCASE AND product_id = ?"
  ).bind(index, id, input.productId));
  const audit = db.prepare(
    `INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id, details_json)
      VALUES (?, ?, 'product_image_reorder', 'product', ?, json_object('before', json(?), 'after', json(?)))`
  ).bind(auditId, actorId, input.productId, JSON.stringify(current), JSON.stringify(next));
  assertAllChanged(await db.batch([...updates, audit]), updates.length + 1);
  return next;
}

/**
 * Elimina la fila de D1 (la foto deja de servirse de inmediato) y devuelve las
 * claves de R2 a borrar: la principal y su miniatura.
 */
export async function deleteProductImage(
  db: ImageDatabase,
  input: { productId: string; imageId: string; expectedOrder: readonly string[] },
  actorId: string,
  auditId: string
): Promise<{ objectKeys: string[]; remaining: string[] }> {
  const images = await listProductImages(db, input.productId);
  assertCurrentOrder(images.map((image) => image.id), input.expectedOrder);
  const target = images.find((image) => image.id === input.imageId.toLowerCase());
  if (!target) {
    throw new ConflictError("La fotografía ya no existe. Recarga la página.", "image_already_deleted");
  }
  // La auditoría se inserta primero: lee la fila antes de que se elimine.
  const audit = db.prepare(
    `INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id, details_json)
      SELECT ?, ?, 'product_image_delete', 'product', product_id,
        json_object('image_id', id, 'storage_key', storage_key, 'alt_text', alt_text)
      FROM store_product_images WHERE id = ? COLLATE NOCASE AND product_id = ?`
  ).bind(auditId, actorId, target.id, input.productId);
  const remove = db.prepare(
    "DELETE FROM store_product_images WHERE id = ? COLLATE NOCASE AND product_id = ?"
  ).bind(target.id, input.productId);
  assertAllChanged(await db.batch([audit, remove]), 2);
  return {
    objectKeys: [target.storageKey, thumbnailKeyFor(target.storageKey)],
    remaining: images.filter((image) => image.id !== target.id).map((image) => image.id),
  };
}
