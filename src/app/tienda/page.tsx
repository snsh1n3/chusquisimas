import Link from "next/link";
import { SiteHeader } from "@/components/layout/site-header";
import type { Metadata } from "next";

import { getCatalogCategories } from "@/data/catalog";
import { getActiveProducts, getProductsByCategory } from "@/lib/catalog/queries";

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

  const products = selectedCategory
    ? getProductsByCategory(selectedCategory.id)
    : getActiveProducts();

  return (
    <main className="min-h-screen bg-[#F7F1E9] text-[#231F20]">
      <SiteHeader />

      <section className="mx-auto max-w-6xl px-5 pb-14 pt-10 sm:px-8 sm:pt-16">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#C86021]">
            Un aroma para cada momento
          </p>

          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-6xl">
            Nuestra tienda
          </h1>

          <p className="mt-5 text-base leading-7 text-[#66584D] sm:text-lg">
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
                ? "bg-[#231F20] text-white"
                : "bg-white text-[#231F20] hover:bg-[#EDE3D7]"
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
                  ? "bg-[#231F20] text-white"
                  : "bg-white text-[#231F20] hover:bg-[#EDE3D7]"
              }`}
            >
              {category.name}
            </Link>
          ))}
        </nav>

        <div className="mt-12 rounded-3xl border border-[#EDE3D7] bg-[#FFFDF9] px-6 py-16 text-center sm:px-12">
          {products.length === 0 ? (
            <>
              <p className="text-4xl" aria-hidden="true">
                ✨
              </p>
              <h2 className="mt-5 text-2xl font-bold">
                Pronto encontrarás algo chusquísimo.
              </h2>
              <p className="mx-auto mt-3 max-w-md leading-7 text-[#66584D]">
                Estamos preparando nuestro catálogo.
                Muy pronto podrás explorar nuestras creaciones.
              </p>
            </>
          ) : (
            <div className="text-left">
              <h2 className="text-2xl font-bold">
                {selectedCategory?.name ?? "Todos los productos"}
              </h2>
              <p className="mt-3 text-[#66584D]">
                Encontramos {products.length} productos.
                Pronto podrás explorarlos aquí.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}