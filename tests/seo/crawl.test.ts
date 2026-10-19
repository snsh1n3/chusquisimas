import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildRobotsTxt, buildSitemapXml, isAdminHost } from "../../src/lib/seo/crawl.ts";
import { buildOrganizationJsonLd } from "../../src/lib/catalog/product-seo.ts";

describe("robots.txt", () => {
  it("bloquea todo el panel administrativo", () => {
    for (const host of ["admin.chusquisimas.com", "ADMIN.chusquisimas.com:443"]) {
      assert.equal(isAdminHost(host), true);
      assert.equal(buildRobotsTxt(host), "User-agent: *\nDisallow: /\n");
    }
  });

  it("en la tienda permite páginas y fotos, bloquea API y admin, y anuncia el sitemap", () => {
    const robots = buildRobotsTxt("chusquisimas.com");
    assert.match(robots, /^User-agent: \*\nAllow: \//);
    assert.match(robots, /Disallow: \/api\/\nAllow: \/api\/images\//);
    assert.match(robots, /Disallow: \/admin/);
    assert.match(robots, /Sitemap: https:\/\/chusquisimas\.com\/sitemap\.xml/);
    assert.equal(isAdminHost(null), false);
  });
});

describe("sitemap.xml", () => {
  it("genera URLs absolutas, imágenes y escapa caracteres XML", () => {
    const xml = buildSitemapXml([
      { path: "/" },
      { path: "/tienda?categoria=wax-melts&x=1" },
      { path: "/tienda/titina", images: ["/api/images/abc"], lastModified: "2026-10-19" },
    ]);
    assert.match(xml, /^<\?xml version="1.0" encoding="UTF-8"\?>/);
    assert.match(xml, /<loc>https:\/\/chusquisimas\.com\/<\/loc>/);
    assert.match(xml, /categoria=wax-melts&amp;x=1/);
    assert.doesNotMatch(xml, /&x=1/);
    assert.match(xml, /<image:loc>https:\/\/chusquisimas\.com\/api\/images\/abc<\/image:loc>/);
    assert.match(xml, /<lastmod>2026-10-19<\/lastmod>/);
    assert.equal((xml.match(/<url>/g) ?? []).length, 3);
  });
});

describe("Organization JSON-LD", () => {
  it("incluye sitio, logo e Instagram oficial", () => {
    const data = JSON.parse(buildOrganizationJsonLd());
    assert.equal(data["@type"], "Organization");
    assert.equal(data.url, "https://chusquisimas.com");
    assert.deepEqual(data.sameAs, ["https://www.instagram.com/chusquisimas.co/"]);
  });
});
