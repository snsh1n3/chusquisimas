import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrder, releaseExpiredOrders, transitionOrder, type OrderDeps,
} from "../../src/lib/orders/order-service.ts";
import type { OrderInput } from "../../src/lib/orders/order-inputs.ts";
import { ConflictError, ValidationError } from "../../src/lib/observability/errors.ts";
import { createTestDatabase, seedVariant, sequentialIds, variantStock } from "../helpers/d1-sqlite.ts";

const T0 = new Date("2026-10-20T15:00:00.000Z");

function deps(now = T0): OrderDeps & { newId: () => string } {
  const ids = sequentialIds("x");
  let codes = 0;
  return { now: () => now, newId: ids, newCode: () => `CH-TEST${String(++codes).padStart(2, "0")}` };
}

function input(items: OrderInput["items"], zone: OrderInput["shippingZone"] = "local",
  phone = "+573001234567"): OrderInput {
  return { items, shippingZone: zone, customer: { name: "Ana Pérez", phone, city: "Bogotá" } };
}

test("crea el pedido, copia precios de D1 y aparta las unidades disponibles", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 3, priceCOP: 45000 });
  db.raw.exec("UPDATE store_shipping_zones SET price_cop = 8000 WHERE id = 'local'");

  const order = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), deps());

  assert.equal(order.subtotalCOP, 90000);
  assert.equal(order.shippingCOP, 8000);
  assert.equal(order.lines[0].fulfillment, "ready_stock");
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 3, reserved: 2 });
  const row = db.raw.prepare("SELECT status, expires_at FROM store_orders WHERE id = ?").get(order.id) as
    { status: string; expires_at: string };
  assert.equal(row.status, "received");
  assert.equal(row.expires_at, "2026-10-22T15:00:00.000Z");
});

test("sin unidades suficientes, la línea pasa a bajo pedido y no reserva", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 1 });
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), deps());
  assert.equal(order.lines[0].fulfillment, "made_to_order");
  assert.equal(order.lines[0].preparationDays, 14);
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 1, reserved: 0 });
});

test("rechaza variantes agotadas que no se fabrican bajo pedido", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 0, allowMadeToOrder: false });
  await assert.rejects(createOrder(db, input([{ variantId: "v1", quantity: 1 }]), deps()), ValidationError);
  assert.equal((db.raw.prepare("SELECT COUNT(*) AS n FROM store_orders").get() as { n: number }).n, 0);
});

test("rechaza variantes inexistentes o no publicadas", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 5 });
  db.raw.exec("UPDATE store_variants SET status = 'inactive' WHERE id = 'v1'");
  await assert.rejects(createOrder(db, input([{ variantId: "v1", quantity: 1 }]), deps()),
    /ya no está disponible/);
});

test("envío sin tarifa queda por confirmar", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 5 });
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 1 }], "national"), deps());
  assert.equal(order.shippingCOP, null);
  assert.equal(order.shippingLabel, "Envío nacional");
});

test("reintenta cuando el código aleatorio choca", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 5 });
  const d = deps();
  await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), { ...d, newCode: () => "CH-AAAAAA" });
  const codes = ["CH-AAAAAA", "CH-BBBBBB"];
  const second = await createOrder(db, input([{ variantId: "v1", quantity: 1 }], "local", "+573009999999"),
    { ...d, newCode: () => codes.shift()! });
  assert.equal(second.code, "CH-BBBBBB");
  assert.equal(variantStock(db, "v1").reserved, 2);
});

test("nunca reserva más de lo existente: la última unidad es de un solo pedido", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 1 });
  const first = await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), deps());
  const second = await createOrder(db, input([{ variantId: "v1", quantity: 1 }], "local", "+573009999999"), deps());
  assert.equal(first.lines[0].fulfillment, "ready_stock");
  assert.equal(second.lines[0].fulfillment, "made_to_order");
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 1, reserved: 1 });
});

test("enviado descuenta existencias y reservas con movimiento auditado", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 3 });
  const d = deps();
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), d);
  const opts = { actorUserId: null, now: T0, newId: d.newId };
  await transitionOrder(db, { orderId: order.id, from: "received", to: "preparing" }, { ...opts, eventId: "e1" });
  await transitionOrder(db, { orderId: order.id, from: "preparing", to: "shipped" }, { ...opts, eventId: "e2" });
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 1, reserved: 0 });
  const movement = db.raw.prepare("SELECT old_on_hand, new_on_hand FROM store_inventory_movements").get() as
    { old_on_hand: number; new_on_hand: number };
  assert.deepEqual({ ...movement }, { old_on_hand: 3, new_on_hand: 1 });
  await transitionOrder(db, { orderId: order.id, from: "shipped", to: "delivered" }, { ...opts, eventId: "e3" });
  const events = db.raw.prepare("SELECT to_status FROM store_order_events WHERE order_id = ? ORDER BY created_at, rowid")
    .all(order.id).map((row) => (row as { to_status: string }).to_status);
  assert.deepEqual(events, ["received", "preparing", "shipped", "delivered"]);
});

test("cancelar libera las reservas una sola vez", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 3 });
  const d = deps();
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), d);
  const opts = { actorUserId: null, now: T0, newId: d.newId };
  await transitionOrder(db, { orderId: order.id, from: "received", to: "cancelled", note: "Cliente desistió" },
    { ...opts, eventId: "c1" });
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 3, reserved: 0 });
  // Repetir la misma transición (doble clic, reintento) es un conflicto sin efectos.
  await assert.rejects(transitionOrder(db, { orderId: order.id, from: "received", to: "cancelled" },
    { ...opts, eventId: "c2" }), ConflictError);
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 3, reserved: 0 });
  const reason = db.raw.prepare("SELECT cancel_reason FROM store_orders WHERE id = ?").get(order.id) as
    { cancel_reason: string };
  assert.equal(reason.cancel_reason, "Cliente desistió");
});

test("rechaza transiciones no permitidas", async () => {
  const db = createTestDatabase();
  await assert.rejects(transitionOrder(db, { orderId: "o", from: "received", to: "delivered" },
    { actorUserId: null, eventId: "e", now: T0, newId: sequentialIds() }), ValidationError);
});

test("vence los pedidos recibidos tras 48 horas y libera unidades", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 2 });
  const d = deps();
  const old = await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), d);
  const kept = await createOrder(db, input([{ variantId: "v1", quantity: 1 }], "local", "+573009999999"),
    { ...d, now: () => new Date(T0.getTime() + 24 * 3600_000) });
  await transitionOrder(db, { orderId: kept.id, from: "received", to: "preparing" },
    { actorUserId: null, eventId: "p1", now: T0, newId: d.newId });

  assert.equal(await releaseExpiredOrders(db, new Date(T0.getTime() + 47 * 3600_000), d.newId), 0);
  assert.equal(await releaseExpiredOrders(db, new Date(T0.getTime() + 48 * 3600_000), d.newId), 1);

  const status = (id: string) => (db.raw.prepare("SELECT status FROM store_orders WHERE id = ?").get(id) as
    { status: string }).status;
  assert.equal(status(old.id), "cancelled");
  assert.equal(status(kept.id), "preparing");
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 2, reserved: 1 });
  assert.equal(await releaseExpiredOrders(db, new Date(T0.getTime() + 96 * 3600_000), d.newId), 0);
});

test("el historial del pedido sobrevive al borrado del producto", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 0 });
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), deps());
  db.raw.exec("DELETE FROM store_products WHERE id = 'product-v1'");
  const item = db.raw.prepare("SELECT variant_id, product_name FROM store_order_items WHERE order_id = ?")
    .get(order.id) as { variant_id: string | null; product_name: string };
  assert.equal(item.variant_id, null);
  assert.equal(item.product_name, "Titina");
});

// --- Regresiones de la auditoría de seguridad (oct 2026) ---

test("un mismo número no puede tener dos pedidos sin confirmar", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 20 });
  await createOrder(db, input([{ variantId: "v1", quantity: 20 }]), deps());
  await assert.rejects(createOrder(db, input([{ variantId: "v1", quantity: 1 }]), deps()),
    (error: unknown) => error instanceof ValidationError && error.code === "order_pending_exists");
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 20, reserved: 20 });
  // Otro número sí puede pedir (bajo pedido, porque no queda stock).
  const other = await createOrder(db, input([{ variantId: "v1", quantity: 1 }], "local", "+573009999999"), deps());
  assert.equal(other.lines[0].fulfillment, "made_to_order");
});

test("el número puede volver a pedir cuando su pedido se confirma o vence", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 5 });
  const d = deps();
  const first = await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), d);
  await transitionOrder(db, { orderId: first.id, from: "received", to: "preparing" },
    { actorUserId: null, eventId: "c1", now: T0, newId: d.newId });
  await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), d);
  // Pasadas 48 h el pedido recibido ya no cuenta aunque aún no se haya barrido.
  const later = deps(new Date(T0.getTime() + 49 * 3600_000));
  await createOrder(db, input([{ variantId: "v1", quantity: 1 }]), later);
});

test("desactivar la variante durante la creación no deja una reserva fantasma", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 3 });
  const original = db.batch.bind(db);
  let raced = false;
  db.batch = (async (statements: Parameters<typeof original>[0]) => {
    if (!raced) {
      raced = true;
      db.raw.exec("UPDATE store_variants SET status = 'inactive' WHERE id = 'v1'");
    }
    return original(statements);
  }) as typeof db.batch;
  const d = deps();
  const order = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), d);
  const item = db.raw.prepare("SELECT reserved_qty FROM store_order_items WHERE order_id = ?").get(order.id) as
    { reserved_qty: number };
  assert.equal(item.reserved_qty, variantStock(db, "v1").reserved);
  assert.equal(await releaseExpiredOrders(db, new Date(T0.getTime() + 49 * 3600_000), d.newId), 1);
  assert.deepEqual(variantStock(db, "v1"), { on_hand: 3, reserved: 0 });
});

test("un pedido que falla al vencer no bloquea a los demás", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 3 });
  seedVariant(db, { variantId: "v2", onHand: 3 });
  const d = deps();
  const bad = await createOrder(db, input([{ variantId: "v1", quantity: 2 }]), d);
  const good = await createOrder(db, input([{ variantId: "v2", quantity: 1 }], "local", "+573009999999"),
    { ...d, now: () => new Date(T0.getTime() + 60_000) });
  // Corrompe la reserva del primero para forzar un error que no es de conflicto.
  db.raw.exec("UPDATE store_variants SET reserved = 0 WHERE id = 'v1'");
  const failures: string[] = [];
  const released = await releaseExpiredOrders(db, new Date(T0.getTime() + 49 * 3600_000), d.newId, 10,
    (_error, orderId) => failures.push(orderId));
  assert.equal(released, 1);
  assert.deepEqual(failures, [bad.id]);
  const status = (db.raw.prepare("SELECT status FROM store_orders WHERE id = ?").get(good.id) as
    { status: string }).status;
  assert.equal(status, "cancelled");
  assert.deepEqual(variantStock(db, "v2"), { on_hand: 3, reserved: 0 });
});
