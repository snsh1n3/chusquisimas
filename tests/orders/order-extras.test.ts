import assert from "node:assert/strict";
import test from "node:test";
import { createRegisteredOrderMessage, createRegisteredOrderWhatsAppUrl } from "../../src/lib/orders/order-message.ts";
import type { CreatedOrder } from "../../src/lib/orders/order-service.ts";
import { quoteCart } from "../../src/lib/orders/cart-quote.ts";
import { updateShippingZone, validateShippingZoneEdit } from "../../src/lib/orders/shipping-service.ts";
import { isLocalClient, isTurnstileTestSecret, verifyTurnstile } from "../../src/lib/security/turnstile.ts";
import { UpstreamError, ValidationError } from "../../src/lib/observability/errors.ts";
import { createTestDatabase, seedVariant } from "../helpers/d1-sqlite.ts";

const order: CreatedOrder = {
  id: "o1", code: "CH-7K3P9Q",
  lines: [
    { productName: "Titina", variantLabel: "Café", aroma: "Café", quantity: 2, unitPriceCOP: 45000,
      fulfillment: "ready_stock", preparationDays: null },
    { productName: "Kit brujas", variantLabel: "Caja", aroma: null, quantity: 1, unitPriceCOP: 90000,
      fulfillment: "made_to_order", preparationDays: 14 },
  ],
  subtotalCOP: 180000, shippingLabel: "Envío local", shippingCOP: 8000,
  expiresAt: "2026-10-22T15:00:00.000Z", customer: { name: "Ana", city: "Bogotá" },
};

test("el mensaje lleva número, líneas, envío y total", () => {
  const message = createRegisteredOrderMessage(order);
  assert.match(message, /pedido CH-7K3P9Q/);
  assert.match(message, /Aroma: Café/);
  assert.doesNotMatch(message, /Presentación: Café/);
  assert.match(message, /Presentación: Caja/);
  assert.match(message, /apartadas por 48 horas/);
  assert.match(message, /preparación en 14 días/);
  assert.match(message, /Envío local: \$\s?8\.000/);
  assert.match(message, /Total: \$\s?188\.000/);
  assert.ok(createRegisteredOrderWhatsAppUrl(order).startsWith("https://wa.me/573168205201?text="));
});

test("sin tarifa de envío el total se aclara sin envío", () => {
  const message = createRegisteredOrderMessage({ ...order, shippingCOP: null });
  assert.match(message, /Envío local: por confirmar/);
  assert.match(message, /Total sin envío: \$\s?180\.000/);
});

test("la cotización no expone existencias y marca lo que ya no se vende", async () => {
  const db = createTestDatabase();
  seedVariant(db, { variantId: "v1", onHand: 7 });
  seedVariant(db, { variantId: "v2", onHand: 0, productId: "p2" });
  const quote = await quoteCart(db, [
    { variantId: "v1", quantity: 1 }, { variantId: "v2", quantity: 1 }, { variantId: "nope", quantity: 1 },
  ]);
  assert.deepEqual(quote.unavailable, ["nope"]);
  assert.equal(quote.lines[0].availability, "ready_to_ship");
  assert.equal(quote.lines[1].availability, "made_to_order");
  assert.ok(!JSON.stringify(quote).includes("on_hand"));
  assert.ok(!JSON.stringify(quote).includes("reserved"));
  assert.deepEqual(quote.shippingZones.map((zone) => zone.id), ["local", "national"]);
});

test("tarifas de envío: validación y actualización auditada", async () => {
  assert.throws(() => validateShippingZoneEdit({ zone: "local", label: "Local", priceCOP: -1 }), ValidationError);
  assert.throws(() => validateShippingZoneEdit({ zone: "luna", label: "Local", priceCOP: 1 }), ValidationError);
  assert.throws(() => validateShippingZoneEdit({ zone: "local", label: "Lo", priceCOP: 1 }), ValidationError);
  const edit = validateShippingZoneEdit({ zone: "local", label: " Envío en  Bogotá ", priceCOP: 9000 });
  assert.equal(edit.label, "Envío en Bogotá");
  assert.equal(validateShippingZoneEdit({ zone: "national", label: "Nacional", priceCOP: null }).priceCOP, null);

  const db = createTestDatabase();
  db.raw.exec("INSERT INTO admin_users (id, email, status) VALUES ('u1', 'a@b.co', 'active')");
  await updateShippingZone(db, edit, "u1", "audit-1", new Date("2026-10-20T15:00:00Z"));
  const zone = { ...db.raw.prepare("SELECT label, price_cop FROM store_shipping_zones WHERE id = 'local'").get() };
  assert.deepEqual(zone, { label: "Envío en Bogotá", price_cop: 9000 });
  const audit = db.raw.prepare("SELECT details_json FROM admin_audit_log WHERE id = 'audit-1'").get() as
    { details_json: string };
  assert.deepEqual(JSON.parse(audit.details_json),
    { oldLabel: "Envío local", newLabel: "Envío en Bogotá", oldPriceCOP: null, newPriceCOP: 9000 });
});

function fakeFetch(payload: unknown, ok = true): typeof fetch {
  return (async () => ({ ok, status: ok ? 200 : 500, json: async () => payload })) as unknown as typeof fetch;
}

test("Turnstile: acepta solo respuestas válidas de Siteverify", async () => {
  const real = { secret: "0x4AAAAAAA-real-secret", expectedHostnames: ["chusquisimas.com"] };
  const ok = { success: true, action: "order", hostname: "chusquisimas.com" };
  await verifyTurnstile("token", { ...real, fetchImpl: fakeFetch(ok) });
  // Con la clave real se exigen la acción del widget y el hostname de la tienda.
  await assert.rejects(verifyTurnstile("token", { ...real, fetchImpl: fakeFetch({ ...ok, action: "" }) }),
    ValidationError);
  await assert.rejects(verifyTurnstile("token", { ...real, fetchImpl: fakeFetch({ ...ok, action: "login" }) }),
    ValidationError);
  await assert.rejects(verifyTurnstile("token", { ...real,
    fetchImpl: fakeFetch({ ...ok, hostname: "evil.example" }) }), ValidationError);
  await assert.rejects(verifyTurnstile("token", { ...real, fetchImpl: fakeFetch({ success: false }) }),
    ValidationError);
  await assert.rejects(verifyTurnstile("", { ...real, fetchImpl: fakeFetch(ok) }), ValidationError);
  await assert.rejects(verifyTurnstile("token", { ...real, fetchImpl: fakeFetch({}, false) }), UpstreamError);
  // La clave de prueba devuelve action vacía y hostname genérico: se acepta solo en local.
  const test = { secret: "1x0000000000000000000000000000000AA", expectedHostnames: ["chusquisimas.com"] };
  await verifyTurnstile("token", { ...test,
    fetchImpl: fakeFetch({ success: true, action: "", hostname: "example.com" }) });
});

test("Turnstile: reconoce las claves de prueba y los clientes locales", () => {
  assert.equal(isTurnstileTestSecret("1x0000000000000000000000000000000AA"), true);
  assert.equal(isTurnstileTestSecret("2x0000000000000000000000000000000AA"), true);
  assert.equal(isTurnstileTestSecret("3x0000000000000000000000000000000AA"), true);
  assert.equal(isTurnstileTestSecret("0x4AAAAAAA-real-secret"), false);
  assert.equal(isLocalClient(null), true);
  assert.equal(isLocalClient("127.0.0.1"), true);
  assert.equal(isLocalClient("::1"), true);
  assert.equal(isLocalClient("190.24.10.5"), false);
});

test("los pedidos exigen el aviso de privacidad completo", async () => {
  const { isPrivacyNoticeComplete } = await import("../../src/lib/legal/privacy-notice.ts");
  assert.equal(isPrivacyNoticeComplete({ name: "Ana", city: "Bogotá", email: "" }), false);
  assert.equal(isPrivacyNoticeComplete({ name: "Ana", city: "Bogotá", email: "a@b.co" }), true);
});
