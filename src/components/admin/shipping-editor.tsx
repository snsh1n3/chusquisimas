"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import type { ShippingZoneView } from "@/lib/orders/shipping-service";

/** Nombre y valor de una tarifa de envío. Vacío = "por confirmar". */
export function ShippingEditor({ zone }: { zone: ShippingZoneView }) {
  const router = useRouter();
  const [label, setLabel] = useState(zone.label);
  const [price, setPrice] = useState(zone.priceCOP === null ? "" : String(zone.priceCOP));
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const priceCOP = price.trim() === "" ? null : Number(price);
    if (priceCOP !== null && (!Number.isSafeInteger(priceCOP) || priceCOP < 0)) {
      setStatus("Valor inválido");
      return;
    }
    setPending(true);
    try {
      const response = await fetch("/api/admin/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zone: zone.id, label, priceCOP }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      setStatus(response.ok ? "Guardado" : payload.error ?? "No se pudo guardar");
      if (response.ok) router.refresh();
    } catch {
      setStatus("No se pudo conectar");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-card border border-line bg-surface p-4">
      <label className="text-xs font-bold" htmlFor={`label-${zone.id}`}>
        {zone.id === "local" ? "Envío local" : "Envío nacional"}: nombre que ve el cliente
      </label>
      <input id={`label-${zone.id}`} value={label} onChange={(e) => setLabel(e.target.value)}
        minLength={3} maxLength={60} required className="rounded-control border border-line-control p-2" />
      <label className="text-xs font-bold" htmlFor={`price-${zone.id}`}>Valor en pesos (vacío = por confirmar)</label>
      <input id={`price-${zone.id}`} type="number" min={0} step={1} value={price}
        onChange={(e) => setPrice(e.target.value)} placeholder="Por confirmar"
        className="rounded-control border border-line-control p-2" />
      <button type="submit" disabled={pending}
        className="w-fit rounded-control bg-inverse px-4 py-2 text-sm font-bold text-on-inverse disabled:opacity-40">
        {pending ? "Guardando…" : "Guardar tarifa"}
      </button>
      {status && <span role="status" className="text-xs">{status}</span>}
    </form>
  );
}
