/**
 * Verificación de Cloudflare Turnstile en el servidor (Siteverify).
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 *
 * El token del navegador nunca se da por bueno sin esta llamada.
 */
import { UpstreamError, ValidationError } from "../observability/errors.ts";

export const TURNSTILE_SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
export const TURNSTILE_ACTION = "order";

interface SiteverifyResponse {
  success: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
}

/**
 * Claves secretas de prueba documentadas por Cloudflare (1x… siempre aprueba,
 * 2x… siempre rechaza, 3x… token ya usado). Solo valen en desarrollo local.
 */
export function isTurnstileTestSecret(secret: string): boolean {
  return /^[123]x0{31}AA$/.test(secret.trim());
}

/** IP de bucle local (wrangler dev) o ausente: nunca ocurre detrás de Cloudflare. */
export function isLocalClient(ip: string | null | undefined): boolean {
  return !ip || ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
}

export async function verifyTurnstile(
  token: unknown,
  options: {
    secret: string;
    remoteIp?: string | null;
    idempotencyKey?: string;
    fetchImpl?: typeof fetch;
    /** Hostnames donde vive el widget; con clave real, el token debe venir de uno de ellos. */
    expectedHostnames?: readonly string[];
  }
): Promise<void> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2048) {
    throw new ValidationError("turnstile_missing", "Confirma la verificación de seguridad e inténtalo de nuevo.");
  }
  const body = new FormData();
  body.append("secret", options.secret);
  body.append("response", token);
  if (options.remoteIp) body.append("remoteip", options.remoteIp);
  if (options.idempotencyKey) body.append("idempotency_key", options.idempotencyKey);

  let result: SiteverifyResponse;
  try {
    const response = await (options.fetchImpl ?? fetch)(TURNSTILE_SITEVERIFY_URL, { method: "POST", body });
    if (!response.ok) throw new Error(`siteverify HTTP ${response.status}`);
    result = await response.json() as SiteverifyResponse;
  } catch (error) {
    throw new UpstreamError("turnstile_unavailable", "No pudimos verificar la solicitud. Inténtalo de nuevo.",
      { cause: error });
  }
  const failed = (reason: string) => new ValidationError(`turnstile_failed:${reason}`,
    "La verificación de seguridad falló. Recarga la página e inténtalo de nuevo.");
  if (!result.success) throw failed((result["error-codes"] ?? []).join(",") || "unknown");
  // Las claves de prueba devuelven action vacía y hostname genérico; con la
  // clave real se exige la acción del widget y que el token sea de la tienda.
  if (isTurnstileTestSecret(options.secret)) return;
  if (result.action !== TURNSTILE_ACTION) throw failed("action");
  if (options.expectedHostnames && !options.expectedHostnames.includes(result.hostname ?? "")) {
    throw failed("hostname");
  }
}
