import assert from "node:assert/strict";
import test from "node:test";
import { slugify, validateNewProduct, validateStatus } from "../../src/lib/admin/product-service.ts";

test("new products are validated and have URL-safe slugs", () => {
  assert.deepEqual(validateNewProduct({
    name: "  Vela Chusquísima  ", description: "Aroma artesanal", productType: "candle",
  }), { name: "Vela Chusquísima", description: "Aroma artesanal", productType: "candle" });
  assert.equal(slugify("Vela Chusquísima"), "vela-chusquisima");
});

test("rejects invalid product types and names", () => {
  assert.throws(() => validateNewProduct({ name: "x", description: "", productType: "candle" }));
  assert.throws(() => validateNewProduct({ name: "Vela", description: "", productType: "other" }));
  assert.throws(() => validateStatus("public"));
});
