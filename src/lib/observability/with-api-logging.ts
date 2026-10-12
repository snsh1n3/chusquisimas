/**
 * Envoltorio de observabilidad para route handlers.
 *
 * - Asigna un identificador de solicitud (cf-ray si es válido, si no un UUID)
 *   y lo devuelve en la cabecera X-Request-Id para correlacionar reportes.
 * - Registra un evento de cierre con operación, estado y duración.
 * - Las rutas registran sus fallos capturados con `ctx.fail(...)` y siguen
 *   respondiendo mensajes genéricos al navegador.
 * - Un error no capturado se registra y se responde con 500 genérico.
 *
 * Usa solo Request/Response estándar para no depender de Next.js en pruebas.
 */

import type { ErrorCategory } from "./errors.ts";
import {
  consoleSink,
  createLogger,
  describeError,
  type LogFields,
  type Logger,
  type LogLevel,
  type LogSink,
} from "./logger.ts";

export interface RequestContext {
  readonly requestId: string;
  readonly logger: Logger;
  /** Registra un error capturado. La respuesta al cliente la decide la ruta. */
  fail(error: unknown, category?: ErrorCategory, fields?: LogFields): void;
}

export interface ApiLoggingOptions {
  sink?: LogSink;
  clock?: () => number;
  idFactory?: () => string;
}

const CF_RAY_PATTERN = /^[0-9a-f]{16}(-[A-Z]{3,4})?$/i;
const SEVERE_CATEGORIES: ReadonlySet<ErrorCategory> = new Set([
  "internal", "storage", "upstream", "configuration",
]);

export function resolveRequestId(
  request: Request,
  idFactory: () => string = () => crypto.randomUUID()
): string {
  const ray = request.headers.get("cf-ray")?.trim();
  return ray && CF_RAY_PATTERN.test(ray) ? ray : idFactory();
}

function safePathname(request: Request): string {
  try {
    // Solo la ruta: los parámetros de consulta pueden contener datos personales.
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function withRequestIdHeader(response: Response, requestId: string): Response {
  try {
    response.headers.set("X-Request-Id", requestId);
    return response;
  } catch {
    // Algunas respuestas tienen cabeceras inmutables: se clona la envoltura.
    const copy = new Response(response.body, response);
    copy.headers.set("X-Request-Id", requestId);
    return copy;
  }
}

function completionLevel(status: number, failure: ErrorCategory | undefined): LogLevel {
  if (status >= 500 || (failure && SEVERE_CATEGORIES.has(failure))) return "error";
  if (status >= 400) return "warn";
  return "info";
}

export function withApiLogging<R extends Request, A extends unknown[]>(
  operation: string,
  handler: (request: R, context: RequestContext, ...args: A) => Promise<Response>,
  options: ApiLoggingOptions = {}
): (request: R, ...args: A) => Promise<Response> {
  const sink = options.sink ?? consoleSink;
  const clock = options.clock ?? (() => Date.now());

  return async (request: R, ...args: A): Promise<Response> => {
    const startedAt = clock();
    const requestId = resolveRequestId(request, options.idFactory);
    const logger = createLogger({
      requestId,
      operation,
      method: request.method,
      path: safePathname(request),
    }, sink);
    let failure: ErrorCategory | undefined;

    const context: RequestContext = {
      requestId,
      logger,
      fail(error, category, fields = {}) {
        const details = describeError(error, category);
        failure = details.errorCategory;
        logger.log(
          SEVERE_CATEGORIES.has(details.errorCategory) ? "error" : "warn",
          "api.error",
          { ...fields, ...details }
        );
      },
    };

    let response: Response;
    try {
      response = await handler(request, context, ...args);
    } catch (error) {
      context.fail(error, "internal", { unhandled: true });
      response = Response.json(
        { error: "Error interno. Intenta de nuevo más tarde." },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    logger.log(completionLevel(response.status, failure), "api.request", {
      status: response.status,
      durationMs: Math.max(0, Math.round(clock() - startedAt)),
      outcome: response.status < 400 ? "ok" : response.status >= 500 ? "error" : "rejected",
      errorCategory: failure,
    });
    return withRequestIdHeader(response, requestId);
  };
}
