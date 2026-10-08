"use client";

import Image from "next/image";
import { useState } from "react";

const navigation = [
  { label: "Inicio", href: "#inicio" },
  { label: "Colecciones", href: "#colecciones" },
  { label: "Nuestra esencia", href: "#nuestra-esencia" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-50 border-b border-brand-black/10 bg-brand-white">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-10">
        <a
          href="#inicio"
          className="flex shrink-0 items-center gap-3"
          aria-label="Chusquisimas, ir al inicio"
        >
          <Image
            src="/brand/chusquisimas-logo.svg"
            alt=""
            width={64}
            height={64}
            priority
            className="h-12 w-12 object-contain md:h-14 md:w-14"
          />

          <span className="text-lg font-bold tracking-tight sm:text-xl">
            Chusquisimas
          </span>
        </a>

        <nav
          aria-label="Navegacion principal"
          className="hidden items-center gap-7 lg:flex"
        >
          {navigation.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-bold transition-colors hover:text-brand-orange"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <a
          href="#colecciones"
          className="hidden rounded-full bg-brand-orange px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-brand-black sm:inline-flex"
        >
          Explorar
        </a>

        <button
          type="button"
          aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-brand-black/20 lg:hidden"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Navegacion movil"
          className="border-t border-brand-black/10 bg-brand-white px-5 py-4 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-base font-bold hover:bg-brand-cream"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}