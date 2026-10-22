import { NextRequest } from "next/server";
import { getCatalogCategories } from "@/data/catalog";
import { getPublicCatalog } from "@/lib/catalog/d1-published";
import { buildSitemapXml, isAdminHost, type SitemapEntry } from "@/lib/seo/crawl";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

/**
 * Sitemap con inicio, tienda, categorías y fichas de productos a la venta.
 * Si D1 falla, publica al menos las páginas fijas y registra el error.
 */
export const GET = withApiLogging("public.sitemap", async (request: NextRequest, ctx) => {
  if (isAdminHost(request.headers.get("host"))) {
    return new Response(null, { status: 404 });
  }
  const entries: SitemapEntry[] = [
    { path: "/" },
    { path: "/tienda" },
    ...["/terminos", "/envios", "/cambios", "/pqr", "/privacidad"].map((path) => ({ path })),
    ...getCatalogCategories().map((category) => ({
      path: `/tienda?categoria=${encodeURIComponent(category.slug)}`,
    })),
  ];
  try {
    const catalog = await getPublicCatalog();
    for (const product of catalog.products) {
      entries.push({
        path: `/tienda/${product.slug}`,
        images: product.images.map((image) => image.src),
      });
    }
  } catch (error) {
    ctx.fail(error, "storage", { stage: "sitemap_catalog" });
  }
  return new Response(buildSitemapXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
});
