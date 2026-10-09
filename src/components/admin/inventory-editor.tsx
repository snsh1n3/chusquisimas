"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface InventoryEditorProps {
  variantId: string;
  initialOnHand: number;
}

export function InventoryEditor({ variantId, initialOnHand }: InventoryEditorProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(String(initialOnHand));
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = Number(quantity);
    if (!Number.isSafeInteger(next) || next < 0 || reason.trim().length < 3) {
      setMessage("Indica existencias válidas y un motivo de al menos 3 caracteres.");
      return;
    }
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          variantId,
          expectedOnHand: initialOnHand,
          onHand: next,
          reason: reason.trim(),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) {
        setMessage(result.error ?? "No se pudo guardar el cambio.");
        if (response.status === 409) router.refresh();
        return;
      }
      setReason("");
      setMessage("Existencias actualizadas.");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar. Vuelve a intentarlo.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <form onSubmit={save} className="flex min-w-52 flex-col gap-2">
      <label className="sr-only" htmlFor={`stock-${variantId}`}>Nuevas existencias</label>
      <input
        id={`stock-${variantId}`}
        type="number"
        min="0"
        step="1"
        required
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        className="w-24 rounded-lg border border-[#C8BDB1] p-2"
      />
      <label className="sr-only" htmlFor={`reason-${variantId}`}>Motivo del ajuste</label>
      <input
        id={`reason-${variantId}`}
        type="text"
        minLength={3}
        maxLength={500}
        required
        placeholder="Motivo del ajuste"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        className="rounded-lg border border-[#C8BDB1] p-2"
      />
      <button
        disabled={loading || String(initialOnHand) === quantity}
        className="rounded-lg bg-[#231F20] px-4 py-2 font-bold text-white disabled:opacity-40"
        type="submit"
      >
        {loading ? "Guardando..." : "Guardar"}
      </button>
      {message && <p role="status" className="text-xs text-[#66584D]">{message}</p>}
    </form>
  );
}
