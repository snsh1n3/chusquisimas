"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ProductPhotoUpload({ productId }: { productId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  async function upload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("productId", productId);
    setBusy(true); setResult("");
    try {
      const response = await fetch("/api/admin/images", { method: "POST", body: data });
      const payload = await response.json() as { error?: string };
      if (!response.ok) throw Error(payload.error || "Error de carga");
      form.reset();
      setResult("Fotografía guardada. Se mostrará cuando el producto esté publicado.");
      router.refresh();
    } catch (err) {
      setResult(err instanceof Error ? err.message : "No se pudo subir");
    } finally {
      setBusy(false);
    }
  }
  return <form onSubmit={upload} className="mt-2 flex max-w-60 flex-col gap-2 rounded-lg border p-3 text-xs">
    <strong>Fotografía del producto</strong>
    <input name="picture" aria-label="Fotografía" type="file" accept="image/png,image/jpeg,image/webp" required />
    <input name="alt" aria-label="Descripción accesible de la fotografía"
      placeholder="Descripción de la fotografía" minLength={2} maxLength={200} required
      className="rounded border p-2" />
    <button disabled={busy} className="rounded bg-[#231F20] p-2 text-white disabled:opacity-40" type="submit">
      {busy ? "Procesando..." : "Subir fotografía"}
    </button>
    <span role="status">{result}</span>
    <span>PNG, JPG o WebP, hasta 5 MB. Se convierte a WebP.</span>
  </form>;
}
