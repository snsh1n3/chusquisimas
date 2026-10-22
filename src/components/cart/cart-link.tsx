"use client";
import Link from "next/link";
import { cartUnits } from "@/lib/cart/cart-store";
import { useCart } from "./use-cart";

function CartIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 3h2.2l2.4 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 7H6" />
      <circle cx="9.5" cy="20" r="1.4" />
      <circle cx="17.5" cy="20" r="1.4" />
    </svg>
  );
}

/**
 * Botón del carrito en el encabezado: ícono y número de unidades.
 * "full" muestra además el texto (escritorio); "compact" solo ícono y número (móvil).
 */
export function CartLink({ variant = "full" }: { variant?: "full" | "compact" }) {
  const units = cartUnits(useCart());
  const label = `Ver carrito, ${units} ${units === 1 ? "unidad" : "unidades"}`;
  return (
    <Link
      href="/carrito"
      aria-label={label}
      className={`inline-flex items-center gap-2 rounded-full bg-action font-bold text-on-action transition-colors hover:bg-action-hover hover:text-on-action-hover ${
        variant === "full" ? "px-5 py-3 text-sm" : "h-11 px-3 text-sm"}`}
    >
      <CartIcon />
      {variant === "full" && <span>Ver carrito</span>}
      <span aria-hidden="true"
        className="min-w-6 rounded-full bg-surface px-1.5 py-0.5 text-center text-xs text-fg">
        {units}
      </span>
    </Link>
  );
}
