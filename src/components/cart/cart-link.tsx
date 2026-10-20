"use client";
import Link from "next/link";
import { cartUnits } from "@/lib/cart/cart-store";
import { useCart } from "./use-cart";

/** Acceso al carrito en el encabezado. Solo aparece cuando hay productos. */
export function CartLink() {
  const units = cartUnits(useCart());
  if (units === 0) return null;
  return (
    <Link
      href="/carrito"
      className="relative flex h-11 items-center gap-2 rounded-full border border-line-control px-4 text-sm font-bold transition-colors hover:border-line-strong"
    >
      <span aria-hidden="true">🛒</span>
      <span>Carrito</span>
      <span className="rounded-full bg-inverse px-2 py-0.5 text-xs text-on-inverse">
        {units}
        <span className="sr-only"> {units === 1 ? "unidad" : "unidades"}</span>
      </span>
    </Link>
  );
}
