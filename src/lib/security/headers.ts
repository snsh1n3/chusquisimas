/**
 * Cabeceras de seguridad HTTP de Chusquisimas V2.
 *
 * Se aplican desde next.config.ts a todas las respuestas que genera Next.js
 * (páginas dinámicas, RSC y rutas /api). Los archivos estáticos que sirve el
 * binding ASSETS sin pasar por el Worker reciben las básicas vía public/_headers.
 *
 * La CSP arranca en modo Report-Only: el navegador no bloquea nada, solo
 * reporta a /api/csp-report. Cuando los reportes muestren cero violaciones
 * legítimas se cambia CSP_ENFORCE a true.
 */

export const ADMIN_HOST = "admin.chusquisimas.com";
export const CSP_REPORT_PATH = "/api/csp-report";

/** Cambiar a true solo después de revisar los reportes en producción. */
export const CSP_ENFORCE = false;

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

const BASE_CSP: CspDirectives = {
  "default-src": ["'self'"],
  // Next.js inyecta scripts inline para hidratación; sin nonces todavía.
  "script-src": ["'self'", "'unsafe-inline'"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:"],
  // Quicksand se sirve desde el propio dominio con next/font.
  "font-src": ["'self'"],
  "connect-src": ["'self'"],
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
