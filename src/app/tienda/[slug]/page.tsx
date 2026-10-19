import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";

import { PublicShell } from "@/components/layout/public-shell";
import { OrderPanel } from "@/components/product/order-panel";
import { ProductGallery } from "@/components/product/product-gallery";
import { getCatalogCategories } from "@/data/catalog";
import { getPublicProductBySlug } from "@/lib/catalog/d1-published";
import { buildProductJsonLd, productDescription, SITE_URL } from "@/lib/catalog/product-seo";
import { createLogger, describeError } from "@/lib/observability/logger";
import { OPEN_GRAPH_DEFAULTS } from "@/lib/site";

export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

type LoadResult =
  | { state: "ok"; data: NonNullable<Awaited<ReturnType<typeof getPublicProductBySlug>>> }
  | { state: "missing" }
  | { state: "error" };

/** Cacheado por solicitud: generateMetadata y la página comparten una sola consulta. */
const load = cache(async (slug: string): Promise<LoadResult> => {
  try {
    const data = await getPublicProductBySlug(slug);
    return data ? { state: "ok", data } : { state: "missing" };
  } catch (error) {
    createLogger({ operation: "public.product.render" })
      .error("store.product_unavailable", { slug: slug.slice(0, 140), ...describeError(error) });
    return { state: "error" };
  }
});

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await load(slug);
  if (result.state !== "ok") return { title: "Producto", robots: { index: false } };
  const { product } = result.data;
  const description = productDescription(product);
  const image = product.images[0];
  return {
    title: product.name,
    description,
    alternates: { canonical: `/tienda/${product.slug}` },
    openGraph: {
      ...OPEN_GRAPH_DEFAULTS,
      title: `${product.name} | Chusquisimas`,
      description,
      url: `${SITE_URL}/tienda/${product.slug}`,
      images: image ? [{ url: `${SITE_URL}${image.src}`, alt: image.alt }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const result = await load(slug);
  if (result.state === "missing") notFound();

  if (result.state === "error") {
    return (
      <PublicShell>
        <section className="mx-auto max-w-2xl px-5 py-20 text-center">
          <h1 className="text-2xl font-bold">No pudimos cargar este producto.</h1>
          <p className="mt-3 text-fg-muted">
            Estamos teniendo un inconveniente temporal. Recarga en unos minutos o escríbenos por WhatsApp.
          </p>
          <Link href="/tienda" className="mt-6 inline-block font-bold underline">Volver a la tienda</Link>
        </section>
      </PublicShell>
    );
  }

  const { product, variants } = result.data;
  const category = getCatalogCategories().find((item) => product.categoryIds.includes(item.id));
  const jsonLd = buildProductJsonLd(product, variants);

  return (
    <PublicShell>
      <script
        type="application/ld+json"
        // JSON-LD con "<" escapado: no puede cerrar la etiqueta script.
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-8 sm:pt-10">
        <nav aria-label="Ruta de navegación" className="text-sm text-fg-muted">
          <ol className="flex flex-wrap gap-2">
            <li><Link href="/tienda" className="hover:underline">Tienda</Link></li>
            {category && (
              <li>
                <span aria-hidden="true">/ </span>
                <Link href={`/tienda?categoria=${encodeURIComponent(category.slug)}`} className="hover:underline">
                  {category.name}
                </Link>
              </li>
            )}
            <li aria-current="page"><span aria-hidden="true">/ </span>{product.name}</li>
          </ol>
        </nav>

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          <ProductGallery name={product.name} images={product.images} />

          <div className="flex flex-col gap-6">
            <div>
              {category && (
                <p className="text-xs font-bold uppercase tracking-widest text-fg-accent">{category.name}</p>
              )}
              <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">{product.name}</h1>
              {product.description && (
                <p className="mt-4 whitespace-pre-line text-base leading-7 text-fg-muted">
                  {product.description}
                </p>
              )}
            </div>

            <OrderPanel productName={product.name} variants={variants} />

            <ul className="grid gap-2 text-sm text-fg-muted">
              <li>🕯️ Hecha a mano, desde el envase en cemento.</li>
              <li>🌱 Cera vegetal de soya.</li>
              <li>📦 Lo que no está en existencia se fabrica en 14 días.</li>
            </ul>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
