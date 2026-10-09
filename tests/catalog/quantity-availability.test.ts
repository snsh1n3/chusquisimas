import assert from "node:assert/strict";
import test from "node:test";
import { getQuantityAvailability } from "../../src/lib/catalog/availability.ts";
import type { ProductVariant } from "../../src/types/catalog.ts";

const variant: ProductVariant = {
  id: "test-v", productId: "test-p", sku: "TEST-01",
  optionSelections: [], price: { currency: "COP", amount: 10000 },
  status: "active", imageIds: [],
  fulfillmentPolicies: [
    { mode: "ready_stock", inventory: { onHand: 3, reserved: 1, trackInventory: true } },
    { mode: "made_to_order", preparationDaysMin: 14, preparationDaysMax: 14 },
  ],
};

test("ofrece entrega inmediata si alcanza el stock disponible", () => {
  assert.equal(getQuantityAvailability(variant, 2).status, "ready_to_ship");
});

test("ofrece 14 días si se solicitan más unidades que las disponibles", () => {
  const result = getQuantityAvailability(variant, 3);
  assert.equal(result.status, "made_to_order");
  assert.equal(result.preparationDaysMin, 14);
  assert.equal(result.preparationDaysMax, 14);
});

test("sin stock y sin fabricación no promete entrega", () => {
  const withoutOrder = { ...variant, fulfillmentPolicies: [variant.fulfillmentPolicies[0]] };
  const result = getQuantityAvailability(withoutOrder, 3);
  assert.equal(result.purchasable, false);
});

test("rechaza cantidades inválidas", () => {
  assert.throws(() => getQuantityAvailability(variant, 0));
  assert.throws(() => getQuantityAvailability(variant, 1.5));
});
