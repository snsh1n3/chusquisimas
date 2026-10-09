export type ProductType = "candle" | "wax_melt" | "kit" | "custom";
export type ProductStatus = "draft" | "active" | "archived";

export function validateNewProduct(value: {
  name: string; description: string; productType: string;
}) {
  const name = value.name.trim();
  const description = value.description.trim();
  if (name.length < 2 || name.length > 120) throw Error("Nombre inválido (2–120 caracteres)");
  if (description.length > 2000) throw Error("Descripción demasiado extensa");
  if (!["candle", "wax_melt", "kit", "custom"].includes(value.productType)) {
    throw Error("Tipo de producto inválido");
  }
  return { name, description, productType: value.productType as ProductType };
}

export function validateStatus(value: unknown): ProductStatus {
  if (value !== "draft" && value !== "active" && value !== "archived") {
    throw Error("Estado inválido");
  }
  return value;
}

export function slugify(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64);
}

/** D1 batch runs atomically. Audited operations stay in the same batch. */
export interface ProductDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): unknown;
  };
  batch(statements: unknown[]): Promise<Array<{ success: boolean; meta: { changes?: number } }>>;
}

export async function createDraftProduct(
  db: ProductDatabase, value: { name: string; description: string; productType: string },
  actorId: string, productId: string, auditId: string,
) {
  const product = validateNewProduct(value);
  const slug = `${slugify(product.name) || "producto"}-${productId.slice(0, 8)}`;
  const insert = db.prepare(
    "INSERT INTO store_products (id,slug,name,description,status,product_type) VALUES (?,?,?,?,'draft',?)"
  ).bind(productId, slug, product.name, product.description, product.productType);
  const audit = db.prepare(
    "INSERT INTO admin_audit_log (id,actor_user_id,action,resource_type,resource_id,details_json) VALUES (?,?,'product_create','product',?,json_object('name',?,'status','draft'))"
  ).bind(auditId, actorId, productId, product.name);
  const initialVariant = db.prepare(
    "INSERT INTO store_variants (id,product_id,sku,label,status,price_cop,on_hand,reserved) VALUES (?,?,?, ?,'inactive',NULL,0,0)"
  ).bind(`variant-${productId}`, productId, `CHV2-${slugify(product.name)}`, "Presentación estándar");
  const category = product.productType === "candle" ? "cat-velas-aromaticas"
    : product.productType === "wax_melt" ? "cat-wax-melts"
    : product.productType === "kit" ? "cat-kits" : "cat-personalizados";
  const linkCategory = db.prepare(
    "INSERT INTO store_product_categories (product_id,category_id) VALUES (?,?)"
  ).bind(productId, category);
  const results = await db.batch([insert, initialVariant, linkCategory, audit]);
  if (results.length !== 4 || results.some(x => !x.success || x.meta.changes !== 1)) {
    throw Error("No se pudo crear el producto");
  }
  return { id: productId, slug };
}

export class ProductConflictError extends Error {}

export async function changeProductStatus(
  db: ProductDatabase, id: string, previous: ProductStatus, target: ProductStatus,
  actorId: string, auditId: string,
) {
  if (!id || id.length > 120 || previous === target) throw new ProductConflictError("Cambio inválido");
  // Before showing in the storefront, require at least one complete active variant.
  // No prices are fabricated and no draft variants are silently made active.
  const readyClause = target === "active"
    ? " AND EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=store_products.id AND v.status='active' AND v.price_cop IS NOT NULL)"
    : "";
  const audit = db.prepare(
    `INSERT INTO admin_audit_log (id,actor_user_id,action,resource_type,resource_id,details_json)
     SELECT ?,?,'product_status','product',id,json_object('before',?,'after',?)
     FROM store_products WHERE id=? AND status=?${readyClause}`
  ).bind(auditId, actorId, previous, target, id, previous);
  const update = db.prepare(
    `UPDATE store_products SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id=? AND status=?${readyClause}
     AND EXISTS (SELECT 1 FROM admin_audit_log WHERE id=? AND resource_id=store_products.id)`
  ).bind(target, id, previous, auditId);
  const results = await db.batch([audit, update]);
  if (results.length !== 2 || results.some(x => !x.success || x.meta.changes !== 1)) {
    throw new ProductConflictError("Estado desactualizado o ninguna variante activa con precio");
  }
}

/** Keep stable product IDs, slugs and SKUs while editing display metadata. */
export async function editProduct(
  db: ProductDatabase,
  input: { id: string; expectedName: string; name: string; description: string; productType: string },
  actorId: string,
  auditId: string,
) {
  if (!input.id || input.id.length > 120 || typeof input.expectedName !== "string") {
    throw new ProductConflictError("Producto inválido");
  }
  const product = validateNewProduct(input);
  const category = product.productType === "candle" ? "cat-velas-aromaticas"
    : product.productType === "wax_melt" ? "cat-wax-melts"
    : product.productType === "kit" ? "cat-kits" : "cat-personalizados";
  const audit = db.prepare(`
    INSERT INTO admin_audit_log (id,actor_user_id,action,resource_type,resource_id,details_json)
    SELECT ?,?,'product_edit','product',id,
      json_object('old_name',name,'new_name',?,'old_description',description,'new_description',?,
                  'old_type',product_type,'new_type',?)
    FROM store_products WHERE id=? AND name=?
  `).bind(auditId, actorId, product.name, product.description, product.productType,
    input.id, input.expectedName);
  const update = db.prepare(`
    UPDATE store_products SET name=?, description=?, product_type=?, updated_at=CURRENT_TIMESTAMP
    WHERE id=? AND name=? AND EXISTS
    (SELECT 1 FROM admin_audit_log WHERE id=? AND resource_id=store_products.id)
  `).bind(product.name, product.description, product.productType,
    input.id, input.expectedName, auditId);
  const unlink = db.prepare("DELETE FROM store_product_categories WHERE product_id=?")
    .bind(input.id);
  const link = db.prepare("INSERT INTO store_product_categories(product_id,category_id) VALUES(?,?)")
    .bind(input.id, category);
  const results = await db.batch([audit, update, unlink, link]);
  if (results.length !== 4 || !results[0]?.success || results[0].meta.changes !== 1 ||
      !results[1]?.success || results[1].meta.changes !== 1 ||
      !results[2]?.success || !results[3]?.success || results[3].meta.changes !== 1) {
    throw new ProductConflictError("Producto desactualizado. Recarga e inténtalo otra vez.");
  }
}

/**
 * Hard-delete only a safely archived product.
 * All variants must have zero stock/reservations, and none can have stock
 * movement history. Keep a tombstone audit record outside FK cascade.
 * D1 batch is atomic: an unmet prerequisite aborts the batch.
 */
export async function deleteArchivedProduct(
  db: ProductDatabase, id: string, expectedName: string, actorId: string, auditId: string,
) {
  if (!id || id.length > 120 || !expectedName || expectedName.length > 120) {
    throw new ProductConflictError("Producto inválido");
  }
  const safe = `p.id=? AND p.name=? AND p.status='archived'
    AND NOT EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
      AND (v.on_hand<>0 OR v.reserved<>0))
    AND NOT EXISTS (SELECT 1 FROM store_inventory_movements m
      JOIN store_variants v ON v.id=m.variant_id WHERE v.product_id=p.id)`;
  // Audit first, then dependent rows and the product. A failed guarded
  // product deletion aborts the atomic batch on FK/constraint failure.
  const audit = db.prepare(`INSERT INTO admin_audit_log
    (id,actor_user_id,action,resource_type,resource_id,details_json)
    SELECT ?,?,'product_delete','product',p.id,
      json_object('name',p.name,'slug',p.slug,'status',p.status)
    FROM store_products p WHERE ${safe}`)
    .bind(auditId, actorId, id, expectedName);
  const images = db.prepare(`DELETE FROM store_product_images WHERE product_id=?
    AND EXISTS (SELECT 1 FROM store_products p WHERE ${safe})`)
    .bind(id, id, expectedName);
  const categories = db.prepare(`DELETE FROM store_product_categories WHERE product_id=?
    AND EXISTS (SELECT 1 FROM store_products p WHERE ${safe})`)
    .bind(id, id, expectedName);
  const variants = db.prepare(`DELETE FROM store_variants WHERE product_id=?
    AND EXISTS (SELECT 1 FROM store_products p WHERE ${safe})`)
    .bind(id, id, expectedName);
  const product = db.prepare(`DELETE FROM store_products WHERE id=? AND name=?
    AND status='archived' AND EXISTS
    (SELECT 1 FROM admin_audit_log WHERE id=? AND action='product_delete')
    AND NOT EXISTS (SELECT 1 FROM store_variants WHERE product_id=store_products.id)`)
    .bind(id, expectedName, auditId);
  const results = await db.batch([audit, images, categories, variants, product]);
  if (results.length !== 5 || results.some(r => !r.success) ||
      results[0].meta.changes !== 1 || results[4].meta.changes !== 1) {
    throw new ProductConflictError("No se puede eliminar: debe estar archivado, sin existencias, reservas ni movimientos.");
  }
}
