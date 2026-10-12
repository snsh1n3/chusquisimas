/**
 * Registro estructurado para Cloudflare Workers Logs.
 *
 * Cada evento se emite como una línea JSON para que Workers Observability
 * indexe sus campos (requestId, operation, category...). El módulo no depende
 * de Next.js para poder probarse con el test runner de Node.
 *
 * Reglas de privacidad:
 * - Nunca se registran tokens, cabeceras, cuerpos de solicitud ni imágenes.
 * - Los mensajes de error se depuran (JWT, Bearer, correos) y se truncan.
 */

import { AppError, classifyError, type ErrorCategory } from "./errors.ts";

export type LogLevel = "debug" | "info" | "warn" | "error";

/** Valores permitidos en un evento: solo primitivos, sin objetos anidados arbitrarios. */
export type LogValue = string | number | boolean | null | undefined;
export type LogFields = Record<string, LogValue>;

export interface LogEntry extends LogFields {
  timestamp: string;
  level: LogLevel;
  event: string;
}

export type LogSink = (level: LogLevel, line: string) => void;

const MAX_MESSAGE_LENGTH = 300;
const MAX_STACK_LINES = 6;
const MAX_FIELD_LENGTH = 500;

const REDACTIONS: ReadonlyArray<[RegExp, string]> = [
  // JWT compactos (header.payload.signature)
  [/eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, "[jwt]"],
  // Cabeceras de autorización
  [/\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]{8,}/gi, "$1 [token]"],
  // Direcciones de correo
  [/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, "[email]"],
];

/** Elimina secretos conocidos y limita la longitud de un texto libre. */
export function redact(value: string, maxLength = MAX_MESSAGE_LENGTH): string {
  let output = value;
  for (const [pattern, replacement] of REDACTIONS) {
    output = output.replace(pattern, replacement);
  }
  return output.length > maxLength ? `${output.slice(0, maxLength)}…` : output;
}

export interface ErrorDetails extends LogFields {
  errorCategory: ErrorCategory;
  errorName: string;
  errorCode?: string;
  errorMessage: string;
  errorCause?: string;
  errorStack?: string;
}

/** Convierte cualquier valor lanzado en campos seguros para registrar. */
export function describeError(
  error: unknown,
  category: ErrorCategory = classifyError(error)
): ErrorDetails {
  if (!(error instanceof Error)) {
    return {
      errorCategory: category,
      errorName: typeof error,
      errorMessage: redact(String(error)),
    };
  }
  const details: ErrorDetails = {
    errorCategory: category,
    errorName: error.name,
    errorMessage: redact(error.message),
  };
  if (error instanceof AppError) details.errorCode = error.code;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause !== undefined) {
    details.errorCause = cause instanceof Error
      ? redact(`${cause.name}: ${cause.message}`)
      : redact(String(cause));
  }
  // La traza solo aporta en fallos inesperados; en rechazos esperados es ruido.
  if ((category === "internal" || category === "storage" || category === "upstream") && error.stack) {
    details.errorStack = redact(
      error.stack.split("\n").slice(0, MAX_STACK_LINES).join("\n"),
      2_000
    );
  }
  return details;
}

function sanitizeFields(fields: LogFields): LogFields {
  const clean: LogFields = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    clean[key] = typeof value === "string" ? redact(value, MAX_FIELD_LENGTH) : value;
  }
  return clean;
}

export const consoleSink: LogSink = (level, line) => {
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
};

export interface Logger {
  log(level: LogLevel, event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
  /** Devuelve un logger que añade los campos indicados a cada evento. */
  child(fields: LogFields): Logger;
}

export function createLogger(
  baseFields: LogFields = {},
  sink: LogSink = consoleSink,
  now: () => Date = () => new Date()
): Logger {
  const base = sanitizeFields(baseFields);
  const log = (level: LogLevel, event: string, fields: LogFields = {}) => {
    const entry: LogEntry = {
      ...base,
      ...sanitizeFields(fields),
      timestamp: now().toISOString(),
      level,
      event,
    };
    try {
      sink(level, JSON.stringify(entry));
    } catch {
      // El registro nunca debe romper la solicitud que se está atendiendo.
    }
  };
  return {
    log,
    info: (event, fields) => log("info", event, fields),
    warn: (event, fields) => log("warn", event, fields),
    error: (event, fields) => log("error", event, fields),
    child: (fields) => createLogger({ ...base, ...fields }, sink, now),
  };
}
