/** Consultas de pedidos para el panel (requieren orders.read en la ruta). */
import type { OrdersDatabase } from "./order-db.ts";
import type { Fulfillment, OrderStatus } from "./order-service.ts";

export interface AdminOrderSummary {
  id: string;
  code: string;
  status: OrderStatus;
  customer_name: string;
  customer_city: string;
  shipping_label: string;
  shipping_cop: number | null;
  subtotal_cop: number;
  units: number;
  expires_at: string | null;
  created_at: string;
}

export async function listOrders(
  db: OrdersDatabase,
  status: OrderStatus | "open" | "all",
  limit = 100
): Promise<AdminOrderSummary[]> {
  const where = status === "all" ? "1 = 1"
    : status === "open" ? "o.status IN ('received','preparing','shipped')"
    : "o.status = ?";
  const statement = db.prepare(`SELECT o.id, o.code, o.status, o.customer_name, o.customer_city,
      o.shipping_label, o.shipping_cop, o.subtotal_cop, o.expires_at, o.created_at,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM store_order_items i WHERE i.order_id = o.id) AS units
    FROM store_orders o WHERE ${where}
    ORDER BY o.created_at DESC LIMIT ?`);
  const bound = status === "all" || status === "open" ? statement.bind(limit) : statement.bind(status, limit);
  return (await bound.all<AdminOrderSummary>()).results;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  customer_phone: string;
  cancel_reason: string | null;
  privacy_notice_version: string;
  privacy_consent_at: string;
  items: Array<{
    product_name: string; variant_label: string; aroma: string | null; quantity: number;
    unit_price_cop: number; fulfillment: Fulfillment; preparation_days: number | null; reserved_qty: number;
  }>;
  events: Array<{
    from_status: OrderStatus | null; to_status: OrderStatus; note: string; created_at: string;
    actor: string | null;
  }>;
}

export async function getOrderDetail(db: OrdersDatabase, id: string): Promise<AdminOrderDetail | null> {
  const order = await db.prepare(`SELECT o.*,
      (SELECT COALESCE(SUM(i.quantity), 0) FROM store_order_items i WHERE i.order_id = o.id) AS units
    FROM store_orders o WHERE o.id = ?`).bind(id).first<Omit<AdminOrderDetail, "items" | "events">>();
  if (!order) return null;
  const [items, events] = await Promise.all([
    db.prepare(`SELECT product_name, variant_label, aroma, quantity, unit_price_cop, fulfillment,
        preparation_days, reserved_qty
      FROM store_order_items WHERE order_id = ? ORDER BY sort_order`).bind(id).all<AdminOrderDetail["items"][number]>(),
    db.prepare(`SELECT e.from_status, e.to_status, e.note, e.created_at,
        COALESCE(u.display_name, u.email) AS actor
      FROM store_order_events e LEFT JOIN admin_users u ON u.id = e.actor_user_id
      WHERE e.order_id = ? ORDER BY e.created_at, e.rowid`).bind(id).all<AdminOrderDetail["events"][number]>(),
  ]);
  return { ...order, items: items.results, events: events.results };
}

/** Fecha y hora en Bogotá para el panel. */
export function formatBogota(iso: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short",
  }).format(new Date(iso));
}
