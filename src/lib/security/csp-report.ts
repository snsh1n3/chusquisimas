/**
 * Normalización de reportes de violación de CSP.
 *
 * Acepta los dos formatos que envían los navegadores:
 * - `application/csp-report` (report-uri, Firefox/Safari): { "csp-report": {...} }
 * - `application/reports+json` (Reporting API, Chromium): [{ type: "csp-violation", body: {...} }]
 *
 * Solo conserva campos útiles para ajustar la política y reduce las URL a
 * origen + ruta, sin query string ni fragmento, para no registrar datos personales.
 */

export const MAX_CSP_REPORT_BYTES = 16_384;
export const MAX_REPORTS_PER_REQUEST = 10;
export const CSP_REPORT_CONTENT_TYPES = [
  "application/csp-report",
  "application/reports+json",
  "application/json",
] as const;

export interface CspViolation {
  documentPath: string;
  directive: string;
  blocked: string;
  disposition: "report" | "enforce" | "unknown";
  sourceFile?: string;
  line?: number;
}

const KEYWORD_SOURCES = new Set(["inline", "eval", "self", "data", "blob", "wasm-eval", "trusted-types-policy"]);

/** Reduce una URL a origen + ruta. Palabras clave (inline, eval…) se conservan. */
export function sanitizeReportUrl(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) return "";
  const trimmed = value.trim().slice(0, 2_000);
  if (KEYWORD_SOURCES.has(trimmed)) return trimmed;
  try {
    const url = new URL(trimmed);
    if (url.protocol === "data:" || url.protocol === "blob:") return url.protocol;
    return `${url.origin}${url.pathname}`.slice(0, 300);
  } catch {
    return trimmed.replace(/[?#].*$/, "").slice(0, 100);
  }
}

function asText(value: unknown, max = 120): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

function normalizeOne(body: Record<string, unknown>, legacy: boolean): CspViolation | null {
  const directive = asText(
    legacy ? body["effective-directive"] ?? body["violated-directive"] : body.effectiveDirective
  );
  if (!directive) return null;
  const rawDisposition = asText(body.disposition, 20);
  const line = legacy ? body["line-number"] : body.lineNumber;
  const violation: CspViolation = {
    documentPath: sanitizeReportUrl(legacy ? body["document-uri"] : body.documentURL),
    directive: directive.split(" ")[0],
    blocked: sanitizeReportUrl(legacy ? body["blocked-uri"] : body.blockedURL),
    disposition: rawDisposition === "report" || rawDisposition === "enforce" ? rawDisposition : "unknown",
  };
  const sourceFile = sanitizeReportUrl(legacy ? body["source-file"] : body.sourceFile);
  if (sourceFile) violation.sourceFile = sourceFile;
  if (typeof line === "number" && Number.isSafeInteger(line) && line >= 0) violation.line = line;
  return violation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Devuelve las violaciones válidas del cuerpo; lanza SyntaxError si no es JSON. */
export function parseCspReports(raw: string): CspViolation[] {
  const data: unknown = JSON.parse(raw);
  if (isRecord(data) && isRecord(data["csp-report"])) {
    const violation = normalizeOne(data["csp-report"], true);
    return violation ? [violation] : [];
  }
  if (Array.isArray(data)) {
    const violations: CspViolation[] = [];
    for (const entry of data.slice(0, MAX_REPORTS_PER_REQUEST)) {
      if (!isRecord(entry) || entry.type !== "csp-violation" || !isRecord(entry.body)) continue;
      const violation = normalizeOne(entry.body, false);
      if (violation) violations.push(violation);
    }
    return violations;
  }
  return [];
}
