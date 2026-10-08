import { catalogData } from "../../data/catalog/index.ts";
import type {
  CatalogProduct,
  ProductVariant,
} from "../../types/catalog";

import { getVariantAvailability } from "./availability.ts";

export function getActiveProducts(): CatalogProduct[] {
  return catalogData.products.filter(
    (product) => product.status === "active"
  );
}

export function getProductBySlug(
  slug: string
): CatalogProduct | undefined {
  return getActiveProducts().find(
    (product) => product.slug === slug
  );
}

export function getProductsByCategory(
  categoryId: string
): CatalogProduct[] {
  return getActiveProducts().filter(
    (product) => product.categoryIds.includes(categoryId)
  );
}

export function getProductVariants(
  productId: string
): ProductVariant[] {
  return catalogData.variants.filter(
    (variant) => variant.productId === productId
  );
}

export function getPurchasableVariants(
  productId: string
): ProductVariant[] {
  const product = catalogData.products.find(
    (item) => item.id === productId
  );

  if (!product || product.status !== "active") {
    return [];
  }

  return getProductVariants(productId).filter(
    (variant) => getVariantAvailability(variant).purchasable
  );
}