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
  ).bind(`variant-${productId}`, productId, `CHV2-${productId.slice(0, 12)}`, "Presentación estándar");
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
