import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  lowestOrderablePrice,
  summarizeAvailability,
  toPublicCatalog,
  toPublicVariant,
  type PublicVariant,
} from "../../src/lib/catalog/public-catalog.ts";
import type {
  CatalogProduct,
  FulfillmentPolicy,
  ProductVariant,
} from "../../src/types/catalog.ts";

function variant(
  id: string,
  policies: FulfillmentPolicy[],
  overrides: Partial<ProductVariant> = {}
): ProductVariant {
  return {
    id,
    productId: "p-1",
    sku: `CHV2-${id}`,
    optionSelections: [],
    price: { currency: "COP", amount: 42000 },
    status: "active",
    fulfillmentPolicies: policies,
    imageIds: [],
    ...overrides,
  };
}

const stock = (onHand: number, reserved = 0): FulfillmentPolicy => ({
  mode: "ready_stock",
  inventory: { onHand, reserved, trackInventory: true },
});
const madeToOrder: FulfillmentPolicy = {
  mode: "made_to_order", preparationDaysMin: 14, preparationDaysMax: 14,
};

const product: CatalogProduct = {
  id: "p-1", slug: "titina", name: "Titina", description: "Hongo con tapa",
  categoryIds: ["velas"], status: "active",
  images: [{ id: "img-1", src: "/api/images/img-1", alt: "Titina", sortOrder: 0 }],
  options: [], featured: false,
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-02T00:00:00Z",
};

describe("toPublicVariant", () => {
  it("marca entrega inmediata con existencias y no expone cantidades", () => {
    const result = toPublicVariant(variant("a", [stock(7, 2), madeToOrder]));
    assert.deepEqual(result, {
      id: "a", productId: "p-1",
      price: { currency: "COP", amount: 42000 },
      availability: "ready_to_ship",
    });
  });

  it("pasa a bajo pedido con 14 días cuando no hay existencias", () => {
    const result = toPublicVariant(variant("b", [stock(3, 3), madeToOrder]));
    assert.equal(result?.availability, "made_to_order");
    assert.equal(result?.preparationDays, 14);
  });

  it("marca agotado sin existencias ni fabricación bajo pedido", () => {
    assert.equal(toPublicVariant(variant("c", [stock(0)]))?.availability, "out_of_stock");
  });

  it("omite variantes inactivas", () => {
    assert.equal(toPublicVariant(variant("d", [stock(5)], { status: "inactive" })), null);
  });
});

describe("toPublicCatalog", () => {
  it("nunca serializa inventario, reservas, SKU ni fechas internas", () => {
    const catalog = toPublicCatalog({
      products: [product],
      variants: [variant("a", [stock(987654, 123456), madeToOrder])],
    });
    const json = JSON.stringify(catalog);
    for (const forbidden of [
      "onHand", "reserved", "availableQuantity", "inventory", "trackInventory",
      "fulfillmentPolicies", "sku", "CHV2-", "987654", "123456", "createdAt", "status",
    ]) {
      assert.equal(json.includes(forbidden), false, `no debe incluir ${forbidden}`);
    }
  });

  it("conserva datos visibles del producto e imágenes", () => {
    const { products } = toPublicCatalog({ products: [product], variants: [] });
    assert.deepEqual(products[0], {
      id: "p-1", slug: "titina", name: "Titina", description: "Hongo con tapa",
      categoryIds: ["velas"],
      images: [{ id: "img-1", src: "/api/images/img-1", alt: "Titina", sortOrder: 0 }],
      featured: false,
    });
  });
});

describe("resúmenes para la tarjeta", () => {
  const pv = (availability: PublicVariant["availability"], amount: number): PublicVariant => ({
    id: `${availability}-${amount}`, productId: "p-1",
    price: { currency: "COP", amount }, availability,
  });

  it("prioriza disponible sobre bajo pedido", () => {
    assert.equal(summarizeAvailability([pv("made_to_order", 1), pv("ready_to_ship", 1)]), "Disponible");
    assert.equal(summarizeAvailability([pv("made_to_order", 1)]), "Bajo pedido");
    assert.equal(summarizeAvailability([pv("out_of_stock", 1)]), "No disponible");
    assert.equal(summarizeAvailability([]), "No disponible");
  });

  it("calcula el precio mínimo pedible y si hay rango real", () => {
    assert.deepEqual(lowestOrderablePrice([pv("ready_to_ship", 40000), pv("made_to_order", 35000)]),
      { amount: 35000, hasRange: true });
    assert.deepEqual(lowestOrderablePrice([pv("ready_to_ship", 40000), pv("made_to_order", 40000)]),
      { amount: 40000, hasRange: false });
    assert.equal(lowestOrderablePrice([pv("out_of_stock", 10000)]), null);
  });
});
