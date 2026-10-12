import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { ValidationError } from "../../src/lib/observability/errors.ts";
import { resolveRequestId, withApiLogging } from "../../src/lib/observability/with-api-logging.ts";

function capture() {
  const entries: Array<Record<string, unknown>> = [];
  return { entries, sink: (_level: string, line: string) => entries.push(JSON.parse(line)) };
}

function clock(...times: number[]) {
  let i = 0;
  return () => times[Math.min(i++, times.length - 1)];
}

describe("resolveRequestId", () => {
  it("usa cf-ray válido y genera uno si falta o es inválido", () => {
    const ray = "8c1f2e3d4a5b6c7d-BOG";
    assert.equal(resolveRequestId(new Request("https://x.test", { headers: { "cf-ray": ray } })), ray);
    assert.equal(resolveRequestId(new Request("https://x.test"), () => "gen"), "gen");
    assert.equal(resolveRequestId(
      new Request("https://x.test", { headers: { "cf-ray": "<script>" } }), () => "gen"), "gen");
  });
});

describe("withApiLogging", () => {
  it("registra la solicitud exitosa y añade X-Request-Id", async () => {
    const { entries, sink } = capture();
    const handler = withApiLogging("test.ok", async () => Response.json({ ok: true }),
      { sink, clock: clock(1000, 1042), idFactory: () => "req-1" });
    const response = await handler(new Request("https://admin.test/api/x?email=a@b.co", { method: "POST" }));

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("X-Request-Id"), "req-1");
    assert.equal(entries.length, 1);
    const entry = entries[0];
    assert.equal(entry.event, "api.request");
    assert.equal(entry.level, "info");
    assert.equal(entry.operation, "test.ok");
    assert.equal(entry.method, "POST");
    assert.equal(entry.path, "/api/x");
    assert.equal(entry.status, 200);
    assert.equal(entry.durationMs, 42);
    assert.equal(entry.outcome, "ok");
    assert.equal(JSON.stringify(entries).includes("a@b.co"), false, "no registra query string");
  });

  it("registra fallos capturados con su categoría", async () => {
    const { entries, sink } = capture();
    const handler = withApiLogging("test.rejected", async (_req, ctx) => {
      ctx.fail(new ValidationError("bad_name", "Nombre inválido"));
      return Response.json({ error: "Nombre inválido" }, { status: 400 });
    }, { sink, idFactory: () => "req-2" });
    await handler(new Request("https://admin.test/api/x"));

    const [error, done] = entries;
    assert.equal(error.event, "api.error");
    assert.equal(error.level, "warn");
    assert.equal(error.errorCategory, "validation");
    assert.equal(error.errorCode, "bad_name");
    assert.equal(error.requestId, "req-2");
    assert.equal(done.event, "api.request");
    assert.equal(done.level, "warn");
    assert.equal(done.outcome, "rejected");
    assert.equal(done.errorCategory, "validation");
  });

  it("convierte errores no capturados en 500 genérico registrado como error", async () => {
    const { entries, sink } = capture();
    const handler = withApiLogging("test.crash", async () => {
      throw new Error("D1_ERROR: database is locked");
    }, { sink, idFactory: () => "req-3" });
    const response = await handler(new Request("https://admin.test/api/x"));

    assert.equal(response.status, 500);
    assert.equal(response.headers.get("X-Request-Id"), "req-3");
    const body = await response.json() as { error: string };
    assert.equal(body.error.includes("D1_ERROR"), false, "no filtra el detalle al cliente");
    const error = entries.find((e) => e.event === "api.error");
    assert.equal(error?.level, "error");
    assert.equal(error?.unhandled, true);
    assert.match(String(error?.errorMessage), /database is locked/);
    assert.equal(entries.at(-1)?.outcome, "error");
  });

  it("pasa argumentos extra al handler (params de rutas dinámicas)", async () => {
    const { sink } = capture();
    const handler = withApiLogging("test.params", async (
      _req: Request, _ctx, { params }: { params: Promise<{ id: string }> }
    ) => new Response((await params).id), { sink });
    const response = await handler(new Request("https://x.test/img"), { params: Promise.resolve({ id: "abc" }) });
    assert.equal(await response.text(), "abc");
  });

  it("funciona con respuestas de cabeceras inmutables", async () => {
    const { sink } = capture();
    const immutable = Response.redirect("https://x.test/otro", 302);
    const handler = withApiLogging("test.redirect", async () => immutable, { sink, idFactory: () => "req-4" });
    const response = await handler(new Request("https://x.test/a"));
    assert.equal(response.status, 302);
    assert.equal(response.headers.get("X-Request-Id"), "req-4");
  });
});
