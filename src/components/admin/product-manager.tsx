"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductStatus = "draft" | "active" | "archived";

export function CreateProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState("candle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, description, productType }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || "No se pudo crear");
      setName(""); setDescription("");
      setNotice("Producto creado como borrador. Aún no es visible en la tienda.");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error inesperado");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={create} className="mt-5 grid gap-3 rounded-xl bg-white p-5 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Nombre
        <input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)}
          className="rounded-lg border p-3" placeholder="Nombre del producto" />
      </label>
      <label className="grid gap-1 text-sm">Tipo
        <select value={productType} onChange={e => setProductType(e.target.value)} className="rounded-lg border p-3">
          <option value="candle">Vela</option>
          <option value="wax_melt">Wax melts</option>
          <option value="kit">Kit</option>
          <option value="custom">Personalizado</option>
        </select>
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">Descripción
        <textarea maxLength={2000} rows={2} value={description}
          onChange={e => setDescription(e.target.value)} className="rounded-lg border p-3" />
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-lg bg-[#231F20] px-5 py-3 font-semibold text-white disabled:opacity-40">
          {busy ? "Creando..." : "Crear borrador"}
        </button>
        <p role="status" className="text-sm">{notice}</p>
      </div>
    </form>
  );
}

export function ProductVisibility({
  id, status, canPublish,
}: { id: string; status: ProductStatus; canPublish: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [selected, setSelected] = useState<ProductStatus>(status);
  async function save() {
    if (selected === status) return;
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "visibility", id, previous: status, target: selected }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || "No se pudo actualizar");
      router.refresh();
      setNotice("Estado actualizado");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error inesperado");
    } finally { setBusy(false); }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Visibilidad del producto" value={selected}
        onChange={e => setSelected(e.target.value as ProductStatus)}
        className="rounded-lg border bg-white p-2 text-xs">
        <option value="draft">Borrador (oculto)</option>
        <option value="active" disabled={!canPublish && status !== "active"}>Publicado</option>
        <option value="archived">Archivado (oculto)</option>
      </select>
      <button type="button" onClick={save} disabled={busy || selected === status}
        className="rounded-lg bg-[#231F20] px-3 py-2 text-xs text-white disabled:opacity-35">
        Guardar estado
      </button>
      {notice && <span role="status" className="text-xs">{notice}</span>}
    </div>
  );
}
