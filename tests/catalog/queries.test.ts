import assert from "node:assert/strict";
import { afterEach, describe, it } from "node:test";

import { catalogData } from "../../src/data/catalog/index.ts";

import {
  getActiveProducts,
  getProductBySlug,
  getProductsByCategory,
  getProductVariants,
  getPurchasableVariants,
} from "../../src/lib/catalog/queries.ts";

import type {
  CatalogProduct,
  ProductVariant,
} from "../../src/types/catalog.ts";

const originalProducts = [...catalogData.products];
const originalVariants = [...catalogData.variants];

function product(
  id: string,
  status: CatalogProduct["status"] = "active",
  categoryIds = ["cat-velas-aromaticas"]
): CatalogProduct {
  return {
    id,
    slug: id,
    name: id,
    description: "Producto de prueba",
    categoryIds,
    status,
    images: [],
    options: [],
    featured: false,
    createdAt: "2026-10-08T00:00:00Z",
    updatedAt: "2026-10-08T00:00:00Z",
  };
}

function variant(
  id: string,
  productId: string,
  onHand: number,
  status: ProductVariant["status"] = "active"
): ProductVariant {
  return {
    id,
    productId,
    sku: id,
    optionSelections: [],
    price: { currency: "COP", amount: 35000 },
    status,
    fulfillmentPolicies: [
      {
        mode: "ready_stock",
        inventory: {
          onHand,
          reserved: 0,
          trackInventory: true,
        },
      },
    ],
    imageIds: [],
  };
}

function seedCatalog(): void {
  catalogData.products = [
    product("vela-uno"),
    product("vela-borrador", "draft"),
    product("wax-uno", "active", ["cat-wax-melts"]),
  ];

  catalogData.variants = [
    variant("var-disponible", "vela-uno", 5),
    variant("var-agotada", "vela-uno", 0),
    variant("var-inactiva", "vela-uno", 5, "inactive"),
    variant("var-wax", "wax-uno", 3),
  ];
}

afterEach(() => {
  catalogData.products = [...originalProducts];
  catalogData.variants = [...originalVariants];
});

describe("Consultas del catalogo Chusquisimas", () => {
  it("devuelve solamente productos activos", () => {
    seedCatalog();

    assert.deepEqual(
      getActiveProducts().map((item) => item.id),
      ["vela-uno", "wax-uno"]
    );
  });

  it("busca productos activos por slug", () => {
    seedCatalog();

    assert.equal(getProductBySlug("vela-uno")?.id, "vela-uno");
    assert.equal(getProductBySlug("vela-borrador"), undefined);
  });

  it("filtra productos por categoria", () => {
    seedCatalog();

    assert.deepEqual(
      getProductsByCategory("cat-wax-melts").map(
        (item) => item.id
      ),
      ["wax-uno"]
    );
  });

  it("recupera variantes de un producto", () => {
    seedCatalog();

    assert.equal(getProductVariants("vela-uno").length, 3);
  });

  it("solo devuelve variantes comprables", () => {
    seedCatalog();

    assert.deepEqual(
      getPurchasableVariants("vela-uno").map(
        (item) => item.id
      ),
      ["var-disponible"]
    );
  });

  it("devuelve listas vacias para productos inexistentes", () => {
    seedCatalog();

    assert.deepEqual(getProductVariants("inexistente"), []);
    assert.deepEqual(getPurchasableVariants("inexistente"), []);
  });

  it("bloquea variantes de productos en borrador", () => {
    seedCatalog();

    catalogData.variants.push(
      variant("var-borrador", "vela-borrador", 5)
    );

    assert.deepEqual(
      getPurchasableVariants("vela-borrador"),
      []
    );
  });

  it("bloquea variantes de productos archivados", () => {
    seedCatalog();

    catalogData.products.push(
      product("vela-archivada", "archived")
    );

    catalogData.variants.push(
      variant("var-archivada", "vela-archivada", 5)
    );

    assert.deepEqual(
      getPurchasableVariants("vela-archivada"),
      []
    );
  });

  it("mantiene comprables las variantes de productos activos", () => {
    seedCatalog();

    assert.deepEqual(
      getPurchasableVariants("vela-uno").map(
        (item) => item.id
      ),
      ["var-disponible"]
    );
  });
});