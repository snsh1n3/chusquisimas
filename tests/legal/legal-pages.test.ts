import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { LEGAL_PAGES, SIC_URL, getLegalPage } from "../../src/lib/legal/legal-pages.ts";

const text = (slug: Parameters<typeof getLegalPage>[0]) => JSON.stringify(getLegalPage(slug));

test("existen las cuatro páginas legales", () => {
  assert.deepEqual(LEGAL_PAGES.map((page) => page.slug), ["terminos", "envios", "cambios", "pqr"]);
});

test("plazos legales verificados (Ley 1480 y Decreto 587 de 2016)", () => {
  const cambios = text("cambios");
  assert.match(cambios, /5 días hábiles desde la entrega/);       // retracto, art. 47
  assert.match(cambios, /30 días calendario/);                    // devolución del dinero, art. 47
  assert.match(cambios, /Los costos de devolución corren por tu cuenta/);
  assert.match(cambios, /reversión del pago/);                    // art. 51
  assert.match(cambios, /no reemplaza tu garantía legal/);        // las 48 h no limitan la garantía
});

test("datos del negocio: pagos y tiempos de envío", () => {
  const terminos = text("terminos");
  for (const method of ["Nequi", "Daviplata", "Bre-B", "contra entrega"]) assert.match(terminos, new RegExp(method));
  assert.match(terminos, /no es una compra todavía/);
  const envios = text("envios");
  assert.match(envios, /1 a 2 días hábiles/);
  assert.match(envios, /3 a 6 días hábiles/);
});

test("PQR y pie de página enlazan a la SIC", () => {
  assert.ok(text("pqr").includes(SIC_URL));
  const footer = readFileSync(new URL("../../src/components/layout/site-footer.tsx", import.meta.url), "utf8");
  assert.match(footer, /SIC_URL/);
  for (const href of ["/terminos", "/envios", "/cambios", "/privacidad", "/pqr"]) assert.ok(footer.includes(`"${href}"`), href);
});
