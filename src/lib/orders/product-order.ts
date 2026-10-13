/**
 * Pedido de un producto desde su página: convierte la selección del cliente
 * (variante pública + cantidad) en el enlace de WhatsApp.
 *
 * Solo usa la proyección pública: el cliente nunca conoce existencias exactas,
 * por eso "entrega inmediata" siempre queda sujeta a confirmación.
 */
import type { PublicVariant } from "../catalog/public-catalog.ts";
import { ValidationError } from "../observability/errors.ts";
import { STANDARD_PREPARATION_DAYS, createOrderWhatsAppUrl } from "./whatsapp.ts";

export const MAX_ORDER_QUANTITY = 20;
const DEFAULT_LABEL = "Presentación única";

export function isOrderable(variant: PublicVariant): boolean {
  return variant.availability === "ready_to_ship" || variant.availability === "made_to_order";
}

export function availabilityText(variant: PublicVariant): string {
  switch (variant.availability) {
    case "ready_to_ship":
      return "Entrega inmediata";
    case "made_to_order":
      return `Bajo pedido · entrega en ${variant.preparationDays ?? STANDARD_PREPARATION_DAYS} días`;
    default:
      return "Agotado por ahora";
  }
}

export function clampQuantity(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(MAX_ORDER_QUANTITY, Math.max(1, Math.trunc(value)));
}

export function buildProductOrderUrl(
  productName: string,
  variant: PublicVariant,
  quantity: number
): string {
  if (!isOrderable(variant)) {
    throw new ValidationError("variant_not_orderable", "Esta presentación no está disponible.");
  }
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > MAX_ORDER_QUANTITY) {
    throw new ValidationError("order_quantity_invalid", `La cantidad debe estar entre 1 y ${MAX_ORDER_QUANTITY}.`);
  }
  return createOrderWhatsAppUrl([{
    name: productName,
    quantity,
    presentation: variant.label && variant.label !== DEFAULT_LABEL ? variant.label : undefined,
    unitPriceCOP: variant.price.amount,
    deliveryMode: variant.availability === "ready_to_ship" ? "ready_stock" : "made_to_order",
  }]);
}
