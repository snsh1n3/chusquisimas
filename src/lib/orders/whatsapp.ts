/** Solicitudes comerciales por WhatsApp: no confirman ni pagan pedidos. */
export const ORDERS_WHATSAPP_NUMBER = "573168205201";
export const STANDARD_PREPARATION_DAYS = 14;

export interface OrderRequestItem {
  name: string;
  quantity: number;
  aroma?: string;
  presentation?: string;
  unitPriceCOP?: number;
  deliveryMode: "ready_stock" | "made_to_order";
}

export function createOrderMessage(items: readonly OrderRequestItem[]): string {
  if (items.length === 0) throw new Error("El pedido no puede estar vacío.");
  let total = 0;
  let hasPendingPrice = false;
  const lines = [
    "Hola, quiero solicitar un pedido en Chusquisimas.",
    "",
  ];
  for (const [index, item] of items.entries()) {
    if (!item.name.trim()) throw new Error("El producto necesita nombre.");
    if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
      throw new Error("La cantidad debe ser un entero positivo.");
    }
    lines.push(`${index + 1}. ${item.name.trim()}`);
    if (item.aroma) lines.push(`   Aroma: ${item.aroma.trim()}`);
    if (item.presentation) lines.push(`   Presentación: ${item.presentation.trim()}`);
    lines.push(`   Cantidad: ${item.quantity}`);
    lines.push(item.deliveryMode === "ready_stock"
      ? "   Disponibilidad: Entrega inmediata, sujeto a confirmación"
      : `   Disponibilidad: Bajo pedido, preparación en ${STANDARD_PREPARATION_DAYS} días`);
    if (item.unitPriceCOP === undefined) {
      hasPendingPrice = true;
      lines.push("   Precio: Por confirmar");
    } else {
      if (!Number.isSafeInteger(item.unitPriceCOP) || item.unitPriceCOP < 0) {
        throw new Error("El precio COP debe ser un entero no negativo.");
      }
      const lineTotal = item.unitPriceCOP * item.quantity;
      if (!Number.isSafeInteger(lineTotal) || !Number.isSafeInteger(total + lineTotal)) {
        throw new Error("El valor del pedido supera el rango permitido.");
      }
      total += lineTotal;
      lines.push(`   Subtotal: ${formatCOP(lineTotal)}`);
    }
    lines.push("");
  }
  if (!hasPendingPrice) {
    lines.push(`Subtotal de productos: ${formatCOP(total)}`);
  } else {
    lines.push("Valor total: Pendiente de cotización");
  }
  lines.push("¿Me confirman disponibilidad, envío y medios de pago?");
  lines.push("Entiendo que el pedido no queda confirmado hasta recibir respuesta.");
  return lines.join("\n");
}

function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function createOrderWhatsAppUrl(items: readonly OrderRequestItem[]): string {
  return `https://wa.me/${ORDERS_WHATSAPP_NUMBER}?text=${encodeURIComponent(createOrderMessage(items))}`;
}
