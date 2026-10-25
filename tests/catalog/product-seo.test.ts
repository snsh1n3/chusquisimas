import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildProductJsonLd, productDescription } from "../../src/lib/catalog/product-seo.ts";
import type { PublicProduct, PublicVariant } from "../../src/lib/catalog/public-catalog.ts";

const product: PublicProduct = {
  id: "p", slug: "gnomo", name: "Gnomo", description: "Vela con forma de gnomo.",
  categoryIds: [], featured: false,
  images: [{ id: "i", src: "/api/images/i", thumbSrc: "/api/images/i/thumb", alt: "Gnomo", sortOrder: 0 }],
};
const variant = (amount: number, availability: PublicVariant["availability"]): PublicVariant => ({
  id: `${amount}`, productId: "p", label: "x", price: { currency: "COP", amount }, availability,
});

describe("product SEO", () => {
  it("resume la descripción y usa una por defecto", () => {
    assert.equal(productDescription(product), "Vela con forma de gnomo.");
    assert.match(productDescription({ name: "Regia", description: "  " }), /Regia: vela artesanal/);
    assert.ok(productDescription({ name: "x", description: "a".repeat(400) }).length <= 155);
  });

  it("genera Product con oferta agregada y disponibilidad", () => {
    const data = JSON.parse(buildProductJsonLd(product, [variant(50000, "made_to_order"), variant(40000, "ready_to_ship")]));
    assert.equal(data["@type"], "Product");
    assert.equal(data.url, "https://chusquisimas.com/tienda/gnomo");
    assert.deepEqual(data.image, ["https://chusquisimas.com/api/images/i"]);
    assert.equal(data.offers.lowPrice, 40000);
    assert.equal(data.offers.highPrice, 50000);
    assert.equal(data.offers.availability, "https://schema.org/InStock");
  });

  it("omite ofertas sin variantes y escapa < para no cerrar el script", () => {
    const json = buildProductJsonLd({ ...product, name: "</script><script>alert(1)</script>" }, []);
    assert.doesNotMatch(json, /</);
    assert.equal(JSON.parse(json).offers, undefined);
    assert.equal(JSON.parse(json).name, "</script><script>alert(1)</script>");
  });
});

// --- Endurecimiento tras la auditoría de seguridad (oct 2026) ---

it("serializeJsonForScript no deja caracteres que cierren el script", async () => {
  const { serializeJsonForScript } = await import("../../src/lib/catalog/product-seo.ts");
  const hostile = { name: "</script><script>alert(1)</script>", note: "<!-- & >   " };
  const out = serializeJsonForScript(hostile);
  for (const ch of ["<", ">", "&", " ", " "]) assert.equal(out.includes(ch), false, ch);
  assert.deepEqual(JSON.parse(out), hostile);
});
