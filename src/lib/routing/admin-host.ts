/**
 * El subdominio del panel solo sirve el panel: la raíz lleva a /admin y las
 * páginas de la tienda abiertas en admin.chusquisimas.com van a la tienda.
 * Se aplica desde next.config.ts (redirects), antes de renderizar.
 */
import { ADMIN_HOST } from "../security/headers.ts";

export const STORE_ORIGIN = "https://chusquisimas.com";

/** Rutas que el subdominio admin sigue sirviendo tal cual. */
const ADMIN_HOST_KEEP = ["admin", "api", "_next", "favicon\\.ico", "icon\\.svg", "apple-icon\\.png", "robots\\.txt"];

export interface HostRedirect {
  source: string;
  destination: string;
  permanent: boolean;
  has: Array<{ type: "host"; value: string }>;
}

export function adminHostRedirects(): HostRedirect[] {
  const has = [{ type: "host" as const, value: ADMIN_HOST }];
  return [
    { source: "/", destination: "/admin", permanent: false, has },
    {
      source: `/:path((?!(?:${ADMIN_HOST_KEEP.join("|")})(?:/|$)).+)`,
      destination: `${STORE_ORIGIN}/:path`,
      permanent: false,
      has,
    },
  ];
}
