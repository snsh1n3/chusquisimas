import { slugify, type ProductDatabase } from "./product-service.ts";

export function makeSku(productSlug: string, aromaSlug?: string): string {
  const base = slugify(productSlug).replace(/-[0-9a-f]{8}$/i, "");
  const aroma = aromaSlug ? slugify(aromaSlug) : "";
  const sku = `CHV2-${base}${aroma ? `-${aroma}` : ""}`;
  if (sku.length > 120 || sku === "CHV2-") throw new Error("SKU inválido");
  return sku;
}

export async function createVariant(db: ProductDatabase & {
  prepare(sql: string): { bind(...values: unknown[]): unknown; first?: never };
}, args: {
  productId: string; productSlug: string; aromaId: string | null; aromaName: string | null;
  label: string; actorId: string; variantId: string; auditId: string;
}) {
  const label = args.label.trim();
  if (label.length < 2 || label.length > 120 || !args.productId) throw Error("Presentación inválida");
  const sku = makeSku(args.productSlug, args.aromaName ?? undefined);
  const insert = db.prepare(`INSERT INTO store_variants
    (id,product_id,sku,label,aroma_id,status,price_cop,on_hand,reserved)
    SELECT ?,p.id,?,?,?,'inactive',NULL,0,0 FROM store_products p WHERE p.id=?`)
    .bind(args.variantId, sku, label, args.aromaId, args.productId);
  const audit = db.prepare(`INSERT INTO admin_audit_log
    (id,actor_user_id,action,resource_type,resource_id,details_json)
    SELECT ?,?,'variant_create','variant',id,json_object('sku',?,'product',?)
    FROM store_variants WHERE id=?`)
    .bind(args.auditId, args.actorId, sku, args.productId, args.variantId);
  const results = await db.batch([insert, audit]);
  if (results.length !== 2 || results.some(x => !x.success || x.meta.changes !== 1))
    throw Error("No se pudo crear la variante");
  return { sku };
}
