"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@/lib/orders/order-service";

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  preparing: "Pasar a «En preparación»",
  shipped: "Marcar como enviado",
  delivered: "Marcar como entregado",
  cancelled: "Cancelar pedido",
};

/** Botones de cambio de estado. Cancelar pide confirmación y motivo. */
export function OrderActions({ orderId, status, next }: {
  orderId: string;
  status: OrderStatus;
  next: readonly OrderStatus[];
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  async function move(to: OrderStatus) {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/orders/transition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, from: status, to, note: note.trim() || undefined }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; requestId?: string };
      if (!response.ok) {
        setMessage(payload.requestId ? `${payload.error ?? "No se pudo guardar"} (ref. ${payload.requestId})`
          : payload.error ?? "No se pudo guardar");
      }
      setConfirmCancel(false);
      setNote("");
      router.refresh();
    } catch {
      setMessage("No se pudo conectar");
    } finally {
      setPending(false);
    }
  }

  if (next.length === 0) return null;
  const forward = next.filter((to) => to !== "cancelled");
  const canCancel = next.includes("cancelled");

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {forward.map((to) => (
          <button key={to} type="button" disabled={pending} onClick={() => move(to)}
            className="rounded-control bg-inverse px-4 py-2 text-sm font-bold text-on-inverse disabled:opacity-40">
            {ACTION_LABELS[to]}
          </button>
        ))}
        {canCancel && !confirmCancel && (
          <button type="button" disabled={pending} onClick={() => setConfirmCancel(true)}
            className="rounded-control border border-danger px-4 py-2 text-sm font-bold text-danger disabled:opacity-40">
            Cancelar pedido
          </button>
        )}
      </div>
      {confirmCancel && (
        <div className="flex flex-col gap-2 rounded-control border border-danger p-3">
          <label htmlFor="cancel-note" className="text-sm font-bold">Motivo de la cancelación</label>
          <input id="cancel-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300}
            placeholder="Ej.: el cliente no confirmó el pago" className="rounded-control border border-line-control p-2 text-sm" />
          <p className="text-xs text-fg-muted">Las unidades apartadas vuelven a quedar disponibles.</p>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={() => move("cancelled")}
              className="rounded-control bg-danger px-4 py-2 text-sm font-bold text-on-danger disabled:opacity-40">
              Confirmar cancelación
            </button>
            <button type="button" disabled={pending} onClick={() => setConfirmCancel(false)}
              className="rounded-control border px-4 py-2 text-sm">Volver</button>
          </div>
        </div>
      )}
      {pending && <span role="status" className="text-xs">Guardando…</span>}
      {message && <p role="alert" className="text-sm text-danger">{message}</p>}
    </div>
  );
}
