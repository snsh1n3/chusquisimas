import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { can } from "@/lib/admin/permissions";
import { InventoryEditor } from "@/components/admin/inventory-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administración | Chusquisimas",
  robots: { index: false, follow: false },
};

interface AdminVariantRow {
  product_id: string;
  product_name: string;
  product_status: string;
  variant_id: string | null;
  sku: string | null;
  variant_label: string | null;
  aroma_name: string | null;
  on_hand: number | null;
  reserved: number | null;
  price_cop: number | null;
}

export default async function AdminHomePage() {
  let rows: AdminVariantRow[] = [];
  let canEditInventory = false;
  try {
    const { database, principal } = await requireAuthenticatedAdmin("catalog.read");
    canEditInventory = can(principal, "inventory.write");
    const response = await database.prepare(`
      SELECT p.id AS product_id, p.name AS product_name, p.status AS product_status,
        v.id AS variant_id, v.sku, v.label AS variant_label,
        a.name AS aroma_name, v.on_hand, v.reserved, v.price_cop
      FROM store_products p
      LEFT JOIN store_variants v ON v.product_id = p.id
      LEFT JOIN store_aromas a ON a.id = v.aroma_id
      ORDER BY p.name COLLATE NOCASE, v.sku
    `).bind().all<AdminVariantRow>();
    rows = response.results;
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
        <h1 className="mt-3 text-3xl font-bold">Inventario</h1>
        <p className="mt-3 text-sm text-[#66584D]">
          Existencias por variante y aroma. Cada ajuste requiere un motivo
          y queda registrado con la identidad del administrador.
        </p>
        <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6EADC]">
              <tr>
                <th scope="col" className="p-4">Producto</th>
                <th scope="col" className="p-4">Variante / aroma</th>
                <th scope="col" className="p-4">Precio</th>
                <th scope="col" className="p-4">En mano</th>
                <th scope="col" className="p-4">Reservadas</th>
                {canEditInventory && <th scope="col" className="p-4">Ajustar</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.product_id}:${row.variant_id ?? "none"}`}
                  className="border-t border-[#EDE3D7] align-top">
                  <td className="p-4">
                    <strong>{row.product_name}</strong>
                    <div className="text-xs text-[#66584D]">{row.product_status}</div>
                  </td>
                  <td className="p-4">
                    {row.variant_id ? (
                      <><div>{row.variant_label || row.aroma_name || "Sin presentación"}</div>
                        <div className="text-xs text-[#66584D]">{row.sku}</div></>
                    ) : "Sin variantes registradas"}
                  </td>
                  <td className="p-4">
                    {row.price_cop === null ? "Pendiente" :
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
                  Aún no hay productos cargados en D1.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
