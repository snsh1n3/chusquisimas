/**
 * Lectura acotada de cuerpos JSON para route handlers: tipo de contenido,
 * tamaño declarado y real, y JSON válido. Lanza ValidationError o devuelve
 * una respuesta lista (415/413) para que la ruta la retorne tal cual.
 */
import { ValidationError } from "../observability/errors.ts";

export type JsonBodyResult = { ok: true; value: unknown } | { ok: false; response: Response };

const NO_STORE = { "Cache-Control": "no-store" } as const;

export async function readJsonBody(request: Request, maxBytes: number): Promise<JsonBodyResult> {
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return { ok: false, response: Response.json({ error: "Formato inválido" }, { status: 415, headers: NO_STORE }) };
  }
  if (Number(request.headers.get("content-length") ?? "0") > maxBytes) {
    return { ok: false, response: Response.json({ error: "Solicitud demasiado grande" }, { status: 413, headers: NO_STORE }) };
  }
  const raw = await request.text();
  if (raw.length > maxBytes) {
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
