/**
 * Modelo de dominio del catálogo de Chusquisimas V2.
 *
 * No depende de una base de datos ni de un proveedor de ecommerce.
 * Los importes se almacenan como pesos colombianos enteros.
 */

export type CatalogId = string;

export type CurrencyCode = "COP";

export type ProductStatus =
  | "draft"
  | "active"
  | "archived";

export type VariantStatus =
  | "active"
  | "inactive";

export type FulfillmentMode =
  | "ready_stock"
  | "made_to_order";

export interface CatalogCategory {
  id: CatalogId;
  slug: string;
  name: string;
  description?: string;
  parentId?: CatalogId;
  sortOrder: number;
}

export interface CatalogProductImage {
  id: CatalogId;
  src: string;
  alt: string;
  sortOrder: number;
}

export interface ProductOptionValue {
  id: CatalogId;
  label: string;
  sortOrder: number;
}

export interface ProductOption {
  id: CatalogId;
  name: string;
  values: ProductOptionValue[];
}

export interface CatalogProduct {
  id: CatalogId;
  slug: string;
  name: string;
  description: string;
  categoryIds: CatalogId[];
  status: ProductStatus;
  images: CatalogProductImage[];
  options: ProductOption[];
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VariantOptionSelection {
  optionId: CatalogId;
  valueId: CatalogId;
}

export interface MoneyCOP {
  currency: "COP";
  amount: number;
}

/**
 * stock: se vende desde unidades disponibles.
 * made_to_order: se fabrica con un plazo definido.
 *
 * Una variante puede tener ambas modalidades disponibles.
 */
export type FulfillmentPolicy =
  | {
      mode: "ready_stock";
      inventory: VariantInventory;
    }
  | {
      mode: "made_to_order";
      preparationDaysMin: number;
      preparationDaysMax: number;
      maxOpenOrders?: number;
    };

export interface VariantInventory {
  onHand: number;
  reserved: number;
  trackInventory: boolean;
}

export interface ProductVariant {
  id: CatalogId;
  productId: CatalogId;
  sku: string;
  optionSelections: VariantOptionSelection[];
  price: MoneyCOP;
  status: VariantStatus;
  fulfillmentPolicies: FulfillmentPolicy[];
  imageIds: CatalogId[];
}

export interface CatalogData {
  categories: CatalogCategory[];
  products: CatalogProduct[];
  variants: ProductVariant[];
}

/**
 * Calcula las unidades disponibles para nuevos pedidos.
 * No modifica ni reserva inventario.
 */
export function getAvailableQuantity(
  inventory: VariantInventory
): number | null {
  if (!inventory.trackInventory) {
    return null;
  }

  return Math.max(0, inventory.onHand - inventory.reserved);
}

/**
 * Da formato a un precio expresado en pesos colombianos.
 */
export function formatPriceCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}