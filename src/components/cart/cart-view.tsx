"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type InputHTMLAttributes, type RefObject } from "react";
import { cartUnits, clearCart, removeFromCart, setCartQuantity } from "@/lib/cart/cart-store";
import type { CartQuote, QuoteLine } from "@/lib/orders/cart-quote";
import { MAX_LINE_QUANTITY, type ShippingZone } from "@/lib/orders/order-inputs";
import type { CreatedOrderLine } from "@/lib/orders/order-service";
import { formatPriceCOP } from "@/types/catalog";
import { TurnstileWidget, type TurnstileHandle } from "./turnstile-widget";
import { useCart } from "./use-cart";

interface OrderResponse {
  code: string;
  whatsappUrl: string;
  order: {
    lines: CreatedOrderLine[];
    subtotalCOP: number;
    shippingLabel: string;
    shippingCOP: number | null;
  };
}

type QuoteState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "ready"; quote: CartQuote; key: string };

function availabilityText(line: Pick<QuoteLine, "availability" | "preparationDays">): string {
  if (line.availability === "ready_to_ship") return "Entrega inmediata";
  if (line.availability === "made_to_order") return `Bajo pedido · ${line.preparationDays ?? 14} días`;
  return "Agotado";
}

export function CartView({ turnstileSiteKey }: { turnstileSiteKey: string }) {
  const cart = useCart();
  const variantKey = cart.map((line) => line.variantId).sort().join(",");
  const [quoteState, setQuoteState] = useState<QuoteState>({ status: "loading" });
  const [removedNotice, setRemovedNotice] = useState(false);
  const [zone, setZone] = useState<ShippingZone | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<OrderResponse | null>(null);
  const turnstile = useRef<TurnstileHandle>(null);
  const confirmationHeading = useRef<HTMLHeadingElement>(null);

  // Se cotiza cuando cambia el conjunto de productos, no la cantidad.
  useEffect(() => {
    if (!variantKey) return;
    const controller = new AbortController();
    const items = variantKey.split(",").map((variantId) => ({ variantId, quantity: 1 }));
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const quote = await response.json() as CartQuote;
        if (quote.unavailable.length > 0) {
          setRemovedNotice(true);
          removeFromCart(quote.unavailable);
        }
        setQuoteState({ status: "ready", quote, key: variantKey });
      })
      .catch((reason: unknown) => {
        if (!(reason instanceof DOMException && reason.name === "AbortError")) setQuoteState({ status: "error" });
      });
    return () => controller.abort();
  }, [variantKey]);

  useEffect(() => {
    if (confirmed) confirmationHeading.current?.focus();
  }, [confirmed]);

  if (confirmed) return <Confirmation result={confirmed} headingRef={confirmationHeading} />;

  if (cart.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-8 text-center">
        <Image src="/brand/chusquisimas-logo.svg" alt="" width={72} height={72} className="mx-auto h-16 w-16" />
        <p className="mt-4 text-lg font-bold">Tu carrito está vacío.</p>
        {removedNotice && (
          <p className="mt-2 text-sm text-fg-muted">Quitamos productos que ya no están disponibles.</p>
        )}
        <Link href="/tienda" className="mt-6 inline-block rounded-full bg-action px-6 py-3 font-bold text-on-action">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  if (quoteState.status === "error") {
    return (
      <p role="alert" className="rounded-card border border-line bg-surface p-6 font-bold">
        No pudimos cargar tu carrito. Recarga la página en un momento.
      </p>
    );
  }
  if (quoteState.status === "loading") {
    return <p role="status" className="p-6 text-fg-muted">Cargando tu carrito…</p>;
  }

  const byId = new Map(quoteState.quote.lines.map((line) => [line.variantId, line]));
  const lines = cart.flatMap((item) => {
    const line = byId.get(item.variantId);
    return line ? [{ ...line, quantity: item.quantity }] : [];
  });
  const subtotal = lines.reduce((sum, line) => sum + line.unitPriceCOP * line.quantity, 0);
  const zones = quoteState.quote.shippingZones;
  const selectedZone = zones.find((candidate) => candidate.id === zone) ?? null;
  const pending = quoteState.key !== variantKey;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    if (!zone) { setError("Elige el tipo de envío."); return; }
    if (!token) { setError("Completa la verificación de seguridad."); return; }
    setSubmitting(true);
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart,
          shippingZone: zone,
          customer: { name: form.get("name"), phone: form.get("phone"), city: form.get("city") },
          privacyConsent: form.get("privacy") === "on",
          turnstileToken: token,
        }),
      });
      const payload = await response.json().catch(() => ({})) as Partial<OrderResponse> & { error?: string };
      if (!response.ok || !payload.code) {
        throw new Error(payload.error ?? "No pudimos registrar el pedido. Inténtalo de nuevo.");
      }
      clearCart();
      setConfirmed(payload as OrderResponse);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "No pudimos registrar el pedido.");
      turnstile.current?.reset();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem]">
      <section aria-labelledby="cart-items">
        <h2 id="cart-items" className="sr-only">Productos</h2>
        {removedNotice && (
          <p role="status" className="mb-4 rounded-control bg-panel px-4 py-3 text-sm font-bold">
            Quitamos del carrito productos que ya no están disponibles.
          </p>
        )}
        <ul className="flex flex-col gap-4">
          {lines.map((line) => (
            <li key={line.variantId} className="flex gap-4 rounded-card border border-line bg-surface p-4">
              {line.imageId ? (
                <Image src={`/api/images/${line.imageId}/thumb`} alt="" width={96} height={96} unoptimized
                  className="h-24 w-24 shrink-0 rounded-control bg-panel object-cover" />
              ) : (
                <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-control bg-panel">
                  <Image src="/brand/chusquisimas-logo.svg" alt="" width={48} height={48} />
                </div>
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Link href={`/tienda/${line.productSlug}`} className="font-bold hover:underline">{line.productName}</Link>
                {line.label && <p className="text-sm text-fg-muted">{line.label}</p>}
                <p className="text-xs font-bold">{availabilityText(line)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <label className="sr-only" htmlFor={`qty-${line.variantId}`}>Cantidad de {line.productName}</label>
                  <select id={`qty-${line.variantId}`} value={line.quantity}
                    onChange={(e) => setCartQuantity(line.variantId, Number(e.target.value))}
                    className="h-10 rounded-control border border-line-control bg-surface px-3 font-bold">
                    {Array.from({ length: MAX_LINE_QUANTITY }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => removeFromCart([line.variantId])}
                    className="text-sm font-bold text-fg-accent underline underline-offset-4">
                    Quitar<span className="sr-only"> {line.productName}</span>
                  </button>
                  <span className="ml-auto font-bold">{formatPriceCOP(line.unitPriceCOP * line.quantity)}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <form onSubmit={submit} className="flex h-fit flex-col gap-5 rounded-card border border-line bg-surface p-6"
        aria-labelledby="checkout-title">
        <h2 id="checkout-title" className="text-xl font-bold">Tus datos</h2>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-bold">Envío</legend>
          {zones.map((option) => (
            <label key={option.id}
              className="flex cursor-pointer items-center justify-between gap-3 rounded-control border border-line-control px-4 py-3 has-checked:border-line-strong has-checked:bg-page has-[input:focus-visible]:outline-3 has-[input:focus-visible]:outline-focus">
              <span className="flex items-center gap-3">
                <input type="radio" name="zone" value={option.id} checked={zone === option.id}
                  onChange={() => setZone(option.id)} className="accent-current" required />
                <span className="font-bold">{option.label}</span>
              </span>
              <span className="text-sm">{option.priceCOP === null ? "Por confirmar" : formatPriceCOP(option.priceCOP)}</span>
            </label>
          ))}
        </fieldset>

        <Field id="name" label="Nombre" autoComplete="name" minLength={2} maxLength={80} />
        <Field id="phone" label="WhatsApp" autoComplete="tel-national" inputMode="tel"
          placeholder="300 123 4567" hint="Celular de Colombia. Te escribimos para confirmar." maxLength={20} />
        <Field id="city" label="Ciudad" autoComplete="address-level2" minLength={2} maxLength={60} />

        <dl className="flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex justify-between"><dt>Productos</dt><dd className="font-bold">{formatPriceCOP(subtotal)}</dd></div>
          <div className="flex justify-between">
            <dt>{selectedZone?.label ?? "Envío"}</dt>
            <dd className="font-bold">
              {!selectedZone ? "Elige el envío" : selectedZone.priceCOP === null ? "Por confirmar" : formatPriceCOP(selectedZone.priceCOP)}
            </dd>
          </div>
          <div className="flex justify-between text-base">
            <dt className="font-bold">{selectedZone?.priceCOP != null ? "Total" : "Total sin envío"}</dt>
            <dd className="font-bold">{formatPriceCOP(subtotal + (selectedZone?.priceCOP ?? 0))}</dd>
          </div>
        </dl>

        <label className="flex gap-3 text-sm leading-5">
          <input type="checkbox" name="privacy" required className="mt-1 h-4 w-4 shrink-0 accent-current" />
          <span>
            Autorizo el tratamiento de mis datos para gestionar este pedido, según el{" "}
            <Link href="/privacidad" target="_blank" className="font-bold underline underline-offset-4">
              aviso de privacidad<span className="sr-only"> (se abre en otra pestaña)</span>
            </Link>.
          </span>
        </label>

        <TurnstileWidget ref={turnstile} siteKey={turnstileSiteKey}
          onToken={(value) => { setToken(value); if (value) setTurnstileError(false); }}
          onError={() => setTurnstileError(true)} />
        {turnstileError && (
          <p className="text-sm text-danger">La verificación de seguridad no cargó. Recarga la página.</p>
        )}

        {error && <p role="alert" className="text-sm font-bold text-danger">{error}</p>}

        <button type="submit" disabled={submitting || pending || lines.length === 0}
          className="rounded-full bg-action px-6 py-4 text-base font-bold text-on-action transition hover:bg-action-hover hover:text-on-action-hover disabled:opacity-50">
          {submitting ? "Registrando…" : "Registrar pedido"}
        </button>
        <p className="text-xs leading-5 text-fg-muted">
          No cobramos nada aquí. Al registrar, te llevamos a WhatsApp con tu número de pedido para
          confirmar la dirección y el medio de pago. Las unidades de entrega inmediata quedan
          apartadas 48 horas. {cartUnits(cart) > 0 && `(${cartUnits(cart)} unidades)`}
        </p>
      </form>
    </div>
  );
}

function Field({ id, label, hint, ...input }: {
  id: string; label: string; hint?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      <input id={id} name={id} required aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-11 rounded-control border border-line-control bg-surface px-3" {...input} />
      {hint && <p id={`${id}-hint`} className="text-xs text-fg-muted">{hint}</p>}
    </div>
  );
}

function Confirmation({ result, headingRef }: {
  result: OrderResponse;
  headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  const { order } = result;
  return (
    <section className="mx-auto max-w-xl rounded-card border border-line bg-surface p-8 text-center">
      <Image src="/brand/chusquisimas-logo.svg" alt="" width={80} height={80} className="mx-auto h-20 w-20" />
      <h2 ref={headingRef} tabIndex={-1} className="mt-4 text-2xl font-bold outline-none">
        ¡Pedido registrado!
      </h2>
      <p className="mt-2 text-fg-muted">Tu número de pedido es</p>
      <p className="mt-1 text-3xl font-bold tracking-wider">{result.code}</p>
      <ul className="mt-6 flex flex-col gap-2 text-left text-sm">
        {order.lines.map((line, index) => (
          <li key={index} className="flex justify-between gap-4">
            <span>
              {line.quantity} × {line.productName}{line.aroma ? ` · ${line.aroma}` : ""}
              <span className="block text-xs text-fg-muted">
                {line.fulfillment === "ready_stock" ? "Entrega inmediata" : `Bajo pedido · ${line.preparationDays ?? 14} días`}
              </span>
            </span>
            <span className="font-bold">{formatPriceCOP(line.unitPriceCOP * line.quantity)}</span>
          </li>
        ))}
        <li className="flex justify-between border-t border-line pt-2">
          <span>{order.shippingLabel}</span>
          <span className="font-bold">{order.shippingCOP === null ? "Por confirmar" : formatPriceCOP(order.shippingCOP)}</span>
        </li>
      </ul>
      <a href={result.whatsappUrl} target="_blank" rel="noopener noreferrer"
        className="mt-8 inline-block w-full rounded-full bg-action px-6 py-4 font-bold text-on-action transition hover:bg-action-hover hover:text-on-action-hover">
        Enviar pedido por WhatsApp
        <span className="sr-only"> (se abre WhatsApp)</span>
      </a>
      <p className="mt-4 text-xs leading-5 text-fg-muted">
        Envíanos el mensaje para confirmar la dirección y el pago. Si no lo confirmamos en 48 horas,
        el pedido se cancela y las unidades apartadas se liberan.
      </p>
    </section>
  );
}
