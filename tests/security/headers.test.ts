import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ADMIN_HOST, CSP_ENFORCE, CSP_REPORT_PATH, buildCsp, securityHeaderRules,
} from "../../src/lib/security/headers.ts";

function headerMap(entries: Array<{ key: string; value: string }>) {
  return new Map(entries.map((h) => [h.key.toLowerCase(), h.value]));
}

const [adminRule, publicRule] = securityHeaderRules();
const admin = headerMap(adminRule.headers);
const store = headerMap(publicRule.headers);
const cspKey = CSP_ENFORCE ? "content-security-policy" : "content-security-policy-report-only";

describe("security header rules", () => {
  it("separa el panel por host y cubre todas las rutas", () => {
    assert.deepEqual(adminRule.has, [{ type: "host", value: ADMIN_HOST }]);
    assert.deepEqual(publicRule.missing, [{ type: "host", value: ADMIN_HOST }]);
    assert.equal(adminRule.source, "/:path*");
    assert.equal(publicRule.source, "/:path*");
  });

  it("aplica las cabeceras base en tienda y panel", () => {
    for (const headers of [admin, store]) {
      assert.match(headers.get("strict-transport-security") ?? "", /max-age=31536000/);
      assert.equal(headers.get("x-content-type-options"), "nosniff");
      assert.equal(headers.get("referrer-policy"), "strict-origin-when-cross-origin");
      assert.match(headers.get("permissions-policy") ?? "", /camera=\(\)/);
      assert.ok(headers.get(cspKey));
    }
  });

  it("no habilita includeSubDomains ni preload sin revisar subdominios", () => {
    assert.doesNotMatch(store.get("strict-transport-security") ?? "", /includeSubDomains|preload/);
  });

  it("el panel no se puede incrustar ni indexar", () => {
    assert.equal(admin.get("x-frame-options"), "DENY");
    assert.match(admin.get(cspKey) ?? "", /frame-ancestors 'none'/);
    assert.equal(admin.get("x-robots-tag"), "noindex, nofollow");
    assert.equal(store.get("x-frame-options"), "SAMEORIGIN");
    assert.match(store.get(cspKey) ?? "", /frame-ancestors 'self'/);
  });

  it("se aplica en modo bloqueante, eleva HTTP a HTTPS y reporta al endpoint propio", () => {
    assert.equal(CSP_ENFORCE, true);
    assert.equal(admin.get("content-security-policy-report-only"), undefined);
    assert.match(admin.get(cspKey) ?? "", /upgrade-insecure-requests/);
    assert.match(admin.get(cspKey) ?? "", new RegExp(`report-uri ${CSP_REPORT_PATH}`));
    assert.match(admin.get("reporting-endpoints") ?? "", /csp="\/api\/csp-report"/);
  });
});

describe("buildCsp", () => {
  const csp = buildCsp({ frameAncestors: "'none'" });

  it("nunca permite eval, objetos ni orígenes comodín", () => {
    assert.doesNotMatch(csp, /unsafe-eval/);
    assert.match(csp, /object-src 'none'/);
    assert.doesNotMatch(csp, /(^|\s)\*(\s|;|$)/);
    assert.doesNotMatch(csp, /https?:(\s|;|$)/, "sin esquemas completos permitidos");
  });

  it("restringe base-uri y form-action al propio sitio", () => {
    assert.match(csp, /base-uri 'self'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /default-src 'self'/);
  });
});

describe("orígenes externos permitidos", () => {
  const csp = buildCsp({ frameAncestors: "'self'" });

  it("permite solo el beacon de Cloudflare Web Analytics", () => {
    assert.match(csp, /script-src 'self' 'unsafe-inline' https:\/\/static\.cloudflareinsights\.com;/);
    assert.match(csp, /connect-src 'self' https:\/\/cloudflareinsights\.com;/);
    const external = csp.match(/https:\/\/[^\s;]+/g) ?? [];
    assert.deepEqual([...new Set(external)].sort(),
      ["https://cloudflareinsights.com", "https://static.cloudflareinsights.com"]);
  });
});
