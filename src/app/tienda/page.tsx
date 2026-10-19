import Link from "next/link";
import { ProductCard } from "@/components/catalog/product-card";
import { SiteHeader } from "@/components/layout/site-header";
import type { Metadata } from "next";

import { getCatalogCategories } from "@/data/catalog";
import { getPublicCatalog } from "@/lib/catalog/d1-published";
import type { PublicCatalog } from "@/lib/catalog/public-catalog";
import { createLogger, describeError } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tienda | Chusquisimas",
  description:
    "Descubre velas aromáticas, wax melts y creaciones personalizadas de Chusquisimas.",
};

interface StorePageProps {
  searchParams: Promise<{ categoria?: string }>;
}

export default async function StorePage({
  searchParams,
}: StorePageProps) {
  const { categoria } = await searchParams;

  const categories = getCatalogCategories();
  const selectedCategory = categories.find(
    (item) => item.slug === categoria
  );

  let published: PublicCatalog | null = null;
  try {
    published = await getPublicCatalog();
  } catch (error) {
    // La tienda muestra un estado de error amable; el detalle queda en Workers Logs.
    createLogger({ operation: "public.store.render" })
      .error("store.catalog_unavailable", describeError(error));
  }
  const allProducts = published?.products ?? [];
  const products = selectedCategory
    ? allProducts.filter(p => p.categoryIds.includes(selectedCategory.id))
    : allProducts;

  return (
    <main className="min-h-screen bg-page text-fg">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-fg-accent">
            Un aroma para cada momento
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Nuestra tienda
          </h1>

          <p className="mt-5 text-base leading-7 text-fg-muted sm:text-lg">
            Pequeños detalles, grandes ambientes.
            Descubre todo lo que estamos creando para ti.
          </p>
        </div>

        <nav
          aria-label="Filtrar productos por categoría"
          className="mt-10 flex flex-wrap justify-center gap-3"
        >
          <Link
            href="/tienda"
            aria-current={!categoria || !selectedCategory ? "page" : undefined}
            className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
              !categoria || !selectedCategory
                ? "bg-inverse text-on-inverse"
                : "bg-surface text-fg hover:bg-panel"
            }`}
          >
            Todo
          </Link>

          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/tienda?categoria=${encodeURIComponent(category.slug)}`}
              aria-current={selectedCategory?.id === category.id ? "page" : undefined}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${
                selectedCategory?.id === category.id
                  ? "bg-inverse text-on-inverse"
                  : "bg-surface text-fg hover:bg-panel"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="mt-12 rounded-3xl border border-line bg-surface px-6 py-16 text-center sm:px-12">
          {published === null ? (
            <>
              <p className="text-4xl" aria-hidden="true">
                🕯️
              </p>
              <h2 className="mt-5 text-2xl font-bold">
                No pudimos cargar el catálogo.
              </h2>
              <p className="mx-auto mt-3 max-w-md leading-7 text-fg-muted">
                Estamos teniendo un inconveniente temporal. Recarga la página
                en unos minutos o escríbenos por WhatsApp.
              </p>
            </>
          ) : products.length === 0 ? (
            <>
              <p className="text-4xl" aria-hidden="true">
                ✨
              </p>
              <h2 className="mt-5 text-2xl font-bold">
                Pronto encontrarás algo chusquísimo.
              </h2>
              <p className="mx-auto mt-3 max-w-md leading-7 text-fg-muted">
                Estamos preparando nuestro catálogo.
                Muy pronto podrás explorar nuestras creaciones.
              </p>
            </>
          ) : (
            <div className="text-left">
              <h2 className="text-2xl font-bold">
                {selectedCategory?.name ?? "Todos los productos"}
              </h2>

              <p className="mt-3 text-fg-muted">
                {products.length === 1
                  ? "Encontramos 1 producto."
                  : `Encontramos ${products.length} productos.`}
              </p>

              <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {products.map((product) => {
                  const category = categories.find((item) =>
                    product.categoryIds.includes(item.id)
                  );

                  return (
                    <ProductCard
                      key={product.id}
                      product={product}
                      variants={published?.variants.filter(v => v.productId === product.id) ?? []}
                      categoryName={category?.name}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}