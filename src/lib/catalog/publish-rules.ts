/**
 * Regla única de "a la venta": producto activo y variante activa con precio.
 *
 * Fragmento SQL que exige los alias `v` (store_variants) y `p`
 * (store_products). Lo comparten el catálogo público, las imágenes públicas,
 * la cotización del carrito y la creación de pedidos, para que nunca diverjan.
 */
export const PUBLISHED_VARIANT_SQL = "v.status = 'active' AND p.status = 'active' AND v.price_cop IS NOT NULL";
