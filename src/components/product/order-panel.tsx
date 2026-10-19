"use client";
import { useMemo, useState } from "react";

import type { PublicVariant } from "@/lib/catalog/public-catalog";
import {
  MAX_ORDER_QUANTITY, availabilityText, buildProductOrderUrl, clampQuantity, isOrderable,
} from "@/lib/orders/product-order";
import { ORDERS_WHATSAPP_NUMBER } from "@/lib/orders/whatsapp";
import { formatPriceCOP } from "@/types/catalog";

/**
 * Selección de presentación y cantidad, y enlace de pedido por WhatsApp.
 * Recibe solo variantes públicas (sin existencias). El pedido no se confirma
 * aquí: lo confirma Chusquisimas por WhatsApp.
 */
export function OrderPanel({ productName, variants }: { productName: string; variants: PublicVariant[] }) {
  const initial = variants.find(isOrderable) ?? variants[0];
  const [selectedId, setSelectedId] = useState(initial?.id);
  const [quantity, setQuantity] = useState(1);

  const selected = variants.find((variant) => variant.id === selectedId) ?? initial;
  const orderUrl = useMemo(() => {
    if (!selected || !isOrderable(selected)) return null;
    try {
      return buildProductOrderUrl(productName, selected, quantity);
    } catch {
      return null;
    }
  }, [productName, selected, quantity]);

  const inquiryUrl = `https://wa.me/${ORDERS_WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hola, quiero consultar la disponibilidad de ${productName} en Chusquisimas.`
  )}`;

  if (!selected) {
    return (
      <div className="rounded-3xl border border-line bg-surface p-6">
        <p className="font-bold">Este producto todavía no tiene presentaciones a la venta.</p>
        <a href={inquiryUrl} target="_blank" rel="noopener noreferrer"
          className="mt-4 inline-block rounded-full bg-inverse px-6 py-3 text-sm font-bold text-on-inverse">
          Consultar por WhatsApp
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 rounded-3xl border border-line bg-surface p-6">
      {variants.length > 1 && (
        <fieldset>
          <legend className="text-sm font-bold">Presentación</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((variant) => {
              const active = variant.id === selected.id;
              const orderable = isOrderable(variant);
              return (
                <label key={variant.id}
                  className={`cursor-pointer rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active ? "border-line-strong bg-inverse text-on-inverse" : "border-line-control hover:border-line-strong"
                  } ${orderable ? "" : "opacity-50"}`}>
                  <input type="radio" name="variant" value={variant.id} checked={active}
                    onChange={() => setSelectedId(variant.id)} className="sr-only" />
                  {variant.label}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      <div>
        <p className="text-3xl font-bold">{formatPriceCOP(selected.price.amount)}</p>
        <p className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-bold ${
          selected.availability === "ready_to_ship" ? "bg-highlight text-fg" : "bg-page text-fg"
        }`}>
          {availabilityText(selected)}
        </p>
      </div>

      {isOrderable(selected) ? (
        <>
          <div>
            <label htmlFor="quantity" className="text-sm font-bold">Cantidad</label>
            <div className="mt-2 flex w-fit items-center rounded-full border border-line">
              <button type="button" onClick={() => setQuantity((q) => clampQuantity(q - 1))}
                disabled={quantity <= 1} aria-label="Disminuir cantidad"
                className="h-11 w-11 text-lg font-bold disabled:opacity-30">−</button>
              <input id="quantity" type="number" inputMode="numeric" min={1} max={MAX_ORDER_QUANTITY}
                value={quantity}
                onChange={(event) => setQuantity(clampQuantity(Number(event.target.value)))}
                className="w-12 bg-transparent text-center font-bold [appearance:textfield]" />
              <button type="button" onClick={() => setQuantity((q) => clampQuantity(q + 1))}
                disabled={quantity >= MAX_ORDER_QUANTITY} aria-label="Aumentar cantidad"
                className="h-11 w-11 text-lg font-bold disabled:opacity-30">+</button>
            </div>
          </div>

          {orderUrl && (
            <a href={orderUrl} target="_blank" rel="noopener noreferrer"
              className="rounded-full bg-action px-6 py-4 text-center text-base font-bold text-on-action transition hover:bg-action-hover hover:text-on-action-hover">
              Pedir por WhatsApp
            </a>
          )}
          <p className="text-xs leading-5 text-fg-muted">
            Te abrimos WhatsApp con tu pedido listo. Lo confirmamos contigo junto con
            el envío y el medio de pago; nada se cobra desde la página.
          </p>
        </>
      ) : (
        <a href={inquiryUrl} target="_blank" rel="noopener noreferrer"
          className="rounded-full border border-line-strong px-6 py-4 text-center font-bold">
          Avísame cuando esté disponible
        </a>
      )}
    </div>
  );
}
