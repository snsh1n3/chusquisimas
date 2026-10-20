/**
 * Cotización del carrito para la tienda pública.
 *
 * Devuelve nombres, precios y disponibilidad públicos (sin existencias), con
 * la misma regla del catálogo: hay unidades → entrega inmediata; no hay pero
 * se fabrica → bajo pedido. La cantidad exacta se decide al crear el pedido.
 */
import type { PublicAvailability } from "../catalog/public-catalog.ts";
import type { OrderLineInput } from "./order-inputs.ts";
import type { OrdersDatabase } from "./order-db.ts";
import { listShippingZones, type ShippingZoneView } from "./shipping-service.ts";

export interface QuoteLine {
  variantId: string;
  productName: string;
  productSlug: string;
  label: string;
  aroma: string | null;
  unitPriceCOP: number;
  quantity: number;
  availability: PublicAvailability;
  preparationDays: number | null;
  imageId: string | null;
}

export interface CartQuote {
  lines: QuoteLine[];
  /** Variantes del carrito que ya no se venden (se quitan en el navegador). */
  unavailable: string[];
  shippingZones: ShippingZoneView[];
}

interface Row {
  id: string; product_name: string; product_slug: string; label: string; aroma: string | null;
  price_cop: number; on_hand: number; reserved: number; allow_made_to_order: number;
  preparation_days: number; image_id: string | null;
}

export async function quoteCart(db: OrdersDatabase, items: OrderLineInput[]): Promise<CartQuote> {
  const placeholders = items.map(() => "?").join(",");
  const { results } = await db.prepare(`
    SELECT v.id, p.name AS product_name, p.slug AS product_slug, v.label, a.name AS aroma,
      v.price_cop, v.on_hand, v.reserved, v.allow_made_to_order, v.preparation_days,
      (SELECT i.id FROM store_product_images i WHERE i.product_id = p.id
        ORDER BY i.sort_order, i.id LIMIT 1) AS image_id
    FROM store_variants v
    JOIN store_products p ON p.id = v.product_id
    LEFT JOIN store_aromas a ON a.id = v.aroma_id
    WHERE v.id IN (${placeholders})
      AND v.status = 'active' AND p.status = 'active' AND v.price_cop IS NOT NULL
  `).bind(...items.map((item) => item.variantId)).all<Row>();
  const byId = new Map(results.map((row) => [row.id, row]));

  const lines: QuoteLine[] = [];
  const unavailable: string[] = [];
  for (const item of items) {
    const row = byId.get(item.variantId);
    if (!row) { unavailable.push(item.variantId); continue; }
    const hasStock = row.on_hand - row.reserved > 0;
    const availability: PublicAvailability = hasStock ? "ready_to_ship"
      : row.allow_made_to_order === 1 ? "made_to_order" : "out_of_stock";
    lines.push({
      variantId: row.id,
      productName: row.product_name,
      productSlug: row.product_slug,
      label: row.label,
      aroma: row.aroma,
      unitPriceCOP: row.price_cop,
      quantity: item.quantity,
      availability,
      preparationDays: availability === "made_to_order" ? row.preparation_days : null,
      imageId: row.image_id ? row.image_id.toLowerCase() : null,
    });
  }
  return { lines, unavailable, shippingZones: await listShippingZones(db) };
}
