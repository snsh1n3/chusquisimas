import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { validateProductVariant } from "../../src/lib/catalog/validation.ts";

import type {
  FulfillmentPolicy,
  ProductVariant,
} from "../../src/types/catalog.ts";

function makeVariant(
  policies: FulfillmentPolicy[] = [stock(5, 0)]
): ProductVariant {
  return {
    id: "test-variant",
    productId: "test-product",
    sku: "VELA-001",
    optionSelections: [],
    price: {
      currency: "COP",
      amount: 35000,
    },
    status: "active",
    fulfillmentPolicies: policies,
    imageIds: [],
  };
}

function stock(
  onHand: number,
  reserved: number
): FulfillmentPolicy {
  return {
    mode: "ready_stock",
    inventory: {
      onHand,
      reserved,
      trackInventory: true,
    },
  };
}

function madeToOrder(
  min: number,
  max: number,
  maxOpenOrders?: number
): FulfillmentPolicy {
  return {
    mode: "made_to_order",
    preparationDaysMin: min,
    preparationDaysMax: max,
    ...(maxOpenOrders === undefined ? {} : { maxOpenOrders }),
  };
}

function hasError(
  variant: ProductVariant,
  field: string
): boolean {
  return validateProductVariant(variant).some(
    (error) => error.field === field
  );
}

describe("Validacion del catalogo Chusquisimas", () => {
  it("acepta una variante con inventario valido", () => {
    assert.deepEqual(
      validateProductVariant(makeVariant([stock(5, 2)])),
      []
    );
  });

  it("rechaza existencias negativas", () => {
    assert.equal(
      hasError(
        makeVariant([stock(-1, 0)]),
        "fulfillmentPolicies[0].inventory.onHand"
      ),
      true
    );
  });

  it("rechaza unidades reservadas negativas", () => {
    assert.equal(
      hasError(
        makeVariant([stock(5, -1)]),
        "fulfillmentPolicies[0].inventory.reserved"
      ),
      true
    );
  });

  it("rechaza reservas superiores a existencias", () => {
    assert.equal(
      hasError(
        makeVariant([stock(2, 5)]),
        "fulfillmentPolicies[0].inventory.reserved"
      ),
      true
    );
  });

  it("rechaza inventario fraccionario", () => {
    assert.equal(
      hasError(
        makeVariant([stock(2.5, 0)]),
        "fulfillmentPolicies[0].inventory.onHand"
      ),
      true
    );
  });

  it("rechaza plazos de preparacion negativos", () => {
    assert.equal(
      hasError(
        makeVariant([madeToOrder(-1, 5)]),
        "fulfillmentPolicies[0].preparationDaysMin"
      ),
      true
    );
  });

  it("rechaza un plazo maximo inferior al minimo", () => {
    assert.equal(
      hasError(
        makeVariant([madeToOrder(7, 3)]),
        "fulfillmentPolicies[0].preparationDaysMax"
      ),
      true
    );
  });

  it("rechaza limites de pedidos no positivos", () => {
    assert.equal(
      hasError(
        makeVariant([madeToOrder(3, 5, 0)]),
        "fulfillmentPolicies[0].maxOpenOrders"
      ),
      true
    );
  });

  it("rechaza precios negativos o fraccionarios", () => {
    for (const amount of [-100, 10.5]) {
      const variant = makeVariant();
      variant.price.amount = amount;

      assert.equal(hasError(variant, "price.amount"), true);
    }
  });

  it("rechaza un SKU vacio o con solo espacios", () => {
    const variant = makeVariant();
    variant.sku = "   ";

    assert.equal(hasError(variant, "sku"), true);
  });

  it("acepta fabricacion bajo pedido valida", () => {
    assert.deepEqual(
      validateProductVariant(
        makeVariant([madeToOrder(3, 5, 10)])
      ),
      []
    );
  });

  it("rechaza variantes sin modalidad de venta", () => {
    assert.equal(
      hasError(makeVariant([]), "fulfillmentPolicies"),
      true
    );
  });

  it("rechaza inventarios duplicados", () => {
    assert.equal(
      hasError(
        makeVariant([stock(5, 0), stock(10, 0)]),
        "fulfillmentPolicies[1].mode"
      ),
      true
    );
  });

  it("rechaza fabricacion bajo pedido duplicada", () => {
    assert.equal(
      hasError(
        makeVariant([
          madeToOrder(3, 5),
          madeToOrder(5, 8),
        ]),
        "fulfillmentPolicies[1].mode"
      ),
      true
    );
  });

  it("acepta inventario y fabricacion juntos", () => {
    assert.deepEqual(
      validateProductVariant(
        makeVariant([
          stock(5, 0),
          madeToOrder(3, 5),
        ])
      ),
      []
    );
  });
});