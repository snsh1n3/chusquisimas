/**
 * Mensaje de WhatsApp de un pedido ya registrado en D1. Lo envía el cliente
 * desde su teléfono; el número de pedido permite ubicarlo en el panel.
 */
import { formatPriceCOP } from "../../types/catalog.ts";
import { ORDER_RESERVATION_HOURS } from "./order-inputs.ts";
import type { CreatedOrder } from "./order-service.ts";
import { ORDERS_WHATSAPP_NUMBER } from "./whatsapp.ts";

export function createRegisteredOrderMessage(order: CreatedOrder): string {
  const lines = [
    `Hola, acabo de hacer el pedido ${order.code} en chusquisimas.com.`,
    "",
  ];
  order.lines.forEach((line, index) => {
    lines.push(`${index + 1}. ${line.productName}`);
    if (line.aroma) lines.push(`   Aroma: ${line.aroma}`);
    if (line.variantLabel && line.variantLabel.toLowerCase() !== (line.aroma ?? "").toLowerCase()) {
      lines.push(`   Presentación: ${line.variantLabel}`);
    }
    lines.push(`   Cantidad: ${line.quantity}`);
    lines.push(line.fulfillment === "ready_stock"
      ? `   Entrega inmediata (unidades apartadas por ${ORDER_RESERVATION_HOURS} horas)`
      : `   Bajo pedido: preparación en ${line.preparationDays ?? 14} días`);
    lines.push(`   Subtotal: ${formatPriceCOP(line.unitPriceCOP * line.quantity)}`);
    lines.push("");
  });
  lines.push(`Productos: ${formatPriceCOP(order.subtotalCOP)}`);
  if (order.shippingCOP === null) {
    lines.push(`${order.shippingLabel}: por confirmar`);
    lines.push(`Total sin envío: ${formatPriceCOP(order.subtotalCOP)}`);
  } else {
    lines.push(`${order.shippingLabel}: ${formatPriceCOP(order.shippingCOP)}`);
    lines.push(`Total: ${formatPriceCOP(order.subtotalCOP + order.shippingCOP)}`);
  }
  lines.push("");
  lines.push(`Nombre: ${order.customer.name}`);
  lines.push(`Ciudad: ${order.customer.city}`);
  lines.push("");
  lines.push("¿Me confirman la dirección de envío y el medio de pago?");
  return lines.join("\n");
}

export function createRegisteredOrderWhatsAppUrl(order: CreatedOrder): string {
  return `https://wa.me/${ORDERS_WHATSAPP_NUMBER}?text=${encodeURIComponent(createRegisteredOrderMessage(order))}`;
}
