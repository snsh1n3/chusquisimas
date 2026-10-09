/** Referencias recibidas para Chusquisimas V2.
 * No son artículos comprables: faltan fotografías, precios e inventario validado.
 * Mantener en draft hasta completar la ficha y las variantes comerciales.
 */
import type { CatalogProduct } from "../../types/catalog";

export const candleAromas = [
  "Natilla",
  "Café",
  "Chocolate",
  "Lulada",
  "Frutos del bosque",
  "Uva",
] as const;

export const preparationDays = 14;

export const referenceNotes: Record<string, string> = {
  "titina": "Hongo con tapa",
  "churras-queridas": "Mogollas; presentación individual o combo de tres por definir",
  "chuscas": "Primera referencia, tamaño pequeño",
  "regia": "Diseño de flores",
  "serendipia": "Referencia por identificar con fotografía (izquierda)",
  "candor": "Referencia por identificar con fotografía (derecha)",
  "chia": "Diseño de luna",
  "quimera-grande": "Similar a Chusca en formato grande",
  "quimera-pequena": "Fotografía de referencia en color azul, pendiente",
  "chata": "Fotografía pendiente",
  "gnomo": "Descripción y fotografía pendientes",
  "carinito": "Similar a Regia con corazones",
  "antojitos": "Diseño de helado",
  "foforro": "Similar a Quimera pequeña",
  "calderito": "Descripción y fotografía pendientes",
  "happy": "Presentación inspirada en un postre",
  "halloween": "Referencia temática; aroma específico pendiente",
  "kit-brujas": "Una caja de wax melts, dos velas y un pebetero; detalles pendientes",
  "kit-navidad": "Componentes pendientes de confirmar"
};

const createdAt = "2026-10-09T00:00:00.000Z";

const references: Array<{ slug: string; name: string; categoryId: string }> = [
  { slug: "titina", name: "Titina", categoryId: "cat-velas-aromaticas" },
  { slug: "churras-queridas", name: "Churras queridas", categoryId: "cat-velas-aromaticas" },
  { slug: "chuscas", name: "Chuscas", categoryId: "cat-velas-aromaticas" },
  { slug: "regia", name: "Regia", categoryId: "cat-velas-aromaticas" },
  { slug: "serendipia", name: "Serendipia", categoryId: "cat-velas-aromaticas" },
  { slug: "candor", name: "Candor", categoryId: "cat-velas-aromaticas" },
  { slug: "chia", name: "Chía", categoryId: "cat-velas-aromaticas" },
  { slug: "quimera-grande", name: "Quimera grande", categoryId: "cat-velas-aromaticas" },
  { slug: "quimera-pequena", name: "Quimera pequeña", categoryId: "cat-velas-aromaticas" },
  { slug: "chata", name: "Chata", categoryId: "cat-velas-aromaticas" },
  { slug: "gnomo", name: "Gnomo", categoryId: "cat-velas-aromaticas" },
  { slug: "carinito", name: "Cariñito", categoryId: "cat-velas-aromaticas" },
  { slug: "antojitos", name: "Antojitos", categoryId: "cat-velas-aromaticas" },
  { slug: "foforro", name: "Foforro", categoryId: "cat-velas-aromaticas" },
  { slug: "calderito", name: "Calderito", categoryId: "cat-velas-aromaticas" },
  { slug: "happy", name: "Happy", categoryId: "cat-wax-melts" },
  { slug: "halloween", name: "Halloween", categoryId: "cat-wax-melts" },
  { slug: "kit-brujas", name: "Kit brujas", categoryId: "cat-kits" },
  { slug: "kit-navidad", name: "Kit Navidad", categoryId: "cat-kits" },
];

export const draftCatalogProducts: CatalogProduct[] = references.map((reference) => ({
  id: `product-${reference.slug}`,
  slug: reference.slug,
  name: reference.name,
  description: "",
  categoryIds: [reference.categoryId],
  status: "draft",
  images: [],
  options: [],
  featured: false,
  createdAt,
  updatedAt: createdAt,
}));
