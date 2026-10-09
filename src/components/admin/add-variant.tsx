"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddVariant({
  productId, productType, aromas,
}: {
  productId: string;
  productType: "candle" | "wax_melt" | "kit" | "custom";
  aromas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [aromaId, setAromaId] = useState("");
  const [label, setLabel] = useState("Presentación estándar");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/variants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create", productId,
          label: (productType === "candle" && aromaId)
            ? aromas.find(a => a.id === aromaId)?.name ?? label : label,
          aromaId: aromaId || null,
        }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || "No se pudo crear la variante");
      setMessage("Variante creada sin precio e inactiva.");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setBusy(false);
    }
  }
  return <div className="mt-3 flex flex-col gap-2 rounded-lg border bg-[#FFFDF9] p-3">
    <span className="text-xs font-semibold">Añadir variante</span>
    {productType === "candle" && <select aria-label="Aroma de variante"
      value={aromaId} onChange={e => setAromaId(e.target.value)}
      className="w-full rounded border p-2 text-xs">
      <option value="">Sin aroma</option>
      {aromas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </select>}
    <input aria-label="Nombre de presentación" value={label}
      onChange={e => setLabel(e.target.value)} maxLength={120}
      className="w-full rounded border p-2 text-xs" />
    <button type="button" onClick={save} disabled={busy}
      className="rounded bg-[#231F20] p-2 text-xs text-white disabled:opacity-40">
      {busy ? "Creando..." : "Crear variante"}
    </button>
    {message && <span role="status" className="text-xs">{message}</span>}
  </div>;
}
