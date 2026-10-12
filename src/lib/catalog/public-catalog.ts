/**
 * Proyección pública del catálogo.
 *
 * Es la única forma del catálogo que debe llegar a componentes de la tienda.
 * Contiene lo necesario para mostrar y pedir un producto (precio y estado de
 * disponibilidad) pero NUNCA cantidades de inventario: `onHand`, `reserved` o
 * unidades disponibles se quedan en el servidor. Así, aunque mañana un
 * componente cliente (selector de aroma, carrito, pedido por WhatsApp) reciba
 * estos objetos como props, no se serializa información comercial sensible.
 */

import type {
  CatalogId,
  CatalogProduct,
  CatalogProductImage,
  MoneyCOP,
  ProductVariant,
} from "../../types/catalog.ts";
import { getVariantAvailability } from "./availability.ts";

export type PublicAvailability = "ready_to_ship" | "made_to_order" | "out_of_stock";

export interface PublicVariant {
  id: CatalogId;
  productId: CatalogId;
  price: MoneyCOP;
  availability: PublicAvailability;
  /** Solo presente cuando la variante se fabrica bajo pedido. */
  preparationDays?: number;
}

export interface PublicProduct {
  id: CatalogId;
  slug: string;
  name: string;
  description: string;
  categoryIds: CatalogId[];
  images: CatalogProductImage[];
  featured: boolean;
}

export interface PublicCatalog {
  products: PublicProduct[];
  variants: PublicVariant[];
}

export function toPublicVariant(variant: ProductVariant): PublicVariant | null {
  const availability = getVariantAvailability(variant);
  // Variantes inactivas no se publican: su existencia tampoco es pública.
  if (availability.status === "unavailable") return null;

  const publicVariant: PublicVariant = {
    id: variant.id,
    productId: variant.productId,
    price: { currency: variant.price.currency, amount: variant.price.amount },
    availability: availability.status,
  };
  if (availability.status === "made_to_order" && availability.preparationDaysMax !== undefined) {
    publicVariant.preparationDays = availability.preparationDaysMax;
  }
  return publicVariant;
}

export function toPublicProduct(product: CatalogProduct): PublicProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    categoryIds: [...product.categoryIds],
    images: product.images.map((image) => ({
      id: image.id, src: image.src, alt: image.alt, sortOrder: image.sortOrder,
    })),
    featured: product.featured,
  };
}

export function toPublicCatalog(catalog: {
  products: readonly CatalogProduct[];
  variants: readonly ProductVariant[];
}): PublicCatalog {
  const variants = catalog.variants
    .map(toPublicVariant)
    .filter((variant): variant is PublicVariant => variant !== null);
  return {
    products: catalog.products.map(toPublicProduct),
    variants,
  };
}

/** Etiqueta de disponibilidad de un producto a partir de sus variantes públicas. */
export function summarizeAvailability(
  variants: readonly PublicVariant[]
): "Disponible" | "Bajo pedido" | "No disponible" {
  if (variants.some((variant) => variant.availability === "ready_to_ship")) return "Disponible";
  if (variants.some((variant) => variant.availability === "made_to_order")) return "Bajo pedido";
  return "No disponible";
}

/** Precio más bajo entre variantes que se pueden pedir; null si ninguna. */
export function lowestOrderablePrice(variants: readonly PublicVariant[]): {
  amount: number; hasRange: boolean;
} | null {
  const prices = variants
    .filter((variant) => variant.availability !== "out_of_stock")
    .map((variant) => variant.price.amount);
  if (prices.length === 0) return null;
  return { amount: Math.min(...prices), hasRange: new Set(prices).size > 1 };
}
