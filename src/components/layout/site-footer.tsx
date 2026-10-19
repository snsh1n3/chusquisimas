import Link from "next/link";

import { ORDERS_WHATSAPP_NUMBER } from "@/lib/orders/whatsapp";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const whatsappDisplay = "+57 316 820 5201";

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-inverse px-5 py-10 text-on-inverse md:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 text-sm md:grid-cols-3">
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
              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                className="underline-offset-4 hover:underline">
                Instagram {INSTAGRAM_HANDLE}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-7xl text-xs">© {year} {SITE_NAME}. Hecho a mano en Colombia.</p>
    </footer>
  );
}
