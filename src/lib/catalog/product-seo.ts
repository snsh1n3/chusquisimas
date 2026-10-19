/**
 * SEO de la página de producto: descripción para buscadores y datos
 * estructurados schema.org/Product. Solo usa la proyección pública.
 */
import type { PublicProduct, PublicVariant } from "./public-catalog.ts";

import { INSTAGRAM_URL, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "../site.ts";

export { SITE_URL };
const MAX_DESCRIPTION = 155;

export function productDescription(product: Pick<PublicProduct, "name" | "description">): string {
  const base = product.description.replace(/\s+/g, " ").trim() ||
    `${product.name}: vela artesanal de Chusquisimas, hecha a mano con cera de soya.`;
  return base.length > MAX_DESCRIPTION ? `${base.slice(0, MAX_DESCRIPTION - 1).trimEnd()}…` : base;
}

const AVAILABILITY: Record<PublicVariant["availability"], string> = {
  ready_to_ship: "https://schema.org/InStock",
  made_to_order: "https://schema.org/PreOrder",
  out_of_stock: "https://schema.org/OutOfStock",
};

/** JSON-LD listo para insertar en <script>: "<" escapado para no romper la etiqueta. */
export function buildProductJsonLd(product: PublicProduct, variants: readonly PublicVariant[]): string {
  const url = `${SITE_URL}/tienda/${product.slug}`;
  const prices = variants.map((variant) => variant.price.amount);
  const best = variants.find((v) => v.availability === "ready_to_ship") ??
    variants.find((v) => v.availability === "made_to_order") ?? variants[0];
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: productDescription(product),
    url,
    brand: { "@type": "Brand", name: SITE_NAME },
    image: product.images.map((image) => `${SITE_URL}${image.src}`),
  };
  if (prices.length > 0 && best) {
    data.offers = {
      "@type": "AggregateOffer",
      priceCurrency: "COP",
      lowPrice: Math.min(...prices),
      highPrice: Math.max(...prices),
      offerCount: variants.length,
      availability: AVAILABILITY[best.availability],
      url,
    };
  }
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/** Organization para la página de inicio: nombre, sitio, logo y perfiles oficiales. */
export function buildOrganizationJsonLd(): string {
  return JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/chusquisimas-logo.svg`,
    description: SITE_DESCRIPTION,
    sameAs: [INSTAGRAM_URL],
  }).replace(/</g, "\\u003c");
}
