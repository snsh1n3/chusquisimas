import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  applyImageOrder, assertCurrentOrder, parseExpectedOrder, thumbnailKeyFor,
} from "../../src/lib/admin/image-order.ts";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";

describe("applyImageOrder", () => {
  it("convierte una foto en principal sin alterar el resto", () => {
    assert.deepEqual(applyImageOrder([A, B, C], { type: "primary", imageId: C }), [C, A, B]);
    assert.deepEqual(applyImageOrder([A, B, C], { type: "primary", imageId: A }), [A, B, C]);
  });

  it("sube y baja una posición, sin salirse de los extremos", () => {
    assert.deepEqual(applyImageOrder([A, B, C], { type: "move", imageId: B, direction: "up" }), [B, A, C]);
    assert.deepEqual(applyImageOrder([A, B, C], { type: "move", imageId: B, direction: "down" }), [A, C, B]);
    assert.deepEqual(applyImageOrder([A, B, C], { type: "move", imageId: A, direction: "up" }), [A, B, C]);
    assert.deepEqual(applyImageOrder([A, B, C], { type: "move", imageId: C, direction: "down" }), [A, B, C]);
  });

  it("no modifica el arreglo original y no distingue mayúsculas", () => {
    const current = [A, B];
    applyImageOrder(current, { type: "primary", imageId: B.toUpperCase() });
    assert.deepEqual(current, [A, B]);
  });

  it("rechaza fotos de otro producto", () => {
    assert.throws(() => applyImageOrder([A, B], { type: "primary", imageId: C }), /no pertenece/);
  });
});

describe("parseExpectedOrder / assertCurrentOrder", () => {
  it("acepta solo listas de UUID únicos y razonables", () => {
    assert.deepEqual(parseExpectedOrder([A.toUpperCase(), B]), [A, B]);
    for (const bad of [[], [A, A], ["../x"], "A", Array.from({ length: 21 }, () => A), null]) {
      assert.throws(() => parseExpectedOrder(bad), /Orden de fotografías inválido/);
    }
  });

  it("detecta que otra sesión cambió el orden", () => {
    assert.doesNotThrow(() => assertCurrentOrder([A, B], [A, B]));
    assert.throws(() => assertCurrentOrder([A, B], [B, A]), /cambiaron en otra sesión/);
    assert.throws(() => assertCurrentOrder([A, B, C], [A, B]), /cambiaron en otra sesión/);
  });
});

describe("thumbnailKeyFor", () => {
  it("deriva la miniatura junto al original", () => {
    assert.equal(thumbnailKeyFor(`products/p-1/${A}.webp`), `products/p-1/${A}-thumb.webp`);
    assert.throws(() => thumbnailKeyFor("products/p-1/x.png"), /Clave de imagen inválida/);
  });
});
