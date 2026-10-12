/**
 * Clasificación de errores para observabilidad.
 *
 * Las respuestas al navegador siguen siendo genéricas: estas categorías solo
 * se usan en los registros internos para saber qué falló sin revelarlo.
 */

export const ERROR_CATEGORIES = [
  "auth",
  "validation",
  "conflict",
  "not_found",
  "configuration",
  "upstream",
  "storage",
  "internal",
] as const;

export type ErrorCategory = (typeof ERROR_CATEGORIES)[number];

/** Error de la aplicación con categoría explícita y un código estable. */
export class AppError extends Error {
  readonly category: ErrorCategory;
  readonly code: string;

  constructor(
    category: ErrorCategory,
    code: string,
    message: string,
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "AppError";
    this.category = category;
    this.code = code;
  }
}

/** Identidad, hostname o permisos no válidos. */
export class AuthError extends AppError {
  constructor(code: string, message = "Acceso denegado.", options?: { cause?: unknown }) {
    super("auth", code, message, options);
    this.name = "AuthError";
  }
}

/** Bindings o variables de entorno ausentes o inválidos. */
export class ConfigurationError extends AppError {
  constructor(code: string, message = "Configuración incompleta.", options?: { cause?: unknown }) {
    super("configuration", code, message, options);
    this.name = "ConfigurationError";
  }
}

/** Dependencia externa (Access JWKS, Cloudflare Images) no disponible. */
export class UpstreamError extends AppError {
  constructor(code: string, message = "Servicio externo no disponible.", options?: { cause?: unknown }) {
    super("upstream", code, message, options);
    this.name = "UpstreamError";
  }
}

/** Datos de entrada inválidos detectados en la frontera de la API. */
export class ValidationError extends AppError {
  constructor(code: string, message = "Datos inválidos.", options?: { cause?: unknown }) {
    super("validation", code, message, options);
    this.name = "ValidationError";
  }
}

/** Estado desactualizado (concurrencia optimista) o regla de negocio que impide el cambio. */
export class ConflictError extends AppError {
  constructor(message: string, code = "conflict", options?: { cause?: unknown }) {
    super("conflict", code, message, options);
    this.name = "ConflictError";
  }
}

/**
 * Deduce la categoría cuando el código que captura el error no la indica.
 * Errores desconocidos se tratan como internos: nunca se asume que fue culpa
 * del usuario, para no ocultar fallos reales del sistema.
 */
export function classifyError(error: unknown): ErrorCategory {
  if (error instanceof AppError) return error.category;
  if (error instanceof SyntaxError) return "validation";
  return "internal";
}
