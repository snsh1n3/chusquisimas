/**
 * Cabeceras de seguridad HTTP de Chusquisimas V2.
 *
 * Se aplican desde next.config.ts a todas las respuestas que genera Next.js
 * (páginas dinámicas, RSC y rutas /api). Los archivos estáticos que sirve el
 * binding ASSETS sin pasar por el Worker reciben las básicas vía public/_headers.
 *
 * La CSP se aplica en modo bloqueante y sigue reportando violaciones a
 * /api/csp-report (eventos csp.violation en Workers Logs).
 */

export const ADMIN_HOST = "admin.chusquisimas.com";
export const CSP_REPORT_PATH = "/api/csp-report";

/**
 * Activada el 19-oct-2026 tras una semana en Report-Only, sin revisar los logs
 * de esa semana: la única violación conocida era el beacon de Web Analytics, ya
 * permitido. Los reportes siguen llegando a /api/csp-report. Para revertir ante
 * un bloqueo legítimo: false y desplegar.
 */
export const CSP_ENFORCE = true;

export interface HeaderEntry {
  key: string;
  value: string;
}

export interface HeaderRule {
  source: string;
  has?: Array<{ type: "host"; value: string }>;
  missing?: Array<{ type: "host"; value: string }>;
  headers: HeaderEntry[];
}

type CspDirectives = Record<string, readonly string[]>;

export const CLOUDFLARE_INSIGHTS_SCRIPT = "https://static.cloudflareinsights.com";
export const CLOUDFLARE_INSIGHTS_CONNECT = "https://cloudflareinsights.com";

const BASE_CSP: CspDirectives = {
  "default-src": ["'self'"],
  // Next.js inyecta scripts inline para hidratación; sin nonces todavía.
  // Cloudflare Web Analytics inyecta su beacon en la zona (reporte del 12-oct-2026).
  "script-src": ["'self'", "'unsafe-inline'", CLOUDFLARE_INSIGHTS_SCRIPT],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  // Quicksand se sirve desde el propio dominio con next/font.
  "font-src": ["'self'"],
  // El beacon envía las métricas de Web Analytics a este origen.
  "connect-src": ["'self'", CLOUDFLARE_INSIGHTS_CONNECT],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "manifest-src": ["'self'"],
  "worker-src": ["'self'", "blob:"],
};

export function serializeCsp(directives: CspDirectives): string {
  return Object.entries(directives)
    .map(([name, values]) => (values.length ? `${name} ${values.join(" ")}` : name))
    .join("; ");
}

export function buildCsp(options: { frameAncestors: "'none'" | "'self'" }): string {
  return serializeCsp({
    ...BASE_CSP,
    // Los navegadores ignoran (y advierten) esta directiva en modo Report-Only.
    ...(CSP_ENFORCE ? { "upgrade-insecure-requests": [] } : {}),
    "frame-ancestors": [options.frameAncestors],
    "report-uri": [CSP_REPORT_PATH],
    "report-to": ["csp"],
  });
}

const CSP_HEADER = CSP_ENFORCE ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";

const COMMON_HEADERS: HeaderEntry[] = [
  // Un año, solo para el host que responde. includeSubDomains/preload quedan
  // pendientes hasta confirmar que ningún subdominio del dominio necesita HTTP:
  // el navegador recuerda HSTS durante todo el max-age y no se puede revertir.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Reporting-Endpoints", value: `csp="${CSP_REPORT_PATH}"` },
];

/** Reglas para next.config.ts `headers()`. */
export function securityHeaderRules(): HeaderRule[] {
  return [
    {
      // Panel administrativo: no se puede incrustar en ningún sitio y no se indexa.
      source: "/:path*",
      has: [{ type: "host", value: ADMIN_HOST }],
      headers: [
        ...COMMON_HEADERS,
        { key: "X-Frame-Options", value: "DENY" },
        { key: CSP_HEADER, value: buildCsp({ frameAncestors: "'none'" }) },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    },
    {
      source: "/:path*",
      missing: [{ type: "host", value: ADMIN_HOST }],
      headers: [
        ...COMMON_HEADERS,
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: CSP_HEADER, value: buildCsp({ frameAncestors: "'self'" }) },
      ],
    },
  ];
}
