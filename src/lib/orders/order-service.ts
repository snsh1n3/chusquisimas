/**
 * Pedidos registrados: creación con reserva de inventario, cambios de estado
 * auditados y vencimiento automático de reservas.
 *
 * Invariantes:
 * - Precio, nombre y disponibilidad salen de D1, nunca del navegador.
 * - Pedido, líneas, evento inicial y reservas se escriben en un solo batch
 *   (transacción). `CHECK(reserved <= on_hand)` de store_variants hace fallar
 *   todo el batch si otro pedido tomó las últimas unidades al mismo tiempo.
 * - Cada transición inserta primero su evento con id único y condicionado al
 *   estado esperado; los efectos de inventario dependen de que ese evento
 *   exista. Así una transición repetida o concurrente no se aplica dos veces.
 */
import { ConflictError, ValidationError } from "../observability/errors.ts";
import {
  ORDER_RESERVATION_HOURS, PRIVACY_NOTICE_VERSION, generateOrderCode,
  type OrderInput, type ShippingZone,
} from "./order-inputs.ts";
import { isConstraintError, isoNow, type OrdersDatabase, type OrdersStatement } from "./order-db.ts";
import { PUBLISHED_VARIANT_SQL } from "../catalog/publish-rules.ts";

export const ORDER_STATUSES = ["received", "preparing", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "Recibido",
  preparing: "En preparación",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

/** Transiciones permitidas. Entregado y cancelado son finales. */
export const ORDER_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  received: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export type Fulfillment = "ready_stock" | "made_to_order";

export interface CreatedOrderLine {
  productName: string;
  variantLabel: string;
  aroma: string | null;
  quantity: number;
  unitPriceCOP: number;
  fulfillment: Fulfillment;
  preparationDays: number | null;
}

export interface CreatedOrder {
  id: string;
  code: string;
  lines: CreatedOrderLine[];
  subtotalCOP: number;
  shippingLabel: string;
  /** null = envío por confirmar. */
  shippingCOP: number | null;
  expiresAt: string;
  customer: { name: string; city: string };
}

interface VariantForOrder {
  id: string;
  product_name: string;
  label: string;
  aroma: string | null;
  price_cop: number;
  on_hand: number;
  reserved: number;
  allow_made_to_order: number;
  preparation_days: number;
}

interface ShippingZoneRow { id: ShippingZone; label: string; price_cop: number | null; }

export interface OrderDeps {
  now: () => Date;
  newId: () => string;
  newCode?: () => string;
}

const MAX_CREATE_ATTEMPTS = 3;

async function loadVariants(db: OrdersDatabase, ids: string[]): Promise<Map<string, VariantForOrder>> {
  const placeholders = ids.map(() => "?").join(",");
  const { results } = await db.prepare(`
    SELECT v.id, p.name AS product_name, v.label, a.name AS aroma, v.price_cop,
      v.on_hand, v.reserved, v.allow_made_to_order, v.preparation_days
    FROM store_variants v
    JOIN store_products p ON p.id = v.product_id
    LEFT JOIN store_aromas a ON a.id = v.aroma_id
    WHERE v.id IN (${placeholders})
      AND ${PUBLISHED_VARIANT_SQL}
  `).bind(...ids).all<VariantForOrder>();
  return new Map(results.map((row) => [row.id, row]));
}

export async function loadShippingZone(db: OrdersDatabase, zone: ShippingZone): Promise<ShippingZoneRow> {
  const row = await db.prepare(
    "SELECT id, label, price_cop FROM store_shipping_zones WHERE id = ?"
  ).bind(zone).first<ShippingZoneRow>();
  if (!row) throw new ValidationError("shipping_zone_missing", "Elige el tipo de envío.");
  return row;
}

/** Crea el pedido y aparta las unidades de entrega inmediata. */
export async function createOrder(db: OrdersDatabase, input: OrderInput, deps: OrderDeps): Promise<CreatedOrder> {
  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      return await tryCreateOrder(db, input, deps);
    } catch (error) {
      // UNIQUE: colisión del código aleatorio. CHECK: otro pedido tomó las
      // unidades entre la lectura y el batch. En ambos casos se reintenta con
      // datos frescos; la segunda lectura decide bajo pedido o agotado.
      if (isConstraintError(error, "UNIQUE") || isConstraintError(error, "CHECK")) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }
  throw new ConflictError("No pudimos registrar el pedido. Inténtalo de nuevo.", "order_create_conflict",
    { cause: lastError });
}

async function tryCreateOrder(db: OrdersDatabase, input: OrderInput, deps: OrderDeps): Promise<CreatedOrder> {
  // Un solo pedido sin confirmar por número de WhatsApp: evita que un mismo
  // cliente aparte el inventario una y otra vez sin confirmar.
  const pending = await db.prepare(`SELECT 1 AS found FROM store_orders
    WHERE customer_phone = ? AND status = 'received' AND expires_at > ? LIMIT 1`)
    .bind(input.customer.phone, isoNow(deps.now())).first<{ found: number }>();
  if (pending) {
    throw new ValidationError("order_pending_exists",
      "Ya tienes un pedido pendiente de confirmar. Escríbenos por WhatsApp para confirmarlo o cancelarlo.");
  }
  const variants = await loadVariants(db, input.items.map((item) => item.variantId));
  const zone = await loadShippingZone(db, input.shippingZone);

  const lines: Array<CreatedOrderLine & { variantId: string; reservedQty: number }> = [];
  for (const item of input.items) {
    const variant = variants.get(item.variantId);
    if (!variant) {
      throw new ValidationError("order_variant_unavailable",
        "Uno de los productos del carrito ya no está disponible. Actualiza el carrito.");
    }
    const available = Math.max(0, variant.on_hand - variant.reserved);
    let fulfillment: Fulfillment;
    if (item.quantity <= available) fulfillment = "ready_stock";
    else if (variant.allow_made_to_order === 1) fulfillment = "made_to_order";
    else {
      throw new ValidationError("order_variant_sold_out",
        `${variant.product_name} no tiene suficientes unidades disponibles.`);
    }
    lines.push({
      variantId: variant.id,
      productName: variant.product_name,
      variantLabel: variant.label,
      aroma: variant.aroma,
      quantity: item.quantity,
      unitPriceCOP: variant.price_cop,
      fulfillment,
      preparationDays: fulfillment === "made_to_order" ? variant.preparation_days : null,
      reservedQty: fulfillment === "ready_stock" ? item.quantity : 0,
    });
  }

  const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCOP * line.quantity, 0);
  if (!Number.isSafeInteger(subtotal)) throw new ValidationError("order_total_invalid", "Pedido inválido.");

  const now = deps.now();
  const createdAt = isoNow(now);
  const expiresAt = isoNow(new Date(now.getTime() + ORDER_RESERVATION_HOURS * 3600_000));
  const orderId = deps.newId();
  const code = (deps.newCode ?? generateOrderCode)();

  const statements: OrdersStatement[] = [
    db.prepare(`INSERT INTO store_orders
      (id, code, status, customer_name, customer_phone, customer_city, shipping_zone, shipping_label,
       shipping_cop, subtotal_cop, privacy_notice_version, privacy_consent_at, expires_at,
       created_at, updated_at)
      VALUES (?, ?, 'received', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(orderId, code, input.customer.name, input.customer.phone, input.customer.city,
        zone.id, zone.label, zone.price_cop, subtotal, PRIVACY_NOTICE_VERSION, createdAt,
        expiresAt, createdAt, createdAt),
    db.prepare(`INSERT INTO store_order_events (id, order_id, actor_user_id, from_status, to_status, note, created_at)
      VALUES (?, ?, NULL, NULL, 'received', 'Pedido registrado desde la tienda', ?)`)
      .bind(deps.newId(), orderId, createdAt),
  ];
  lines.forEach((line, index) => {
    statements.push(db.prepare(`INSERT INTO store_order_items
      (id, order_id, variant_id, product_name, variant_label, aroma, quantity, unit_price_cop,
       fulfillment, preparation_days, reserved_qty, sort_order)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(deps.newId(), orderId, line.variantId, line.productName, line.variantLabel, line.aroma,
        line.quantity, line.unitPriceCOP, line.fulfillment, line.preparationDays, line.reservedQty, index));
    if (line.reservedQty > 0) {
      // Sin condición de estado en el WHERE a propósito: si la variante se
      // desactiva entre la lectura y el batch, la reserva igual debe quedar
      // registrada (el ítem ya la declara). Si no alcanzan las unidades, el
      // CHECK(reserved <= on_hand) aborta el batch completo.
      statements.push(db.prepare(`UPDATE store_variants SET reserved = reserved + ?, updated_at = ?
        WHERE id = ?`).bind(line.reservedQty, createdAt, line.variantId));
    }
  });

  const results = await db.batch(statements);
  if (results.some((result) => !result.success)) {
    throw new ConflictError("No pudimos registrar el pedido. Inténtalo de nuevo.", "order_create_failed");
  }
  return {
    id: orderId,
    code,
    lines: lines.map(({ variantId: _variantId, reservedQty: _reserved, ...line }) => line),
    subtotalCOP: subtotal,
    shippingLabel: zone.label,
    shippingCOP: zone.price_cop,
    expiresAt,
    customer: { name: input.customer.name, city: input.customer.city },
  };
}

interface ItemForTransition {
  code: string;
  variant_id: string | null;
  fulfillment: Fulfillment;
  reserved_qty: number;
}

export interface TransitionInput {
  orderId: string;
  from: OrderStatus;
  to: OrderStatus;
  note?: string;
}

export interface TransitionOptions {
  actorUserId: string | null;
  eventId: string;
  now: Date;
  newId: () => string;
  /** Solo para el vencimiento automático: exige expires_at <= now. */
  requireExpired?: boolean;
  cancelReason?: string;
}

/** Cambia el estado de un pedido y aplica sus efectos de inventario. */
export async function transitionOrder(
  db: OrdersDatabase,
  input: TransitionInput,
  options: TransitionOptions
): Promise<void> {
  if (!ORDER_TRANSITIONS[input.from].includes(input.to)) {
    throw new ValidationError("order_transition_invalid", "Ese cambio de estado no está permitido.");
  }
  const note = (input.note ?? "").replace(/\s+/g, " ").trim().slice(0, 300);
  const at = isoNow(options.now);
  const { results: items } = await db.prepare(`SELECT o.code, i.variant_id, i.fulfillment, i.reserved_qty
    FROM store_order_items i JOIN store_orders o ON o.id = i.order_id WHERE i.order_id = ?`
  ).bind(input.orderId).all<ItemForTransition>();

  const eventExists = "EXISTS (SELECT 1 FROM store_order_events WHERE id = ?)";
  const statements: OrdersStatement[] = [
    db.prepare(`INSERT INTO store_order_events (id, order_id, actor_user_id, from_status, to_status, note, created_at)
      SELECT ?, o.id, ?, o.status, ?, ?, ?
      FROM store_orders o
      WHERE o.id = ? AND o.status = ?${options.requireExpired ? " AND o.expires_at IS NOT NULL AND o.expires_at <= ?" : ""}`)
      .bind(options.eventId, options.actorUserId, input.to, note, at, input.orderId, input.from,
        ...(options.requireExpired ? [at] : [])),
    db.prepare(`UPDATE store_orders
      SET status = ?, updated_at = ?, expires_at = NULL,
        cancel_reason = CASE WHEN ? = 'cancelled' THEN ? ELSE cancel_reason END
      WHERE id = ? AND ${eventExists}`)
      .bind(input.to, at, input.to, options.cancelReason ?? (note || "Cancelado desde el panel"),
        input.orderId, options.eventId),
  ];

  for (const item of items) {
    if (!item.variant_id || item.reserved_qty <= 0) continue;
    if (input.to === "cancelled") {
      statements.push(db.prepare(`UPDATE store_variants SET reserved = reserved - ?, updated_at = ?
        WHERE id = ? AND ${eventExists}`).bind(item.reserved_qty, at, item.variant_id, options.eventId));
    }
    if (input.to === "shipped" && item.fulfillment === "ready_stock") {
      // Las unidades apartadas salen del inventario: se descuentan de
      // existencias y de reservas a la vez, con su movimiento auditado.
      statements.push(db.prepare(`INSERT INTO store_inventory_movements
        (id, variant_id, actor_user_id, old_on_hand, new_on_hand, reason, created_at)
        SELECT ?, v.id, ?, v.on_hand, v.on_hand - ?, ?, ?
        FROM store_variants v WHERE v.id = ? AND ${eventExists}`)
        .bind(options.newId(), options.actorUserId, item.reserved_qty,
          `Pedido ${item.code} enviado`, at, item.variant_id, options.eventId));
      statements.push(db.prepare(`UPDATE store_variants
        SET on_hand = on_hand - ?, reserved = reserved - ?, updated_at = ?
        WHERE id = ? AND ${eventExists}`)
        .bind(item.reserved_qty, item.reserved_qty, at, item.variant_id, options.eventId));
    }
  }

  const results = await db.batch(statements);
  if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1) {
    throw new ConflictError("El pedido cambió de estado. Actualiza la página.", "order_transition_conflict");
  }
}

/**
 * Cancela los pedidos "recibido" con la reserva vencida y libera sus unidades.
 * Se ejecuta al crear pedidos y al abrir el panel (no hay tarea programada).
 */
export async function releaseExpiredOrders(
  db: OrdersDatabase,
  now: Date,
  newId: () => string,
  limit = 10,
  onError?: (error: unknown, orderId: string) => void
): Promise<number> {
  const { results } = await db.prepare(`SELECT id FROM store_orders
    WHERE status = 'received' AND expires_at IS NOT NULL AND expires_at <= ?
    ORDER BY expires_at LIMIT ?`).bind(isoNow(now), limit).all<{ id: string }>();
  let released = 0;
  for (const { id } of results) {
    try {
      await transitionOrder(db, { orderId: id, from: "received", to: "cancelled" }, {
        actorUserId: null,
        eventId: newId(),
        now,
        newId,
        requireExpired: true,
        cancelReason: `Vencido: sin confirmar en ${ORDER_RESERVATION_HOURS} horas`,
      });
      released++;
    } catch (error) {
      // Otro proceso lo cambió primero: no es un error. Cualquier otro fallo
      // se reporta y se sigue con el siguiente: un pedido inconsistente no
      // debe bloquear la toma de pedidos ni el panel.
      if (!(error instanceof ConflictError)) onError?.(error, id);
    }
  }
  return released;
}
