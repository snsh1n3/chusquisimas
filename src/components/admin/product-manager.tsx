"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type ProductStatus = "draft" | "active" | "archived";
type ProductType = "candle" | "wax_melt" | "kit" | "custom";
export interface CategoryOption { id: string; name: string }

/** Categoría sugerida para cada tipo (la misma regla del servidor). */
const DEFAULT_CATEGORY: Record<ProductType, string> = {
  candle: "cat-velas-aromaticas",
  wax_melt: "cat-wax-melts",
  kit: "cat-kits",
  custom: "cat-personalizados",
};

function TypeOptions() {
  return <>
    <option value="candle">Vela</option>
    <option value="wax_melt">Wax melts</option>
    <option value="kit">Kit</option>
    <option value="custom">Otro / personalizado</option>
  </>;
}

export function CreateProductForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<ProductType>("candle");
  const [categoryId, setCategoryId] = useState(DEFAULT_CATEGORY.candle);
  // Mientras no se elija una categoría a mano, sigue la sugerida por el tipo.
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", name, description, productType, categoryId }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || "No se pudo crear");
      setName(""); setDescription(""); setCategoryTouched(false);
      setCategoryId(DEFAULT_CATEGORY[productType]);
      setNotice("Producto creado como borrador. Aún no es visible en la tienda.");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error inesperado");
    } finally { setBusy(false); }
  }

  return (
    <form onSubmit={create} className="mt-5 grid gap-3 rounded-control bg-surface p-5 sm:grid-cols-2">
      <label className="grid gap-1 text-sm">Nombre
        <input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)}
          className="rounded-control border p-3" placeholder="Nombre del producto" />
      </label>
      <label className="grid gap-1 text-sm">Tipo
        <select value={productType} onChange={e => {
          const type = e.target.value as ProductType;
          setProductType(type);
          if (!categoryTouched) setCategoryId(DEFAULT_CATEGORY[type]);
        }} className="rounded-control border p-3">
          <TypeOptions />
        </select>
      </label>
      <label className="grid gap-1 text-sm">Categoría en la tienda
        <select value={categoryId} onChange={e => { setCategoryId(e.target.value); setCategoryTouched(true); }}
          className="rounded-control border p-3">
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <label className="grid gap-1 text-sm sm:col-span-2">Descripción
        <textarea maxLength={2000} rows={2} value={description}
          onChange={e => setDescription(e.target.value)} className="rounded-control border p-3" />
      </label>
      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <button type="submit" disabled={busy} className="rounded-control bg-inverse px-5 py-3 font-semibold text-on-inverse disabled:opacity-40">
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
        className="rounded-control border bg-surface p-2 text-xs">
        <option value="draft">Borrador (oculto)</option>
        <option value="active" disabled={!canPublish && status !== "active"}>Publicado</option>
        <option value="archived">Archivado (oculto)</option>
      </select>
      <button type="button" onClick={save} disabled={busy || selected === status}
        className="rounded-control bg-inverse px-3 py-2 text-xs text-on-inverse disabled:opacity-35">
        Guardar estado
      </button>
      {notice && <span role="status" className="text-xs">{notice}</span>}
    </div>
  );
}

export function VariantVisibility({
  id, status, hasPrice,
}: { id: string; status: "active" | "inactive"; hasPrice: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function toggle() {
    setBusy(true); setNotice("");
    try {
      const response = await fetch("/api/admin/variants", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: id, previous: status, target: status === "active" ? "inactive" : "active" }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw Error(data.error || "No se pudo actualizar");
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Error inesperado");
    } finally { setBusy(false); }
  }
  return (
    <div className="mt-2">
      <button type="button" disabled={busy || (status === "inactive" && !hasPrice)}
        onClick={toggle} className="rounded border px-2 py-1 text-xs disabled:opacity-40">
        {status === "active" ? "Desactivar variante" : "Activar variante"}
      </button>
      {!hasPrice && <p className="text-xs text-fg-muted">Define un precio primero</p>}
      {notice && <p role="status" className="text-xs">{notice}</p>}
    </div>
  );
}

export function EditProduct({
  id, initialName, initialDescription, initialType, initialCategory, categories, status,
}: {
  id: string; initialName: string; initialDescription: string;
  initialType: ProductType;
  initialCategory: string;
  categories: CategoryOption[];
  status: ProductStatus;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [productType, setProductType] = useState(initialType);
  const [categoryId, setCategoryId] = useState(initialCategory || DEFAULT_CATEGORY[initialType]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  async function request(payload: Record<string, unknown>) {
    const response = await fetch("/api/admin/products", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json() as { error?: string };
    if (!response.ok) throw Error(data.error || "Operación rechazada");
    router.refresh();
  }
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice("");
    try {
      await request({ action: "edit", id, expectedName: initialName, name, description, productType, categoryId });
      setNotice("Cambios guardados.");
      setOpen(false);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error inesperado");
    } finally { setBusy(false); }
  }
  async function permanentlyDelete() {
    const confirmation = window.prompt(
      'Eliminará permanentemente el producto y sus variantes sin movimientos. Escribe ELIMINAR para continuar.'
    );
    if (confirmation !== "ELIMINAR") return;
    setBusy(true); setNotice("");
    try {
      await request({ action: "delete", id, expectedName: initialName, confirmation });
      setNotice("Producto eliminado de forma definitiva.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally { setBusy(false); }
  }
  async function archive() {
    if (!window.confirm(`¿Archivar "${initialName}"? Se ocultará de la tienda, pero conservará sus variantes y auditorías.`)) return;
    setBusy(true); setNotice("");
    try {
      await request({ action: "visibility", id, previous: status, target: "archived" });
      setNotice("Producto archivado.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Error inesperado");
    } finally { setBusy(false); }
  }
  return <div className="mt-2 text-xs">
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setOpen(v => !v)}
        className="rounded border px-2 py-1">Editar producto</button>
      {status === "archived" && <button type="button" disabled={busy} onClick={permanentlyDelete}
        className="rounded border border-danger px-2 py-1 font-semibold text-danger disabled:opacity-40">
        Eliminar definitivamente
      </button>}
      {status !== "archived" && <button type="button" disabled={busy} onClick={archive}
        className="rounded border border-line-control px-2 py-1 text-danger disabled:opacity-40">
        Archivar / retirar
      </button>}
    </div>
    {open && <form onSubmit={save} className="mt-2 flex min-w-44 flex-col gap-2 rounded border bg-surface p-2">
      <label>Nombre
        <input required minLength={2} maxLength={120} value={name}
          onChange={e => setName(e.target.value)} className="w-full rounded border p-2" />
      </label>
      <label>Descripción
        <textarea maxLength={2000} value={description}
          onChange={e => setDescription(e.target.value)} className="w-full rounded border p-2" />
      </label>
      <label>Tipo
        <select value={productType} onChange={e => setProductType(e.target.value as ProductType)}
          className="w-full rounded border p-2">
          <TypeOptions />
        </select>
      </label>
      <label>Categoría en la tienda
        <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
          className="w-full rounded border p-2">
          {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </label>
      <button type="submit" disabled={busy}
        className="rounded bg-inverse px-2 py-2 text-on-inverse disabled:opacity-40">
        {busy ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>}
    {notice && <p role="status" className="mt-1">{notice}</p>}
  </div>;
}
