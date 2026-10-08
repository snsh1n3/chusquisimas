import type { CatalogCategory } from "../../types/catalog";

export const catalogCategories: CatalogCategory[] = [
  {
    id: "cat-velas-aromaticas",
    slug: "velas-aromaticas",
    name: "Velas aromáticas",
    description: "Velas que llenan tus espacios de aroma y personalidad.",
    sortOrder: 1,
  },
  {
    id: "cat-wax-melts",
    slug: "wax-melts",
    name: "Wax melts",
    description: "Aromas para disfrutar en tu quemador de esencias.",
    sortOrder: 2,
  },
  {
    id: "cat-personalizados",
    slug: "personalizados",
    name: "Personalizados",
    description: "Creaciones especiales que se adaptan a tu idea.",
    sortOrder: 3,
  },
];