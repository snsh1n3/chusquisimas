"use client";
import { useSyncExternalStore } from "react";
import { getCart, getServerCart, subscribeCart } from "@/lib/cart/cart-store";

/** Líneas del carrito; en el servidor y en la hidratación inicial, vacío. */
export function useCart() {
  return useSyncExternalStore(subscribeCart, getCart, getServerCart);
}
