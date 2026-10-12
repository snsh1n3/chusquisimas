import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseCspReports, sanitizeReportUrl } from "../../src/lib/security/csp-report.ts";

describe("sanitizeReportUrl", () => {
  it("elimina query string y fragmento", () => {
    assert.equal(sanitizeReportUrl("https://chusquisimas.com/tienda?email=a@b.co#x"),
      "https://chusquisimas.com/tienda");
  });

  it("conserva palabras clave y reduce data:/blob:", () => {
    assert.equal(sanitizeReportUrl("inline"), "inline");
    assert.equal(sanitizeReportUrl("eval"), "eval");
    assert.equal(sanitizeReportUrl("data:image/png;base64,AAAA"), "data:");
    assert.equal(sanitizeReportUrl(42), "");
  });
});

describe("parseCspReports", () => {
  it("lee el formato report-uri (application/csp-report)", () => {
    const raw = JSON.stringify({ "csp-report": {
      "document-uri": "https://admin.chusquisimas.com/admin?archived=1",
      "violated-directive": "script-src-elem",
      "effective-directive": "script-src-elem",
      "blocked-uri": "https://static.cloudflareinsights.com/beacon.min.js?token=secret",
      "disposition": "report",
      "line-number": 12,
    } });
    assert.deepEqual(parseCspReports(raw), [{
      documentPath: "https://admin.chusquisimas.com/admin",
      directive: "script-src-elem",
      blocked: "https://static.cloudflareinsights.com/beacon.min.js",
      disposition: "report",
      line: 12,
    }]);
  });

  it("lee el formato Reporting API e ignora otros tipos de reporte", () => {
    const raw = JSON.stringify([
      { type: "deprecation", body: { id: "x" } },
      { type: "csp-violation", body: {
        documentURL: "https://chusquisimas.com/", effectiveDirective: "img-src",
        blockedURL: "https://example.com/pixel.gif?u=1", disposition: "report",
        sourceFile: "https://chusquisimas.com/_next/static/chunks/app.js", lineNumber: 3,
      } },
    ]);
    const [violation, ...rest] = parseCspReports(raw);
    assert.equal(rest.length, 0);
    assert.equal(violation.directive, "img-src");
    assert.equal(violation.blocked, "https://example.com/pixel.gif");
    assert.equal(violation.sourceFile, "https://chusquisimas.com/_next/static/chunks/app.js");
  });

  it("limita la cantidad de reportes por solicitud", () => {
    const many = Array.from({ length: 50 }, () => ({
      type: "csp-violation", body: { effectiveDirective: "img-src", blockedURL: "inline" },
    }));
    assert.equal(parseCspReports(JSON.stringify(many)).length, 10);
  });

  it("descarta cuerpos sin directiva y rechaza JSON inválido", () => {
    assert.deepEqual(parseCspReports(JSON.stringify({ "csp-report": {} })), []);
    assert.deepEqual(parseCspReports(JSON.stringify({ foo: 1 })), []);
    assert.throws(() => parseCspReports("{not json"), SyntaxError);
  });
});
