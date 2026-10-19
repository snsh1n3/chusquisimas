"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export interface AdminProductImage {
  id: string;
  alt: string;
}

type Pending = { imageId: string; label: string } | null;

/**
 * Lista las fotografías de un producto en su orden. La primera es la principal
 * (portada en la tienda). Botones en lugar de arrastrar: funcionan igual en
 * teléfono y con teclado.
 */
export function ProductPhotoManager({ images }: { images: AdminProductImage[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<Pending>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  if (images.length === 0) {
    return <p className="mt-2 text-xs text-fg-muted">Sin fotografías todavía.</p>;
  }

  const expectedOrder = images.map((image) => image.id);

  async function send(body: Record<string, unknown>, label: string) {
    setPending({ imageId: String(body.imageId), label });
    setMessage("");
    try {
      const response = await fetch("/api/admin/images/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, expectedOrder }),
      });
      const payload = await response.json().catch(() => ({})) as { error?: string; requestId?: string };
      if (!response.ok) {
        throw new Error(payload.requestId
          ? `${payload.error ?? "No se pudo guardar"} (ref. ${payload.requestId})`
          : payload.error ?? "No se pudo guardar");
      }
      setConfirmDelete(null);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="mt-3 max-w-72">
      <strong className="text-xs">Fotografías ({images.length})</strong>
      <ol className="mt-2 flex flex-col gap-2">
        {images.map((image, index) => {
          const isFirst = index === 0;
          const isLast = index === images.length - 1;
          const isBusy = pending?.imageId === image.id;
          return (
            <li key={image.id} className="flex gap-2 rounded-control border border-line bg-surface p-2">
              {/* Miniatura privada del panel: sin optimizador de Next para no exponerla. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/images/${image.id}`}
                alt={image.alt}
                width={64}
                height={64}
                loading="lazy"
                className="h-16 w-16 shrink-0 rounded-control bg-panel object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-1 text-xs">
                <span className="truncate" title={image.alt}>{image.alt}</span>
                {isFirst && (
                  <span className="w-fit rounded-full bg-highlight px-2 py-0.5 font-bold text-on-highlight">
                    Principal
                  </span>
                )}
                <div className="flex flex-wrap gap-1" role="group" aria-label={`Acciones para ${image.alt}`}>
                  <button type="button" disabled={busy || isFirst}
                    onClick={() => send({ action: "move", imageId: image.id, direction: "up" }, "Subiendo")}
                    aria-label={`Subir ${image.alt}`}
                    className="rounded border px-2 py-1 disabled:opacity-30">↑</button>
                  <button type="button" disabled={busy || isLast}
                    onClick={() => send({ action: "move", imageId: image.id, direction: "down" }, "Bajando")}
                    aria-label={`Bajar ${image.alt}`}
                    className="rounded border px-2 py-1 disabled:opacity-30">↓</button>
                  {!isFirst && (
                    <button type="button" disabled={busy}
                      onClick={() => send({ action: "primary", imageId: image.id }, "Marcando principal")}
                      className="rounded border px-2 py-1 disabled:opacity-30">Principal</button>
                  )}
                  {confirmDelete === image.id ? (
                    <>
                      <button type="button" disabled={busy}
                        onClick={() => send({ action: "delete", imageId: image.id, confirmation: "ELIMINAR" }, "Eliminando")}
                        className="rounded bg-danger px-2 py-1 font-bold text-on-danger disabled:opacity-30">
                        Confirmar
                      </button>
                      <button type="button" disabled={busy} onClick={() => setConfirmDelete(null)}
                        className="rounded border px-2 py-1 disabled:opacity-30">Cancelar</button>
                    </>
                  ) : (
                    <button type="button" disabled={busy} onClick={() => setConfirmDelete(image.id)}
                      className="rounded border border-danger px-2 py-1 text-danger disabled:opacity-30">
                      Eliminar
                    </button>
                  )}
                </div>
                {isBusy && <span role="status">{pending?.label}…</span>}
              </div>
            </li>
          );
        })}
      </ol>
      {message && <p role="alert" className="mt-2 text-xs text-danger">{message}</p>}
    </div>
  );
}
