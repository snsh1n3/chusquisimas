import assert from "node:assert/strict";
import test from "node:test";
import { buildPrivateImageKey, validateProductImage } from "../../src/lib/admin/product-image.ts";

test("validates PNG signature against declared MIME type", () => {
  const png = Uint8Array.from([137,80,78,71,13,10,26,10,1]);
  assert.equal(validateProductImage(png, "image/png"), "image/png");
  assert.throws(() => validateProductImage(png, "image/jpeg"));
});

test("refuses SVG and empty content", () => {
  assert.throws(() => validateProductImage(new TextEncoder().encode("<svg/>"), "image/svg+xml"));
  assert.throws(() => validateProductImage(new Uint8Array(), "image/png"));
});

test("rejects oversized payloads", () => {
  assert.throws(() => validateProductImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"));
});

test("generates internal path, never uses user-supplied filename", () => {
  assert.equal(buildPrivateImageKey("product-titina", "d8cb02de-6cbc-4af9-afdd-6b1621e20a31", "image/webp"),
    "products/product-titina/d8cb02de-6cbc-4af9-afdd-6b1621e20a31.webp");
  assert.throws(() => buildPrivateImageKey("../secret", "x", "image/png"));
});
