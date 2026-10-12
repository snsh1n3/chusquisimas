/**
 * Traducción única de errores a respuestas HTTP para la API administrativa.
 *
 * - Validación (400) y conflicto (409) devuelven el mensaje propio de la
 *   aplicación: son textos fijos, útiles para quien administra y sin datos
 *   internos.
 * - Autenticación y configuración devuelven 403 genérico, sin revelar si
 *   falló el JWT, el permiso o un binding.
 * - Cualquier otro error es un fallo interno: 500 genérico con requestId para
 *   poder ubicarlo en Workers Logs.
 *
 * Siempre registra el error antes de responder.
 */

import {
  AppError,
  classifyError,
  type ErrorCategory,
} from "../observability/errors.ts";
import type { LogFields } from "../observability/logger.ts";
import type { RequestContext } from "../observability/with-api-logging.ts";

const NO_STORE = { "Cache-Control": "no-store" } as const;

export const GENERIC_REJECTION = "Solicitud rechazada";
export const GENERIC_INTERNAL_ERROR = "Error interno. Intenta de nuevo más tarde.";

export function adminErrorResponse(
  error: unknown,
  context: Pick<RequestContext, "fail" | "requestId">,
  fields?: LogFields
): Response {
  const category: ErrorCategory = classifyError(error);
  context.fail(error, category, fields);

  switch (category) {
    case "validation":
      return Response.json(
        { error: error instanceof AppError ? error.message : "Datos inválidos" },
        { status: 400, headers: NO_STORE }
      );
    case "conflict":
      return Response.json(
        { error: error instanceof AppError ? error.message : "Conflicto" },
        { status: 409, headers: NO_STORE }
      );
    case "not_found":
      return Response.json({ error: "No encontrado" }, { status: 404, headers: NO_STORE });
    case "auth":
    case "configuration":
      return Response.json({ error: GENERIC_REJECTION }, { status: 403, headers: NO_STORE });
    default:
      return Response.json(
        { error: GENERIC_INTERNAL_ERROR, requestId: context.requestId },
        { status: 500, headers: NO_STORE }
      );
  }
}
