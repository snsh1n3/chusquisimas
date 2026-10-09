import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrderMessage,
  createOrderWhatsAppUrl,
  ORDERS_WHATSAPP_NUMBER,
} from "../../src/lib/orders/whatsapp.ts";

test("pedido por WhatsApp con precio pendiente", () => {
  const message = createOrderMessage([{
    name: "Titina",
    aroma: "Café",
    quantity: 2,
    deliveryMode: "made_to_order",
  }]);
  assert.match(message, /Titina/);
  assert.match(message, /Aroma: Café/);
  assert.match(message, /14 días/);
  assert.match(message, /Precio: Por confirmar/);
  assert.match(message, /no queda confirmado/);
  assert.doesNotMatch(message, /Subtotal de productos:/);
});

test("calcula subtotal únicamente con precios validados", () => {
  const message = createOrderMessage([{
    name: "Producto de prueba",
    quantity: 2,
    unitPriceCOP: 15000,
    deliveryMode: "ready_stock",
  }]);
  assert.match(message, /30.000/);
  assert.match(message, /Entrega inmediata/);
});

test("no declara un total cuando falta algún precio", () => {
  const message = createOrderMessage([
    { name: "A", quantity: 1, unitPriceCOP: 10000, deliveryMode: "ready_stock" },
    { name: "B", quantity: 1, deliveryMode: "made_to_order" },
  ]);
  assert.match(message, /Pendiente de cotización/);
  assert.doesNotMatch(message, /Subtotal de productos:/);
});

test("valida entradas y evita pedidos vacíos", () => {
  assert.throws(() => createOrderMessage([]));
  assert.throws(() => createOrderMessage([{
    name: "X", quantity: 0, deliveryMode: "ready_stock",
  }]));
  assert.throws(() => createOrderMessage([{
    name: "X", quantity: 1, unitPriceCOP: -1, deliveryMode: "ready_stock",
  }]));
});

test("construye enlace de WhatsApp codificado", () => {
  const url = createOrderWhatsAppUrl([{
    name: "Chía", quantity: 1, deliveryMode: "made_to_order",
  }]);
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "wa.me");
  assert.equal(parsed.pathname, `/${ORDERS_WHATSAPP_NUMBER}`);
  assert.match(parsed.searchParams.get("text") ?? "", /Chía/);
});
