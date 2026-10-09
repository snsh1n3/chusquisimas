import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { can } from "@/lib/admin/permissions";
import { InventoryEditor } from "@/components/admin/inventory-editor";
import { PriceEditor } from "@/components/admin/price-editor";
import { AddVariant } from "@/components/admin/add-variant";
import { ProductPhotoUpload } from "@/components/admin/product-photo-upload";
import { CreateProductForm, ProductVisibility, VariantVisibility, EditProduct } from "@/components/admin/product-manager";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administración | Chusquisimas",
  robots: { index: false, follow: false },
};

interface AdminVariantRow {
  product_id: string;
  product_name: string;
  product_type: "candle" | "wax_melt" | "kit" | "custom";
  product_description: string;
  product_status: "draft" | "active" | "archived";
  product_ready: number;
  variant_id: string | null;
  sku: string | null;
  variant_label: string | null;
  variant_status: "active" | "inactive" | null;
  aroma_name: string | null;
  on_hand: number | null;
  reserved: number | null;
  price_cop: number | null;
}

export default async function AdminHomePage({ searchParams }: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const showArchived = (await searchParams).archived === "1";
  let rows: AdminVariantRow[] = [];
  let aromas: { id: string; name: string }[] = [];
  let canEditInventory = false;
  let canManageProducts = false;
  let canEditPrices = false;
  try {
    const { database, principal } = await requireAuthenticatedAdmin("catalog.read");
    canEditInventory = can(principal, "inventory.write");
    canEditPrices = can(principal, "catalog.write");
    canManageProducts = canEditPrices;
    const response = await database.prepare(`
      SELECT p.id AS product_id, p.name AS product_name, p.description AS product_description, p.product_type, p.status AS product_status,
        EXISTS(SELECT 1 FROM store_variants av WHERE av.product_id=p.id AND av.status='active' AND av.price_cop IS NOT NULL) AS product_ready,
        v.id AS variant_id, v.sku, v.label AS variant_label, v.status AS variant_status,
        a.name AS aroma_name, v.on_hand, v.reserved, v.price_cop
      FROM store_products p
      LEFT JOIN store_variants v ON v.product_id = p.id
      LEFT JOIN store_aromas a ON a.id = v.aroma_id
      ORDER BY p.name COLLATE NOCASE, v.sku
    `).bind().all<AdminVariantRow>();
    rows = response.results.filter(row => showArchived ? row.product_status === "archived" : row.product_status !== "archived");
    aromas = (await database.prepare("SELECT id,name FROM store_aromas WHERE active=1 ORDER BY name COLLATE NOCASE").bind().all<{ id: string; name: string }>()).results;
  } catch {
    // Avoid revealing whether Access, provisioned identity or D1 is missing.
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#F7F1E9] p-6 text-[#231F20] sm:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C86021]">
          Chusquisimas Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold">Catálogo e inventario</h1>
        {canManageProducts && <section className="mt-7"><h2 className="text-xl font-bold">Añadir producto</h2><CreateProductForm /></section>}
        <p className="mt-3 text-sm text-[#66584D]">
          Existencias por variante y aroma. Cada ajuste requiere un motivo
          y queda registrado con la identidad del administrador.
        </p>
        <nav className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/admin" className={`rounded-lg px-4 py-2 ${!showArchived ? "bg-[#231F20] text-white" : "border bg-white"}`}>Catálogo activo y borradores</Link>
          <Link href="/admin?archived=1" className={`rounded-lg px-4 py-2 ${showArchived ? "bg-[#231F20] text-white" : "border bg-white"}`}>Ver archivados</Link>
        </nav>
        <div className="mt-5 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6EADC]">
              <tr>
                <th scope="col" className="p-4">Producto / visibilidad</th>
                <th scope="col" className="p-4">Variante / aroma</th>
                <th scope="col" className="p-4">Precio</th>
                <th scope="col" className="p-4">En mano</th>
                <th scope="col" className="p-4">Reservadas</th>
                {canEditInventory && <th scope="col" className="p-4">Ajustar</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.product_id}:${row.variant_id ?? "none"}`}
                  className="border-t border-[#EDE3D7] align-top">
                  <td className="p-4">
                    <strong>{row.product_name}</strong>
                    {(index === 0 || rows[index - 1]?.product_id !== row.product_id) && canManageProducts && <ProductPhotoUpload productId={row.product_id} />}
                    {(index === 0 || rows[index - 1]?.product_id !== row.product_id) && canManageProducts && <EditProduct id={row.product_id} initialName={row.product_name} initialDescription={row.product_description} initialType={row.product_type} status={row.product_status} />}
                    {index === 0 || rows[index - 1]?.product_id !== row.product_id ? (
                      canManageProducts ? <ProductVisibility id={row.product_id} status={row.product_status} canPublish={row.product_ready === 1} /> : <div className="text-xs">{row.product_status}</div>
                    ) : null}
                    {(index === 0 || rows[index - 1]?.product_id !== row.product_id) && row.product_status !== "active" && row.product_ready !== 1 && <div className="text-xs text-[#66584D]">Requiere variante activa con precio para publicar</div>}
                  </td>
                  <td className="p-4">
                    {row.variant_id ? (
                      <><div>{row.variant_label || row.aroma_name || "Sin presentación"}</div>
                        <div className="text-xs text-[#66584D]">{row.sku}</div>
                        {canEditPrices && row.variant_status && <VariantVisibility id={row.variant_id} status={row.variant_status} hasPrice={row.price_cop !== null} />}</>
                    ) : "Sin variantes registradas"}
                    {(index === 0 || rows[index - 1]?.product_id !== row.product_id) && canManageProducts && <AddVariant productId={row.product_id} productType={row.product_type} aromas={aromas} />}
                  </td>
                  <td className="p-4">
                    {canEditPrices && row.variant_id ? (
                      <PriceEditor key={`${row.variant_id}:${row.price_cop}`}
                        variantId={row.variant_id} previous={row.price_cop} />
                    ) : row.price_cop === null ? "Pendiente" :
                      new Intl.NumberFormat("es-CO", {
                        style: "currency", currency: "COP",
                        maximumFractionDigits: 0,
                      }).format(row.price_cop)}
                  </td>
                  <td className="p-4">{row.on_hand ?? "—"}</td>
                  <td className="p-4">{row.reserved ?? "—"}</td>
                  {canEditInventory && <td className="p-4">
                    {row.variant_id && row.on_hand !== null &&
                      <InventoryEditor key={`${row.variant_id}:${row.on_hand}`}
                        variantId={row.variant_id} initialOnHand={row.on_hand} />}
                  </td>}
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={canEditInventory ? 6 : 5} className="p-6 text-center">
                  {showArchived ? "No hay productos archivados." : "No hay productos activos ni borradores."}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
