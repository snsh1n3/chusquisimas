import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveFulfillment,
  validateInventoryEdit,
  validatePriceEdit,
} from "../../src/lib/admin/catalog-inputs.ts";

test("permite guardar cero existencias y exige motivo", () => {
  assert.deepEqual(validateInventoryEdit({
    variantId: " var-1 ", onHand: 0, reason: " Conteo físico ",
  }), { variantId: "var-1", onHand: 0, reason: "Conteo físico" });
  assert.throws(() => validateInventoryEdit({ variantId: "v", onHand: -1, reason: "Conteo" }));
  assert.throws(() => validateInventoryEdit({ variantId: "v", onHand: 1.5, reason: "Conteo" }));
  assert.throws(() => validateInventoryEdit({ variantId: "v", onHand: 2, reason: "" }));
});

test("precio puede quedar pendiente, pero nunca ser negativo o fraccionario", () => {
  assert.equal(validatePriceEdit({ variantId: "v", priceCOP: null }).priceCOP, null);
  assert.equal(validatePriceEdit({ variantId: "v", priceCOP: 25000 }).priceCOP, 25000);
  assert.throws(() => validatePriceEdit({ variantId: "v", priceCOP: -1 }));
  assert.throws(() => validatePriceEdit({ variantId: "v", priceCOP: 20.5 }));
});

test("entrega inmediata solo con suficientes unidades disponibles", () => {
  assert.equal(resolveFulfillment(5, 2, 3, true, 14), "ready_stock");
  assert.equal(resolveFulfillment(5, 2, 4, true, 14), "made_to_order");
  assert.equal(resolveFulfillment(0, 0, 1, true, 14), "made_to_order");
  assert.equal(resolveFulfillment(0, 0, 1, false, 14), "unavailable");
  assert.throws(() => resolveFulfillment(1, 2, 1, true, 14));
});
