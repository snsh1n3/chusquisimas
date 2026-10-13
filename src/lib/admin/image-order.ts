/**
 * Orden de fotografías de un producto. La primera es la foto principal.
 * Funciones puras: calculan el nuevo orden sin tocar la base.
 */
import { ConflictError, ValidationError } from "../observability/errors.ts";

export type ImageOrderAction =
  | { type: "move"; imageId: string; direction: "up" | "down" }
  | { type: "primary"; imageId: string };

export const MAX_IMAGES_PER_PRODUCT = 20;

const IMAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidImageId(value: unknown): value is string {
  return typeof value === "string" && IMAGE_ID.test(value);
}

/** Valida la lista de ids que el panel cree vigente (control de concurrencia). */
export function parseExpectedOrder(value: unknown): string[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_IMAGES_PER_PRODUCT ||
      !value.every(isValidImageId) || new Set(value).size !== value.length) {
    throw new ValidationError("image_order_invalid", "Orden de fotografías inválido.");
  }
  return value.map((id) => id.toLowerCase());
}

export function sameOrder(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((id, index) => id.toLowerCase() === b[index].toLowerCase());
}

/** Exige que el orden visto en el panel coincida con el de D1. */
export function assertCurrentOrder(current: readonly string[], expected: readonly string[]): void {
  if (!sameOrder(current, expected)) {
    throw new ConflictError(
      "Las fotografías cambiaron en otra sesión. Recarga la página e inténtalo otra vez.",
      "image_order_conflict"
    );
  }
}

/** Devuelve el nuevo orden; si la acción no cambia nada, devuelve una copia igual. */
export function applyImageOrder(current: readonly string[], action: ImageOrderAction): string[] {
  const order = current.map((id) => id.toLowerCase());
  const index = order.indexOf(action.imageId.toLowerCase());
  if (index === -1) throw new ValidationError("image_not_in_product", "La fotografía no pertenece al producto.");

  if (action.type === "primary") {
    if (index === 0) return order;
    const [moved] = order.splice(index, 1);
    return [moved, ...order];
  }
  const target = action.direction === "up" ? index - 1 : index + 1;
  if (target < 0 || target >= order.length) return order;
  [order[index], order[target]] = [order[target], order[index]];
  return order;
}

/** Clave R2 de la miniatura, derivada de la clave principal (no se guarda en D1). */
export function thumbnailKeyFor(storageKey: string): string {
  if (!storageKey.endsWith(".webp")) {
    throw new ValidationError("image_key_invalid", "Clave de imagen inválida.");
  }
  return `${storageKey.slice(0, -".webp".length)}-thumb.webp`;
}
