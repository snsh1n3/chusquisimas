import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { PUBLISHED_VARIANT_SQL } from "../../src/lib/catalog/publish-rules.ts";

/**
 * Guarda: todas las consultas que deciden si algo está "a la venta" usan el
 * mismo fragmento, para que catálogo, imágenes, carrito y pedidos no diverjan.
 */
const SRC = fileURLToPath(new URL("../../src/", import.meta.url));
const USERS = [
  "lib/catalog/d1-published.ts",
  "lib/catalog/serve-public-image.ts",
  "lib/orders/cart-quote.ts",
  "lib/orders/order-service.ts",
];

test("la regla de publicación exige producto y variante activos con precio", () => {
  assert.match(PUBLISHED_VARIANT_SQL, /v\.status = 'active'/);
  assert.match(PUBLISHED_VARIANT_SQL, /p\.status = 'active'/);
  assert.match(PUBLISHED_VARIANT_SQL, /v\.price_cop IS NOT NULL/);
});

test("catálogo, imágenes, carrito y pedidos comparten la regla", () => {
  for (const file of USERS) {
    const source = readFileSync(SRC + file, "utf8");
    assert.ok(source.includes("${PUBLISHED_VARIANT_SQL}"), `${file} no usa PUBLISHED_VARIANT_SQL`);
    assert.doesNotMatch(source, /v\.status\s*=\s*'active'\s+AND\s+v\.price_cop IS NOT NULL/,
      `${file} repite el predicado a mano`);
  }
});
