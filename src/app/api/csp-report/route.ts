import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  CSP_REPORT_CONTENT_TYPES, MAX_CSP_REPORT_BYTES, parseCspReports,
} from "@/lib/security/csp-report";
import { readBodyTextWithin } from "@/lib/http/json-body";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const NO_CONTENT = () => new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });

/**
 * Receptor de reportes CSP (modo Report-Only). Es público por diseño: los
 * navegadores lo llaman sin credenciales. Por eso limita tamaño y cantidad,
 * no devuelve información y solo registra campos depurados.
 */
export const POST = withApiLogging("public.csp.report", async (request: NextRequest, ctx) => {
  const type = (request.headers.get("content-type") ?? "").toLowerCase().split(";")[0].trim();
  if (!(CSP_REPORT_CONTENT_TYPES as readonly string[]).includes(type)) {
    return new Response(null, { status: 415 });
  }
  // Cupo por IP (mismo limitador que los pedidos, con otra clave): por encima
  // se descartan en silencio para que nadie infle el volumen de registros.
  const { env } = await getCloudflareContext({ async: true });
  const limiter = (env as unknown as { ORDER_RATE_LIMITER?: RateLimiter }).ORDER_RATE_LIMITER;
  if (limiter) {
    const ip = request.headers.get("cf-connecting-ip") ?? "sin-ip";
    const { success } = await limiter.limit({ key: `csp:${ip}` });
    if (!success) return NO_CONTENT();
  }
  const raw = await readBodyTextWithin(request, MAX_CSP_REPORT_BYTES);
  if (raw === null) return new Response(null, { status: 413 });

  const violations = (() => {
    try {
      return parseCspReports(raw);
    } catch (error) {
      ctx.fail(error, "validation");
      return null;
    }
  })();
  if (violations === null) return new Response(null, { status: 400 });
  for (const violation of violations) {
    ctx.logger.warn("csp.violation", {
      documentPath: violation.documentPath,
      directive: violation.directive,
      blocked: violation.blocked,
      disposition: violation.disposition,
      sourceFile: violation.sourceFile,
      line: violation.line,
    });
  }
  return NO_CONTENT();
});
