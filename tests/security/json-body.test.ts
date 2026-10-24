import assert from "node:assert/strict";
import test from "node:test";

import { readBodyTextWithin, readJsonBody } from "../../src/lib/http/json-body.ts";

/** Cuerpo por flujo (sin Content-Length) que cuenta cuántos bytes se leyeron. */
function streamedRequest(totalBytes: number, chunkBytes = 1024) {
  const stats = { pulled: 0, cancelled: false };
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (stats.pulled >= totalBytes) return controller.close();
      const size = Math.min(chunkBytes, totalBytes - stats.pulled);
      stats.pulled += size;
      controller.enqueue(new Uint8Array(size).fill(0x20));
    },
    cancel() {
      stats.cancelled = true;
    },
  });
  const request = new Request("https://chusquisimas.com/api/cart/quote", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    duplex: "half",
  } as RequestInit);
  return { request, stats };
}

test("sin Content-Length deja de leer al superar el límite y cancela el flujo", async () => {
  const { request, stats } = streamedRequest(8 * 1024 * 1024);
  const result = await readJsonBody(request, 4096);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.response.status, 413);
  assert.ok(stats.pulled <= 4096 + 1024, `se leyeron ${stats.pulled} bytes`);
  assert.equal(stats.cancelled, true);
});

test("el límite cuenta bytes UTF-8, no caracteres", async () => {
  const text = JSON.stringify({ name: "ñ".repeat(3000) }); // ~6 KB en UTF-8, ~3 K caracteres
  const request = new Request("https://chusquisimas.com/api/cart/quote", {
    method: "POST", headers: { "content-type": "application/json" }, body: text,
  });
  assert.equal(await readBodyTextWithin(request, 4096), null);
});

test("rechaza un Content-Length inválido o mayor al límite antes de leer", async () => {
  for (const declared of ["abc", "-1", "1e9", "5000"]) {
    const request = new Request("https://chusquisimas.com/api/orders", {
      method: "POST", headers: { "content-type": "application/json", "content-length": declared }, body: "{}",
    });
    assert.equal(await readBodyTextWithin(request, 4096), null, declared);
  }
});

test("acepta cuerpos válidos dentro del límite", async () => {
  const request = new Request("https://chusquisimas.com/api/orders", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: "sí" }),
  });
  const result = await readJsonBody(request, 4096);
  assert.deepEqual(result, { ok: true, value: { ok: "sí" } });
});
