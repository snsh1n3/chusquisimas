import Image from "next/image";
import Link from "next/link";

import {
  lowestOrderablePrice,
  summarizeAvailability,
  type PublicProduct,
  type PublicVariant,
} from "@/lib/catalog/public-catalog";
import { formatPriceCOP } from "@/types/catalog";

interface ProductCardProps {
  product: PublicProduct;
  /** Solo la proyección pública: nunca cantidades de inventario. */
  variants: PublicVariant[];
  categoryName?: string;
}

export function ProductCard({
  product,
  variants,
  categoryName,
}: ProductCardProps) {
  const mainImage = [...product.images].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )[0];

  const price = lowestOrderablePrice(variants);
  const availability = summarizeAvailability(variants);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-brand-black/10 bg-brand-white shadow-sm transition hover:shadow-md">
      <div className="relative flex aspect-square items-center justify-center bg-brand-cream">
        {mainImage ? (
          <Image
            src={mainImage.thumbSrc ?? mainImage.src}
            unoptimized
            alt={mainImage.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover"
          />
        ) : (
          <div className="px-6 text-center">
            <span className="text-sm font-bold text-brand-black/45">
              Fotografía próximamente
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 p-5">
        {categoryName && (
          <p className="text-xs font-bold uppercase tracking-widest text-brand-orange">
            {categoryName}
          </p>
        )}

        <h2 className="text-xl font-bold text-brand-black">
          {/* El enlace cubre toda la tarjeta con ::after, sin anidar elementos interactivos. */}
          <Link href={`/tienda/${product.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange">
            {product.name}
          </Link>
        </h2>

        <p className="line-clamp-2 text-sm leading-6 text-brand-black/65">
          {product.description}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-base font-bold text-brand-black">
            {price === null
              ? "Precio no disponible"
              : price.hasRange
                ? `Desde ${formatPriceCOP(price.amount)}`
                : formatPriceCOP(price.amount)}
          </p>

          <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-black">
            {availability}
          </span>
        </div>
      </div>
    </article>
  );
}