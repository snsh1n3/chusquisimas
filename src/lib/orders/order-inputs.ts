/**
 * Validación de pedidos que llegan desde la tienda pública.
 *
 * Todo lo que envía el navegador es no confiable: aquí solo se aceptan
 * identificadores de variante, cantidades y los datos mínimos del cliente.
 * Precios, nombres y disponibilidad se leen siempre de D1 en el servidor.
 */
import { ValidationError } from "../observability/errors.ts";
import { BOGOTA, COUNTRY, isColombianCity } from "../../data/colombia/municipalities.ts";

export const MAX_ORDER_LINES = 20;
export const MAX_LINE_QUANTITY = 20;
export const ORDER_RESERVATION_HOURS = 48;
export const SHIPPING_ZONES = ["local", "national"] as const;
export type ShippingZone = (typeof SHIPPING_ZONES)[number];

/** Versión del aviso de privacidad aceptado; cambia si cambia el texto. */
export const PRIVACY_NOTICE_VERSION = "2026-10-20";

export interface OrderLineInput {
  variantId: string;
  quantity: number;
}

export interface CustomerInput {
  name: string;
  phone: string;
  /** "Municipio, Departamento" (o "Bogotá D.C."), tal como se guarda en el pedido. */
  city: string;
}

/** Bogotá es envío local; cualquier otro municipio de Colombia, nacional. */
export function shippingZoneForCity(department: string): ShippingZone {
  return department === BOGOTA ? "local" : "national";
}

export function formatCustomerCity(department: string, city: string): string {
  return department === BOGOTA ? BOGOTA : `${city}, ${department}`;
}

export interface OrderInput {
  items: OrderLineInput[];
  customer: CustomerInput;
  shippingZone: ShippingZone;
}

const VARIANT_ID = /^[A-Za-z0-9_-]{1,100}$/;
// Letras, marcas, espacios y signos comunes en nombres y ciudades de Colombia.
const PERSON_TEXT = /^[\p{L}\p{M}0-9 .,'’()-]+$/u;

function cleanText(value: unknown, field: string, min: number, max: number): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${field}_invalid`, "Revisa los datos del formulario.");
  }
  const text = value.normalize("NFC").replace(/\s+/g, " ").trim();
  if (text.length < min || text.length > max || !PERSON_TEXT.test(text)) {
    throw new ValidationError(`${field}_invalid`, "Revisa los datos del formulario.");
  }
  return text;
}

/**
 * Celular colombiano en formato E.164 (+573XXXXXXXXX). Acepta espacios,
 * guiones, paréntesis y el prefijo 57 o +57.
 */
export function normalizeColombianMobile(value: unknown): string {
  if (typeof value !== "string" || value.length > 30) {
    throw new ValidationError("phone_invalid", "Escribe un número de WhatsApp de Colombia (10 dígitos).");
  }
  let digits = value.replace(/[\s().-]/g, "");
  if (digits.startsWith("+")) digits = digits.slice(1);
  if (!/^\d+$/.test(digits)) {
    throw new ValidationError("phone_invalid", "Escribe un número de WhatsApp de Colombia (10 dígitos).");
  }
  if (digits.length === 12 && digits.startsWith("57")) digits = digits.slice(2);
  if (!/^3\d{9}$/.test(digits)) {
    throw new ValidationError("phone_invalid", "Escribe un número de WhatsApp de Colombia (10 dígitos).");
  }
  return `+57${digits}`;
}

/** Une líneas repetidas de la misma variante y valida cantidades. */
export function validateOrderLines(value: unknown): OrderLineInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ValidationError("order_empty", "Tu carrito está vacío.");
  }
  if (value.length > MAX_ORDER_LINES) {
    throw new ValidationError("order_too_many_lines", `El pedido admite hasta ${MAX_ORDER_LINES} productos.`);
  }
  const merged = new Map<string, number>();
  for (const raw of value) {
    if (!raw || typeof raw !== "object") {
      throw new ValidationError("order_line_invalid", "Revisa los productos del carrito.");
    }
    const { variantId, quantity } = raw as Record<string, unknown>;
    if (typeof variantId !== "string" || !VARIANT_ID.test(variantId) ||
        typeof quantity !== "number" || !Number.isSafeInteger(quantity) || quantity < 1) {
      throw new ValidationError("order_line_invalid", "Revisa los productos del carrito.");
    }
    const total = (merged.get(variantId) ?? 0) + quantity;
    if (total > MAX_LINE_QUANTITY) {
      throw new ValidationError("order_quantity_invalid",
        `Puedes pedir hasta ${MAX_LINE_QUANTITY} unidades de cada producto.`);
    }
    merged.set(variantId, total);
  }
  return [...merged].map(([variantId, quantity]) => ({ variantId, quantity }));
}

export function validateOrderInput(value: unknown): OrderInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationError("body_not_object", "Solicitud inválida.");
  }
  const body = value as Record<string, unknown>;
  if (body.privacyConsent !== true) {
    throw new ValidationError("privacy_consent_missing",
      "Para registrar el pedido debes autorizar el tratamiento de tus datos.");
  }
  const customer = body.customer;
  if (!customer || typeof customer !== "object") {
    throw new ValidationError("customer_invalid", "Revisa los datos del formulario.");
  }
  const c = customer as Record<string, unknown>;
  if (c.country !== COUNTRY.code) {
    throw new ValidationError("customer_country_invalid", "Por ahora solo enviamos dentro de Colombia.");
  }
  if (typeof c.department !== "string" || typeof c.city !== "string" ||
      !isColombianCity(c.department, c.city)) {
    throw new ValidationError("customer_city_invalid", "Elige el departamento y el municipio de la lista.");
  }
  return {
    items: validateOrderLines(body.items),
    customer: {
      name: cleanText(c.name, "customer_name", 2, 80),
      phone: normalizeColombianMobile(c.phone),
      city: formatCustomerCity(c.department, c.city),
    },
    // La zona la decide el servidor según el municipio, no el navegador.
    shippingZone: shippingZoneForCity(c.department),
  };
}

// Sin 0/O, 1/I/L para que el código se pueda dictar y copiar sin errores.
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/** Código público del pedido, aleatorio y no consecutivo (p. ej. CH-7K3P9Q). */
export function generateOrderCode(random: (bytes: Uint8Array) => Uint8Array =
  (bytes) => crypto.getRandomValues(bytes)): string {
  // Muestreo por rechazo: solo se usan bytes por debajo del mayor múltiplo del
  // alfabeto (248 = 31 × 8), así cada carácter tiene la misma probabilidad.
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let code = "";
  while (code.length < 6) {
    for (const byte of random(new Uint8Array(16))) {
      if (byte < limit) code += CODE_ALPHABET.charAt(byte % CODE_ALPHABET.length);
      if (code.length === 6) break;
    }
  }
  return `CH-${code}`;
}

export const ORDER_CODE_PATTERN = /^CH-[2-9A-HJKMNP-Z]{6}$/;
