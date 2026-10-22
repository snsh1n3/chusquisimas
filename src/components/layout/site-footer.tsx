import Link from "next/link";

import { ORDERS_WHATSAPP_NUMBER } from "@/lib/orders/whatsapp";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";
import { PQR_EMAIL, SIC_URL } from "@/lib/legal/legal-pages";

const legalLinks = [
  { href: "/terminos", label: "Términos y condiciones" },
  { href: "/envios", label: "Envíos y entregas" },
  { href: "/cambios", label: "Cambios, garantías y retracto" },
  { href: "/privacidad", label: "Aviso de privacidad" },
  { href: "/pqr", label: "Peticiones, quejas y reclamos" },
];

const whatsappDisplay = "+57 316 820 5201";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-inverse px-5 py-10 text-on-inverse md:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 text-sm md:grid-cols-4">
        <div>
          <p className="text-base font-bold">{SITE_NAME}</p>
          <p className="mt-2">{SITE_TAGLINE}</p>
        </div>

        <nav aria-label="Pie de página">
          <ul className="flex flex-col gap-2">
            <li><Link href="/tienda" className="underline-offset-4 hover:underline">Tienda</Link></li>
            <li><Link href="/#colecciones" className="underline-offset-4 hover:underline">Colecciones</Link></li>
            <li><Link href="/#nuestra-esencia" className="underline-offset-4 hover:underline">Nuestra esencia</Link></li>
          </ul>
        </nav>

        <nav aria-label="Información legal">
          <ul className="flex flex-col gap-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="underline-offset-4 hover:underline">{link.label}</Link>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="font-bold">Escríbenos</p>
          <ul className="mt-2 flex flex-col gap-2">
            <li>
              <a href={`https://wa.me/${ORDERS_WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
                className="underline-offset-4 hover:underline">
                WhatsApp {whatsappDisplay}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
            <li>
              <a href={`mailto:${PQR_EMAIL}`} className="underline-offset-4 hover:underline">{PQR_EMAIL}</a>
            </li>
            <li>
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                className="underline-offset-4 hover:underline">
                Instagram {INSTAGRAM_HANDLE}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap items-center justify-between gap-4 text-xs">
        <p>© {year} {SITE_NAME}. Hecho a mano en Colombia.</p>
        {/* Enlace obligatorio en comercio electrónico (Ley 1480, art. 50, mod. Ley 2439 de 2024). */}
        <a href={SIC_URL} target="_blank" rel="noopener noreferrer"
          className="rounded-control border border-current px-3 py-2 font-bold underline-offset-4 hover:underline">
          Superintendencia de Industria y Comercio · www.sic.gov.co
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </a>
      </div>
    </footer>
  );
}
