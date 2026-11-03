import { test } from "node:test";
import assert from "node:assert/strict";
import { adminHostRedirects } from "../../src/lib/routing/admin-host.ts";

// Next compila `/:path(regex)` como ^/(regex)$; se reproduce para probar la exclusión.
const [, rest] = adminHostRedirects();
const inner = rest.source.slice("/:path(".length, -1);
const matches = (path: string) => new RegExp(`^/(${inner})$`).test(path);

test("la raíz del subdominio admin lleva al panel", () => {
  const [root] = adminHostRedirects();
  assert.equal(root.source, "/");
  assert.equal(root.destination, "/admin");
  assert.deepEqual(root.has, [{ type: "host", value: "admin.chusquisimas.com" }]);
});

test("las páginas de la tienda en el subdominio admin van a la tienda", () => {
  for (const path of ["/tienda", "/tienda/vela-cafe", "/carrito", "/privacidad", "/administrar", "/apix"]) {
    assert.ok(matches(path), path);
  }
});

test("el panel, la API, los estáticos y robots siguen en el subdominio admin", () => {
  for (const path of ["/admin", "/admin/pedidos/abc", "/api/admin/products", "/_next/static/x.js",
    "/favicon.ico", "/icon.svg", "/apple-icon.png", "/robots.txt"]) {
    assert.ok(!matches(path), path);
  }
});
