import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  AuthError, ConflictError, UpstreamError, ValidationError, classifyError,
} from "../../src/lib/observability/errors.ts";
import {
  createLogger, describeError, redact, type LogLevel,
} from "../../src/lib/observability/logger.ts";

const FAKE_JWT = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.c2lnbmF0dXJlLXZhbHVl";

describe("redact", () => {
  it("elimina JWT, tokens Bearer y correos", () => {
    const text = `jwt=${FAKE_JWT} auth=Bearer abcdefghijklmnop user=ana@example.com`;
    const clean = redact(text);
    assert.equal(clean.includes("eyJ"), false);
    assert.equal(clean.includes("abcdefghijklmnop"), false);
    assert.equal(clean.includes("ana@example.com"), false);
    assert.match(clean, /\[jwt\].*Bearer \[token\].*\[email\]/);
  });

  it("trunca textos largos", () => {
    const clean = redact("x".repeat(1000), 50);
    assert.equal(clean.length, 51);
    assert.ok(clean.endsWith("…"));
  });
});

describe("classifyError / describeError", () => {
  it("usa la categoría de los errores tipados", () => {
    assert.equal(classifyError(new AuthError("x")), "auth");
    assert.equal(classifyError(new ValidationError("x")), "validation");
    assert.equal(classifyError(new ConflictError("x")), "conflict");
    assert.equal(classifyError(new SyntaxError("bad json")), "validation");
    assert.equal(classifyError(new Error("D1 timeout")), "internal");
    assert.equal(classifyError("string lanzado"), "internal");
  });

  it("incluye código y causa depurada, sin traza en rechazos esperados", () => {
    const cause = new Error(`token ${FAKE_JWT} expirado`);
    const details = describeError(new AuthError("access_jwt_invalid", "Acceso denegado.", { cause }));
    assert.equal(details.errorCategory, "auth");
    assert.equal(details.errorCode, "access_jwt_invalid");
    assert.equal(details.errorStack, undefined);
    assert.ok(details.errorCause?.includes("[jwt]"));
    assert.equal(JSON.stringify(details).includes("eyJ"), false);
  });

  it("incluye una traza corta en fallos internos o de dependencias", () => {
    assert.ok(describeError(new Error("boom")).errorStack);
    assert.ok(describeError(new UpstreamError("jwks")).errorStack);
    assert.ok((describeError(new Error("boom")).errorStack ?? "").split("\n").length <= 6);
  });

  it("acepta valores que no son Error", () => {
    assert.deepEqual(describeError(42), {
      errorCategory: "internal", errorName: "number", errorMessage: "42",
    });
  });
});

describe("createLogger", () => {
  it("emite una línea JSON con campos base, sin undefined y depurada", () => {
    const lines: Array<[LogLevel, string]> = [];
    const logger = createLogger({ requestId: "r-1" }, (level, line) => lines.push([level, line]),
      () => new Date("2026-10-12T00:00:00Z"));
    logger.child({ operation: "test" }).warn("evento", { email: "a@b.co", skip: undefined, n: 3 });
    assert.equal(lines.length, 1);
    const [level, line] = lines[0];
    assert.equal(level, "warn");
    assert.deepEqual(JSON.parse(line), {
      requestId: "r-1", operation: "test", email: "[email]", n: 3,
      timestamp: "2026-10-12T00:00:00.000Z", level: "warn", event: "evento",
    });
  });

  it("los campos reservados no se pueden sobrescribir", () => {
    const lines: string[] = [];
    createLogger({}, (_l, line) => lines.push(line)).info("real", { event: "falso", level: "error" });
    const entry = JSON.parse(lines[0]);
    assert.equal(entry.event, "real");
    assert.equal(entry.level, "info");
  });

  it("un sink que falla no rompe la solicitud", () => {
    const logger = createLogger({}, () => { throw new Error("sink caído"); });
    assert.doesNotThrow(() => logger.error("x"));
  });
});
