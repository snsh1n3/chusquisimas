import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MAX_ORDER_QUANTITY, availabilityText, buildProductOrderUrl, clampQuantity, isOrderable,
} from "../../src/lib/orders/product-order.ts";
import type { PublicVariant } from "../../src/lib/catalog/public-catalog.ts";

const base: PublicVariant = {
  id: "v1", productId: "p1", label: "Café",
  price: { currency: "COP", amount: 45000 }, availability: "ready_to_ship",
};

function decode(url: string) {
  const parsed = new URL(url);
  return { host: parsed.host, path: parsed.pathname, text: parsed.searchParams.get("text") ?? "" };
}

describe("buildProductOrderUrl", () => {
  it("arma el mensaje con producto, presentación, cantidad y subtotal", () => {
    const { host, path, text } = decode(buildProductOrderUrl("Gnomo", base, 2));
    assert.equal(host, "wa.me");
    assert.equal(path, "/573168205201");
    assert.match(text, /1\. Gnomo/);
    assert.match(text, /Presentación: Café/);
    assert.match(text, /Cantidad: 2/);
    assert.match(text, /Entrega inmediata, sujeto a confirmación/);
    assert.match(text, /90\.000/);
  });

  it("indica bajo pedido y omite la presentación genérica", () => {
    const { text } = decode(buildProductOrderUrl("Regia",
      { ...base, label: "Presentación única", availability: "made_to_order", preparationDays: 14 }, 1));
    assert.match(text, /Bajo pedido, preparación en 14 días/);
    assert.doesNotMatch(text, /Presentación:/);
  });

  it("rechaza variantes agotadas y cantidades fuera de rango", () => {
    assert.throws(() => buildProductOrderUrl("X", { ...base, availability: "out_of_stock" }, 1), /no está disponible/);
    for (const qty of [0, -1, 1.5, MAX_ORDER_QUANTITY + 1, Number.NaN]) {
      assert.throws(() => buildProductOrderUrl("X", base, qty), /cantidad/);
    }
  });

  it("codifica caracteres especiales del nombre", () => {
    const url = buildProductOrderUrl("Churras queridas & co #1", base, 1);
    assert.doesNotMatch(url, /text=.*[ #]/, "espacios y # deben ir codificados");
    assert.match(decode(url).text, /Churras queridas & co #1/);
  });
});

describe("textos y cantidad", () => {
  it("describe la disponibilidad para el cliente", () => {
    assert.equal(availabilityText(base), "Entrega inmediata");
    assert.equal(availabilityText({ ...base, availability: "made_to_order", preparationDays: 14 }),
      "Bajo pedido · entrega en 14 días");
    assert.equal(availabilityText({ ...base, availability: "out_of_stock" }), "Agotado por ahora");
    assert.equal(isOrderable({ ...base, availability: "out_of_stock" }), false);
  });

  it("limita la cantidad al rango permitido", () => {
    assert.equal(clampQuantity(0), 1);
    assert.equal(clampQuantity(3.7), 3);
    assert.equal(clampQuantity(999), MAX_ORDER_QUANTITY);
    assert.equal(clampQuantity(Number.NaN), 1);
  });
});
