import { validateInventoryEdit, type InventoryEdit } from "./catalog-inputs.ts";

/**
 * D1 batch is transactional: any failing statement rolls back the batch.
 * Compare-and-swap on previous stock prevents lost updates.
 */
interface Statement {
  bind(...values: unknown[]): Statement;
  first<T>(): Promise<T | null>;
}
export interface InventoryDatabase {
  prepare(sql: string): Statement;
  batch<T = unknown>(statements: Statement[]): Promise<Array<{
    results: T[];
    success: boolean;
    meta: { changes?: number };
  }>>;
}

export class InventoryConflictError extends Error {
  constructor() { super("El inventario cambió. Actualiza la página e inténtalo nuevamente."); }
}

export async function updateInventory(
  db: InventoryDatabase,
  input: InventoryEdit & { expectedOnHand: number },
  actorUserId: string,
  movementId: string
): Promise<void> {
  const edit = validateInventoryEdit(input);
  if (!Number.isSafeInteger(input.expectedOnHand) || input.expectedOnHand < 0) {
    throw new Error("Existencia anterior inválida.");
  }
  if (!actorUserId || !movementId) throw new Error("Se requiere autor y movimiento.");
  if (edit.onHand === input.expectedOnHand) return;

  // Insert the movement conditionally before changing stock. A failed CAS
  // inserts nothing, and the subsequent UPDATE can only use this movement.
  // Both statements are executed in one D1 transaction via batch().
  const audit = db.prepare(`
    INSERT INTO store_inventory_movements
      (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason)
    SELECT ?, v.id, ?, v.on_hand, ?, ?
    FROM store_variants v
    WHERE v.id = ? AND v.on_hand = ? AND v.reserved <= ?
  `).bind(movementId, actorUserId, edit.onHand, edit.reason,
    edit.variantId, input.expectedOnHand, edit.onHand);

  const update = db.prepare(`
    UPDATE store_variants
    SET on_hand = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND on_hand = ? AND reserved <= ?
      AND EXISTS (
        SELECT 1 FROM store_inventory_movements
        WHERE id = ? AND variant_id = store_variants.id
      )
  `).bind(edit.onHand, edit.variantId, input.expectedOnHand,
    edit.onHand, movementId);

  const results = await db.batch([audit, update]);
  if (!results[0]?.success || results[0]?.meta.changes !== 1 ||
      !results[1]?.success || results[1]?.meta.changes !== 1) {
    throw new InventoryConflictError();
  }
}
