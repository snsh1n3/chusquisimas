/**
 * Carrito en el navegador (localStorage). Guarda solo variante y cantidad:
 * nombres, precios y disponibilidad se piden al servidor al mostrarlo.
 *
 * Si el almacenamiento no está disponible (modo privado, bloqueado), el
 * carrito funciona en memoria durante la visita.
 */
import { MAX_LINE_QUANTITY, MAX_ORDER_LINES, type OrderLineInput } from "../orders/order-inputs.ts";

const STORAGE_KEY = "chusquisimas.cart.v1";
const CHANGE_EVENT = "chusquisimas:cart";
const EMPTY: readonly OrderLineInput[] = Object.freeze([]);

let memory: readonly OrderLineInput[] = EMPTY;
let cachedRaw: string | null | undefined;
let cachedValue: readonly OrderLineInput[] = EMPTY;

function sanitize(value: unknown): OrderLineInput[] {
  if (!Array.isArray(value)) return [];
  const lines: OrderLineInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const { variantId, quantity } = item as Record<string, unknown>;
    if (typeof variantId !== "string" || variantId.length > 100) continue;
    if (typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1) continue;
    lines.push({ variantId, quantity: Math.min(quantity, MAX_LINE_QUANTITY) });
    if (lines.length >= MAX_ORDER_LINES) break;
  }
  return lines;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Instantánea estable para useSyncExternalStore (misma referencia si no cambió). */
export function getCart(): readonly OrderLineInput[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = readRaw();
  if (raw === null) return memory;
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedValue = Object.freeze(sanitize(JSON.parse(raw)));
    } catch {
      cachedValue = EMPTY;
    }
  }
  return cachedValue;
}

export function getServerCart(): readonly OrderLineInput[] {
  return EMPTY;
}

function save(lines: OrderLineInput[]): void {
  const clean = Object.freeze(sanitize(lines));
  memory = clean;
  try {
    if (clean.length === 0) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify(clean));
  } catch {
    // Sin almacenamiento: queda en memoria.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeCart(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => { if (event.key === STORAGE_KEY) callback(); };
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", onStorage);
  };
}

/** Agrega unidades; devuelve false si el carrito ya tiene el máximo de productos. */
export function addToCart(variantId: string, quantity: number): boolean {
  const lines = [...getCart()];
  const existing = lines.findIndex((line) => line.variantId === variantId);
  if (existing >= 0) {
    lines[existing] = { variantId, quantity: Math.min(MAX_LINE_QUANTITY, lines[existing].quantity + quantity) };
  } else {
    if (lines.length >= MAX_ORDER_LINES) return false;
    lines.push({ variantId, quantity: Math.min(MAX_LINE_QUANTITY, quantity) });
  }
  save(lines);
  return true;
}

export function setCartQuantity(variantId: string, quantity: number): void {
  save(getCart().map((line) => line.variantId === variantId
    ? { variantId, quantity: Math.max(1, Math.min(MAX_LINE_QUANTITY, Math.trunc(quantity))) } : line));
}

export function removeFromCart(variantIds: readonly string[]): void {
  const remove = new Set(variantIds);
  save(getCart().filter((line) => !remove.has(line.variantId)));
}

export function clearCart(): void {
  save([]);
}

export function cartUnits(lines: readonly OrderLineInput[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}
