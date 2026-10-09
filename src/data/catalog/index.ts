import type { CatalogData } from "../../types/catalog";

import { catalogCategories } from "./categories.ts";
import { draftCatalogProducts } from "./drafts.ts";

export const catalogData: CatalogData = {
  categories: catalogCategories,

  // Referencias documentadas como borradores; no se ofrecen a la venta.
  products: draftCatalogProducts,

  // Cada variante tendra su SKU, precio y modalidad de venta.
  variants: [],
};

export function getCatalogCategories() {
  return [...catalogData.categories].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}