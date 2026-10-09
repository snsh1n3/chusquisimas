/** Inputs for future authenticated D1 mutations. These functions do not write data. */
export interface InventoryEdit {
  variantId: string;
  onHand: number;
  reason: string;
}

export interface PriceEdit {
  variantId: string;
  priceCOP: number | null;
}

export function validateInventoryEdit(input: InventoryEdit): InventoryEdit {
  const variantId = input.variantId.trim();
  const reason = input.reason.trim();
  if (!variantId || variantId.length > 120) throw new Error("Variante inválida.");
  if (!Number.isSafeInteger(input.onHand) || input.onHand < 0) {
    throw new Error("Las existencias deben ser un entero no negativo.");
  }
  if (reason.length < 3 || reason.length > 500) {
    throw new Error("Indica el motivo del ajuste (3 a 500 caracteres).");
  }
  return { variantId, onHand: input.onHand, reason };
}

export function validatePriceEdit(input: PriceEdit): PriceEdit {
  const variantId = input.variantId.trim();
  if (!variantId || variantId.length > 120) throw new Error("Variante inválida.");
  if (input.priceCOP !== null &&
    (!Number.isSafeInteger(input.priceCOP) || input.priceCOP < 0)) {
    throw new Error("Precio COP inválido.");
  }
  return { variantId, priceCOP: input.priceCOP };
}

/** Quantity-sensitive status for each requested purchase, never a stock reservation. */
export function resolveFulfillment(
  onHand: number,
  reserved: number,
  quantity: number,
  allowMadeToOrder: boolean,
  preparationDays: number
): "ready_stock" | "made_to_order" | "unavailable" {
  if (![onHand, reserved, quantity, preparationDays].every(Number.isSafeInteger) ||
      onHand < 0 || reserved < 0 || reserved > onHand ||
      quantity < 1 || preparationDays < 0) {
    throw new Error("Inventario o cantidad inválidos.");
  }
  if (onHand - reserved >= quantity) return "ready_stock";
  return allowMadeToOrder ? "made_to_order" : "unavailable";
}
