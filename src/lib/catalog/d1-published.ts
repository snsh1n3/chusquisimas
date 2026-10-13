import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CatalogProduct, ProductVariant } from "@/types/catalog";
import { toPublicCatalog, type PublicCatalog, type PublicProduct, type PublicVariant } from "./public-catalog";
import { publicImagePaths } from "./image-delivery";

interface Row {
  id: string; slug: string; name: string; description: string;
  status: "active"; featured: number; created_at: string; updated_at: string;
}
interface VariantRow {
  id: string; product_id: string; sku: string; status: "active" | "inactive";
  price_cop: number; on_hand: number; reserved: number;
  label: string; aroma_name: string | null;
  allow_made_to_order: number; preparation_days: number;
}
interface CategoryRow { product_id: string; category_id: string; }
interface ImageRow { id: string; product_id: string; alt_text: string; sort_order: number; }

/**
 * Catálogo publicado con datos internos (incluye on_hand/reserved).
 * Uso exclusivo del servidor: para la tienda usa getPublicCatalog().
 */
/** "Combo x3 · Café", "Café" o "Combo x3", según lo que tenga la variante. */
function variantLabel(v: Pick<VariantRow, "label" | "aroma_name">): string {
  const label = v.label?.trim() ?? "";
  const aroma = v.aroma_name?.trim() ?? "";
  if (label && aroma && !label.toLowerCase().includes(aroma.toLowerCase())) return `${label} · ${aroma}`;
  return label || aroma;
}

export async function getPublishedCatalog(): Promise<{
  products: CatalogProduct[]; variants: ProductVariant[];
}> {
  const context = await getCloudflareContext({ async: true });
  const db = (context.env as typeof context.env & { DB: D1Database }).DB;
  if (!db) throw Error("Catálogo no disponible");
  // Fail closed: products with no priced active variant are not for sale.
  const [productsResult, variantsResult, categoriesResult, imagesResult] = await Promise.all([
    db.prepare(`SELECT id,slug,name,description,status,featured,created_at,updated_at
      FROM store_products p WHERE status='active'
      AND EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
        AND v.status='active' AND v.price_cop IS NOT NULL)
      ORDER BY featured DESC,name COLLATE NOCASE`).all<Row>(),
    db.prepare(`SELECT v.id,v.product_id,v.sku,v.status,v.price_cop,v.on_hand,v.reserved,
      v.allow_made_to_order,v.preparation_days,v.label,a.name AS aroma_name FROM store_variants v
      JOIN store_products p ON p.id=v.product_id
      LEFT JOIN store_aromas a ON a.id=v.aroma_id
      WHERE p.status='active' AND v.status='active' AND v.price_cop IS NOT NULL
      ORDER BY v.price_cop, v.label COLLATE NOCASE`).all<VariantRow>(),
    db.prepare(`SELECT pc.product_id,pc.category_id FROM store_product_categories pc
      JOIN store_products p ON p.id=pc.product_id WHERE p.status='active'`).all<CategoryRow>(),
    db.prepare(`SELECT i.id,i.product_id,i.alt_text,i.sort_order FROM store_product_images i
      JOIN store_products p ON p.id=i.product_id WHERE p.status='active'
      ORDER BY i.sort_order,i.id`).all<ImageRow>(),
  ]);
  const products: CatalogProduct[] = productsResult.results.map(p => ({
    id: p.id, slug: p.slug, name: p.name, description: p.description,
    categoryIds: categoriesResult.results.filter(x => x.product_id === p.id).map(x => x.category_id),
    status: "active", images: imagesResult.results.filter(i => i.product_id === p.id).map(i => ({
      id: i.id, ...publicImagePaths(i.id), alt: i.alt_text, sortOrder: i.sort_order,
    })), options: [], featured: p.featured === 1,
    createdAt: p.created_at, updatedAt: p.updated_at,
  }));
  const variants: ProductVariant[] = variantsResult.results.map(v => ({
    id: v.id, productId: v.product_id, sku: v.sku, label: variantLabel(v), optionSelections: [],
    price: { currency: "COP", amount: v.price_cop }, status: v.status,
    imageIds: [],
    fulfillmentPolicies: [
      { mode: "ready_stock" as const, inventory: {
        onHand: v.on_hand, reserved: v.reserved, trackInventory: true,
      } },
      ...(v.allow_made_to_order === 1 ? [{
        mode: "made_to_order" as const, preparationDaysMin: v.preparation_days,
        preparationDaysMax: v.preparation_days,
      }] : []),
    ],
  }));
  return { products, variants };
}

/**
 * Catálogo listo para la tienda: sin cantidades de inventario.
 * Es lo único que deben recibir páginas y componentes públicos.
 */
export async function getPublicCatalog(): Promise<PublicCatalog> {
  return toPublicCatalog(await getPublishedCatalog());
}

/** Un producto publicado por slug, con sus variantes públicas; null si no está a la venta. */
export async function getPublicProductBySlug(
  slug: string
): Promise<{ product: PublicProduct; variants: PublicVariant[] } | null> {
  if (!/^[a-z0-9-]{1,140}$/.test(slug)) return null;
  const catalog = await getPublicCatalog();
  const product = catalog.products.find((item) => item.slug === slug);
  if (!product) return null;
  return { product, variants: catalog.variants.filter((variant) => variant.productId === product.id) };
}
