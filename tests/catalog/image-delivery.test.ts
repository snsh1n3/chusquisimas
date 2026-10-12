import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  BROWSER_MAX_AGE_SECONDS, edgeCacheKey, imageEtag, isImageId, matchesEtag, publicImageHeaders,
} from "../../src/lib/catalog/image-delivery.ts";

const id = "3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b";

describe("image delivery policy", () => {
  it("acepta solo UUID completos como id", () => {
    assert.equal(isImageId(id), true);
    assert.equal(isImageId("------------------------------------"), false, "rechaza solo guiones");
    assert.equal(isImageId("../../products/x"), false);
    assert.equal(isImageId(`${id}x`), false);
  });

  it("ETag estable por id y comparación tolerante a W/ y listas", () => {
    const etag = imageEtag(id.toUpperCase());
    assert.equal(etag, imageEtag(id));
    assert.equal(matchesEtag(etag, etag), true);
    assert.equal(matchesEtag(`W/${etag}`, etag), true);
    assert.equal(matchesEtag(`"otro", ${etag}`, etag), true);
    assert.equal(matchesEtag("*", etag), true);
    assert.equal(matchesEtag(null, etag), false);
    assert.equal(matchesEtag('"otro"', etag), false);
  });

  it("limita la caché del navegador para que ocultar un producto tenga efecto pronto", () => {
    const headers = publicImageHeaders(id);
    assert.equal(headers["Cache-Control"], `public, max-age=${BROWSER_MAX_AGE_SECONDS}`);
    assert.ok(BROWSER_MAX_AGE_SECONDS <= 300);
    assert.doesNotMatch(headers["Cache-Control"], /immutable|stale-while-revalidate/);
    assert.equal(headers["X-Content-Type-Options"], "nosniff");
  });

  it("la clave de caché interna no depende de la query ni del caso", () => {
    assert.equal(edgeCacheKey("https://chusquisimas.com", id.toUpperCase()),
      `https://chusquisimas.com/__edge-cache/product-images/${id}`);
  });
});
