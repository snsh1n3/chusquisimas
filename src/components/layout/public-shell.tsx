import type { ReactNode } from "react";

import { MAIN_CONTENT_ID } from "@/lib/site";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

/**
 * Estructura común de las páginas públicas: enlace para saltar al contenido,
 * cabecera (banner), contenido principal (main) y pie (contentinfo), cada uno
 * como región de primer nivel para lectores de pantalla.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-page text-fg">
      <a
        href={`#${MAIN_CONTENT_ID}`}
        className="sr-only z-[60] rounded-full bg-action px-5 py-3 font-bold text-on-action focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
