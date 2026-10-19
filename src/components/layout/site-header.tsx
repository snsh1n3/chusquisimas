"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const navigation = [
  { label: "Inicio", href: "/" },
  { label: "Colecciones", href: "/#colecciones" },
  { label: "Tienda", href: "/tienda" },
  { label: "Nuestra esencia", href: "/#nuestra-esencia" },
];

export function SiteHeader() {
  const pathname = usePathname();
  // El menú queda abierto solo para la ruta en la que se abrió: al navegar se cierra solo.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const menuOpen = openFor === pathname;
  const setMenuOpen = (open: boolean) => setOpenFor(open ? pathname : null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Escape cierra el menú y devuelve el foco al botón que lo abrió.
  useEffect(() => {
    if (!menuOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenFor(null);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header className="relative z-50 border-b border-line bg-surface">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 md:px-10">
        <Link
          href="/"
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
        </Link>

        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-7 lg:flex"
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === pathname ? "page" : undefined}
              className="text-sm font-bold transition-colors hover:text-fg-accent"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/tienda"
          className="hidden rounded-full bg-action px-5 py-3 text-sm font-bold text-on-action transition-colors hover:bg-action-hover hover:text-on-action-hover sm:inline-flex"
        >
          Ver la tienda
        </Link>

        <div className="flex items-center gap-2 lg:hidden">
          <Link
            href="/tienda"
            className="rounded-full bg-action px-4 py-2.5 text-sm font-bold text-on-action transition-colors hover:bg-action-hover hover:text-on-action-hover"
          >
            Tienda
          </Link>

        <button
          ref={toggleRef}
          type="button"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen(!menuOpen)}
          className="flex h-11 w-11 items-center justify-center rounded-full border border-line lg:hidden"
        >
          <span aria-hidden="true" className="text-2xl leading-none">
            {menuOpen ? "×" : "☰"}
          </span>
        </button>
        </div>
      </div>

      {menuOpen && (
        <nav
          id="mobile-navigation"
          aria-label="Navegación móvil"
          className="border-t border-line bg-surface px-5 py-4 lg:hidden"
        >
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={item.href === pathname ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
                className="rounded-control px-4 py-3 text-base font-bold hover:bg-page"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}