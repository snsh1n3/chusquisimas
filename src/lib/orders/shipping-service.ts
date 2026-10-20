/** Tarifas de envío (local y nacional), editables desde el panel. */
import { ValidationError } from "../observability/errors.ts";
import { SHIPPING_ZONES, type ShippingZone } from "./order-inputs.ts";
import { isoNow, type OrdersDatabase } from "./order-db.ts";

export interface ShippingZoneView {
  id: ShippingZone;
  label: string;
  /** null = por confirmar. */
  priceCOP: number | null;
}

export const MAX_SHIPPING_COP = 1_000_000;

export async function listShippingZones(db: OrdersDatabase): Promise<ShippingZoneView[]> {
  const { results } = await db.prepare(
    "SELECT id, label, price_cop FROM store_shipping_zones ORDER BY sort_order, id"
  ).all<{ id: ShippingZone; label: string; price_cop: number | null }>();
  return results.map((row) => ({ id: row.id, label: row.label, priceCOP: row.price_cop }));
}

export interface ShippingZoneEdit {
  zone: ShippingZone;
  label: string;
  priceCOP: number | null;
}

export function validateShippingZoneEdit(value: unknown): ShippingZoneEdit {
  if (!value || typeof value !== "object") throw new ValidationError("shipping_body_invalid", "Solicitud inválida.");
  const body = value as Record<string, unknown>;
  if (typeof body.zone !== "string" || !(SHIPPING_ZONES as readonly string[]).includes(body.zone)) {
    throw new ValidationError("shipping_zone_invalid", "Tipo de envío inválido.");
  }
  if (typeof body.label !== "string") throw new ValidationError("shipping_label_invalid", "Escribe un nombre.");
  const label = body.label.replace(/\s+/g, " ").trim();
  if (label.length < 3 || label.length > 60) {
    throw new ValidationError("shipping_label_invalid", "El nombre debe tener entre 3 y 60 caracteres.");
  }
  const price = body.priceCOP;
  if (price !== null && (typeof price !== "number" || !Number.isSafeInteger(price) ||
      price < 0 || price > MAX_SHIPPING_COP)) {
    throw new ValidationError("shipping_price_invalid",
      "El valor debe ser un número entero en pesos, o dejarlo vacío para \"por confirmar\".");
  }
  return { zone: body.zone as ShippingZone, label, priceCOP: price as number | null };
}

/** Actualiza la tarifa y la deja auditada en el mismo batch. */
export async function updateShippingZone(
  db: OrdersDatabase,
  edit: ShippingZoneEdit,
  actorUserId: string,
  auditId: string,
  now: Date
): Promise<void> {
  const at = isoNow(now);
  const results = await db.batch([
    db.prepare(`INSERT INTO admin_audit_log (id, actor_user_id, action, resource_type, resource_id, details_json, created_at)
      SELECT ?, ?, 'shipping.update', 'shipping_zone', z.id,
        json_object('oldLabel', z.label, 'newLabel', ?, 'oldPriceCOP', z.price_cop, 'newPriceCOP', ?), ?
      FROM store_shipping_zones z WHERE z.id = ?`)
      .bind(auditId, actorUserId, edit.label, edit.priceCOP, at, edit.zone),
    db.prepare(`UPDATE store_shipping_zones SET label = ?, price_cop = ?, updated_at = ?
      WHERE id = ? AND EXISTS (SELECT 1 FROM admin_audit_log WHERE id = ?)`)
      .bind(edit.label, edit.priceCOP, at, edit.zone, auditId),
  ]);
  if (results[1]?.meta.changes !== 1) {
    throw new ValidationError("shipping_zone_missing", "Tipo de envío no encontrado.");
  }
}
