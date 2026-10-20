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

export async function verifyTurnstile(
  token: unknown,
  options: {
    secret: string;
    remoteIp?: string | null;
    idempotencyKey?: string;
    fetchImpl?: typeof fetch;
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
  // Las claves de prueba de Cloudflare devuelven action vacía; las reales, la del widget.
  if (!result.success || (result.action && result.action !== TURNSTILE_ACTION)) {
    throw new ValidationError(`turnstile_failed:${(result["error-codes"] ?? []).join(",") || "unknown"}`,
      "La verificación de seguridad falló. Recarga la página e inténtalo de nuevo.");
  }
}
