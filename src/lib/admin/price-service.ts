import { validatePriceEdit } from "./catalog-inputs.ts";

export interface PriceDatabase {
  prepare(sql: string): { bind(...values: unknown[]): unknown };
  batch(statements: unknown[]): Promise<Array<{ success: boolean; meta: { changes?: number } }>>;
}

export class PriceConflictError extends Error {}

export async function updatePrice(
  db: PriceDatabase,
  input: { variantId: string; priceCOP: number | null; expectedPriceCOP: number | null },
  actorId: string,
  auditId: string,
): Promise<void> {
  const edit = validatePriceEdit(input);
  validatePriceEdit({ variantId: edit.variantId, priceCOP: input.expectedPriceCOP });
  if (!actorId || !auditId) throw new Error("Auditoría requerida");
  if (edit.priceCOP === input.expectedPriceCOP) return;
  const audit = db.prepare(
    "INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id, details_json) SELECT ?, ?, 'price_update', 'variant', id, json_object('before',price_cop,'after',?) FROM store_variants WHERE id = ? AND price_cop IS ?"
  ).bind(auditId, actorId, edit.priceCOP, edit.variantId, input.expectedPriceCOP);
  const update = db.prepare(
    "UPDATE store_variants SET price_cop = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND price_cop IS ? AND EXISTS (SELECT 1 FROM admin_audit_log WHERE id = ? AND resource_id = store_variants.id)"
  ).bind(edit.priceCOP, edit.variantId, input.expectedPriceCOP, auditId);
  const result = await db.batch([audit, update]);
  if (result.length !== 2 || result.some(x => !x.success || x.meta.changes !== 1)) {
    throw new PriceConflictError("Precio desactualizado; recarga la página");
  }
}
