"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function PriceEditor({ variantId, previous }: { variantId: string; previous: number | null }) {
  const router = useRouter();
  const [text, setText] = useState(previous === null ? "" : String(previous));
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amount = text.trim() === "" ? null : Number(text);
    if (amount !== null && (!Number.isSafeInteger(amount) || amount < 0)) {
      setStatus("Precio inválido");
      return;
    }
    setPending(true);
    try {
      const result = await fetch("/api/admin/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId, priceCOP: amount, expectedPriceCOP: previous }),
      });
      setStatus(result.ok ? "Guardado" : result.status === 409 ? "Conflicto: recarga la página" : "No se pudo guardar");
      if (result.ok || result.status === 409) router.refresh();
    } catch {
      setStatus("No se pudo conectar");
    } finally {
      setPending(false);
    }
  }

  return <form onSubmit={submit} className="flex flex-col gap-2">
    <input type="number" aria-label="Precio COP" min="0" step="1" placeholder="Sin precio"
      value={text} onChange={event => setText(event.target.value)}
      className="w-36 rounded-lg border p-2" />
    <button type="submit" disabled={pending} className="rounded-lg bg-[#231F20] px-3 py-2 text-white disabled:opacity-40">
      {pending ? "Guardando..." : "Guardar precio"}
    </button>
    {status && <span role="status" className="text-xs">{status}</span>}
  </form>;
}
