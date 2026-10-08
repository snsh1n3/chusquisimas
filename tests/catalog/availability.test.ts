import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { getVariantAvailability } from "../../src/lib/catalog/availability.ts";

import type {
  ProductVariant,
  FulfillmentPolicy,
} from "../../src/types/catalog.ts";

function createVariant(
  policies: FulfillmentPolicy[],
  status: ProductVariant["status"] = "active"
): ProductVariant {
  return {
    id: "variant-test",
    productId: "product-test",
    sku: "TEST-001",
    optionSelections: [],
    price: { currency: "COP", amount: 35000 },
    status,
    fulfillmentPolicies: policies,
    imageIds: [],
  };
}

function stock(
  onHand: number,
  reserved: number,
  trackInventory = true
): FulfillmentPolicy {
  return {
    mode: "ready_stock",
    inventory: {
      onHand,
      reserved,
      trackInventory,
    },
  };
}

const madeToOrder: FulfillmentPolicy = {
  mode: "made_to_order",
  preparationDaysMin: 3,
  preparationDaysMax: 5,
};

describe("Disponibilidad del catalogo Chusquisimas", () => {
  it("descuenta las unidades reservadas", () => {
    const result = getVariantAvailability(
      createVariant([stock(5, 2)])
    );

    assert.equal(result.status, "ready_to_ship");
    assert.equal(result.purchasable, true);
    assert.equal(result.availableQuantity, 3);
  });

  it("permite fabricar bajo pedido cuando no hay stock", () => {
    const result = getVariantAvailability(
      createVariant([stock(0, 0), madeToOrder])
    );

    assert.equal(result.status, "made_to_order");
    assert.equal(result.purchasable, true);
    assert.equal(result.preparationDaysMin, 3);
    assert.equal(result.preparationDaysMax, 5);
  });

  it("marca agotado cuando no hay alternativas", () => {
    const result = getVariantAvailability(
      createVariant([stock(0, 0)])
    );

    assert.equal(result.status, "out_of_stock");
    assert.equal(result.purchasable, false);
  });

  it("impide comprar variantes desactivadas", () => {
    const result = getVariantAvailability(
      createVariant([stock(10, 0)], "inactive")
    );

    assert.equal(result.status, "unavailable");
    assert.equal(result.purchasable, false);
  });

  it("prioriza inventario sobre fabricacion bajo pedido", () => {
    const result = getVariantAvailability(
      createVariant([stock(5, 2), madeToOrder])
    );

    assert.equal(result.status, "ready_to_ship");
    assert.equal(result.availableQuantity, 3);
  });

  it("admite inventario sin seguimiento cuantitativo", () => {
    const result = getVariantAvailability(
      createVariant([stock(0, 0, false)])
    );

    assert.equal(result.status, "ready_to_ship");
    assert.equal(result.purchasable, true);
    assert.equal(result.availableQuantity, null);
  });

  it("maneja reservas superiores al stock sin cantidad negativa", () => {
    const result = getVariantAvailability(
      createVariant([stock(2, 5)])
    );

    assert.equal(result.status, "out_of_stock");
    assert.equal(result.availableQuantity, 0);
  });
});