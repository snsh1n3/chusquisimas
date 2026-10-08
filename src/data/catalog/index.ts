import type { CatalogData } from "../../types/catalog";

import { catalogCategories } from "./categories.ts";

export const catalogData: CatalogData = {
  categories: catalogCategories,

  // Se incorporaran productos reales progresivamente.
  products: [],

  // Cada variante tendra su SKU, precio y modalidad de venta.
  variants: [],
};

export function getCatalogCategories() {
  return [...catalogData.categories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}