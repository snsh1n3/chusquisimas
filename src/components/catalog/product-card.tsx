import Image from "next/image";

import { getVariantAvailability } from "@/lib/catalog/availability";
import {
  formatPriceCOP,
  type CatalogProduct,
  type ProductVariant,
} from "@/types/catalog";

interface ProductCardProps {
  product: CatalogProduct;
  variants: ProductVariant[];
  categoryName?: string;
}

function getProductAvailability(variants: ProductVariant[]) {
  const statuses = variants.map((variant) =>
    getVariantAvailability(variant).status
  );

  if (statuses.includes("ready_to_ship")) {
    return "Disponible";
  }

  if (statuses.includes("made_to_order")) {
    return "Bajo pedido";
  }

  return "No disponible";
}

export function ProductCard({
  product,
  variants,
  categoryName,
}: ProductCardProps) {
  const mainImage = [...product.images].sort(
    (a, b) => a.sortOrder - b.sortOrder
  )[0];

  const activeVariants = variants.filter(
    (variant) => variant.status === "active"
  );

  const purchasableVariants = activeVariants.filter(
    (variant) => getVariantAvailability(variant).purchasable
  );

  const prices = purchasableVariants.map(
    (variant) => variant.price.amount
  );

  const lowestPrice =
    prices.length > 0 ? Math.min(...prices) : null;

  const availability = getProductAvailability(
    activeVariants
  );

  return (
    <article className="overflow-hidden rounded-3xl border border-brand-black/10 bg-brand-white shadow-sm">
      <div className="relative flex aspect-square items-center justify-center bg-brand-cream">
        {mainImage ? (
          <Image
            src={mainImage.src}
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
          {product.name}
        </h2>

        <p className="line-clamp-2 text-sm leading-6 text-brand-black/65">
          {product.description}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
          <p className="text-base font-bold text-brand-black">
            {lowestPrice === null
              ? "Precio no disponible"
              : prices.length > 1
                ? `Desde ${formatPriceCOP(lowestPrice)}`
                : formatPriceCOP(lowestPrice)}
          </p>

          <span className="rounded-full bg-brand-cream px-3 py-1 text-xs font-bold text-brand-black">
            {availability}
          </span>
        </div>
      </div>
    </article>
  );
}