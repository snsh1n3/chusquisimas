import assert from "node:assert/strict";
import test from "node:test";
import {
  ORDER_CODE_PATTERN, generateOrderCode, normalizeColombianMobile, validateOrderInput, validateOrderLines,
} from "../../src/lib/orders/order-inputs.ts";
import { ValidationError } from "../../src/lib/observability/errors.ts";

const valid = {
  items: [{ variantId: "variant-1", quantity: 2 }],
  customer: { name: "  Ana   Pérez ", phone: "300 123 4567", country: "CO", department: "Bogotá D.C.", city: "Bogotá D.C." },
  privacyConsent: true,
};

test("normaliza y acepta un pedido válido", () => {
  const order = validateOrderInput(valid);
  assert.equal(order.customer.name, "Ana Pérez");
  assert.equal(order.customer.phone, "+573001234567");
  assert.equal(order.customer.city, "Bogotá D.C.");
  assert.equal(order.shippingZone, "local");
});

test("fuera de Bogotá el envío es nacional y se guarda municipio y departamento", () => {
  const order = validateOrderInput({ ...valid, shippingZone: "local",
    customer: { ...valid.customer, department: "Antioquia", city: "Medellín" } });
  assert.equal(order.customer.city, "Medellín, Antioquia");
  assert.equal(order.shippingZone, "national");
});

test("solo acepta municipios de la lista y país Colombia", () => {
  for (const customer of [
    { ...valid.customer, department: "Antioquia", city: "Bogotá D.C." },
    { ...valid.customer, department: "Cundinamarca", city: "Bogotá" },
    { ...valid.customer, department: "Antioquia", city: "Springfield" },
    { ...valid.customer, country: "PE" },
  ]) {
    assert.throws(() => validateOrderInput({ ...valid, customer }), ValidationError, JSON.stringify(customer));
  }
});

test("exige la autorización de datos", () => {
  assert.throws(() => validateOrderInput({ ...valid, privacyConsent: false }), /autorizar/);
  assert.throws(() => validateOrderInput({ ...valid, privacyConsent: "true" }), ValidationError);
});


test("celulares colombianos en varios formatos", () => {
  assert.equal(normalizeColombianMobile("+57 316 820 5201"), "+573168205201");
  assert.equal(normalizeColombianMobile("573168205201"), "+573168205201");
  assert.equal(normalizeColombianMobile("(316) 820-5201"), "+573168205201");
  for (const bad of ["6011234567", "31682052", "+1 316 820 5201", "abc", 3168205201]) {
    assert.throws(() => normalizeColombianMobile(bad), ValidationError, String(bad));
  }
});

test("rechaza textos con caracteres de marcado o fuera de rango", () => {
  for (const name of ["<script>", "A", "x".repeat(81), "Ana\u0000"]) {
    assert.throws(() => validateOrderInput({ ...valid, customer: { ...valid.customer, name } }), ValidationError);
  }
});

test("une variantes repetidas y limita cantidades", () => {
  assert.deepEqual(validateOrderLines([
    { variantId: "a", quantity: 2 }, { variantId: "a", quantity: 3 }, { variantId: "b", quantity: 1 },
  ]), [{ variantId: "a", quantity: 5 }, { variantId: "b", quantity: 1 }]);
  assert.throws(() => validateOrderLines([{ variantId: "a", quantity: 15 }, { variantId: "a", quantity: 6 }]),
    /hasta 20/);
  assert.throws(() => validateOrderLines([]), /vacío/);
  assert.throws(() => validateOrderLines([{ variantId: "a", quantity: 0 }]), ValidationError);
  assert.throws(() => validateOrderLines([{ variantId: "a", quantity: 1.5 }]), ValidationError);
  assert.throws(() => validateOrderLines([{ variantId: "a b", quantity: 1 }]), ValidationError);
  assert.throws(() => validateOrderLines(Array.from({ length: 21 }, (_, i) => ({ variantId: `v${i}`, quantity: 1 }))),
    /hasta 20 productos/);
});

test("el código de pedido es corto, legible y aleatorio", () => {
  const codes = new Set(Array.from({ length: 200 }, () => generateOrderCode()));
  assert.ok(codes.size > 195);
  for (const code of codes) assert.match(code, ORDER_CODE_PATTERN);
  assert.equal(generateOrderCode((bytes) => bytes.fill(0)), "CH-222222");
  // Bytes >= 248 se descartan (evita sesgo); el siguiente válido se usa.
  let calls = 0;
  assert.equal(generateOrderCode((bytes) => bytes.fill(calls++ === 0 ? 250 : 1)), "CH-333333");
});
