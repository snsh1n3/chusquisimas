/**
 * Lectura acotada de cuerpos JSON para route handlers: tipo de contenido,
 * tamaño declarado y real, y JSON válido. Lanza ValidationError o devuelve
 * una respuesta lista (415/413) para que la ruta la retorne tal cual.
 */
import { ValidationError } from "../observability/errors.ts";

export type JsonBodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Lee el cuerpo como texto UTF-8 sin pasar de `maxBytes` bytes reales.
 * Rechaza un Content-Length declarado mayor o inválido antes de leer y, si
 * falta (chunked/HTTP2), cuenta bytes mientras lee y cancela el flujo al
 * superar el límite. Devuelve null cuando el cuerpo es demasiado grande.
 */
export async function readBodyTextWithin(request: Request, maxBytes: number): Promise<string | null> {
  const declared = request.headers.get("content-length");
  if (declared !== null) {
    const length = Number(declared);
    if (!/^\d+$/.test(declared.trim()) || !Number.isSafeInteger(length) || length > maxBytes) return null;
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const chunk = await reader.read();
    if (chunk.done) break;
    const value = chunk.value;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** JSON.parse que responde 400 (validación) en lugar de un 500 interno. */
export function parseJsonText(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new ValidationError("body_json_invalid", "Solicitud inválida.", { cause: error });
  }
}

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: Response.json({ error: "Formato inválido" }, { status: 415, headers: NO_STORE }) };
  }
  const raw = await readBodyTextWithin(request, maxBytes);
  if (raw === null) {
    return { ok: false, response: Response.json({ error: "Solicitud demasiado grande" }, { status: 413, headers: NO_STORE }) };
  }
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    throw new ValidationError("body_json_invalid", "Solicitud inválida.", { cause: error });
  }
}

/**
 * Las mutaciones públicas deben venir de la propia tienda. Se acepta el
 * origen del dominio y el de la propia solicitud (desarrollo local).
 */
export function isSameSiteOrigin(request: Request, siteUrl: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  return origin === new URL(siteUrl).origin || origin === new URL(request.url).origin;
}
