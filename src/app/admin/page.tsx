import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Administración | Chusquisimas",
  robots: { index: false, follow: false },
};

interface AdminCatalogRow {
  id: string;
  name: string;
  status: string;
  variants_count: number;
  total_stock: number;
}

export default async function AdminHomePage() {
  let rows: AdminCatalogRow[] = [];
  try {
    const { database } = await requireAuthenticatedAdmin("catalog.read");
    const response = await database.prepare(`
      SELECT p.id, p.name, p.status,
        COUNT(v.id) AS variants_count,
        COALESCE(SUM(v.on_hand - v.reserved), 0) AS total_stock
      FROM store_products p
      LEFT JOIN store_variants v ON v.product_id = p.id
      GROUP BY p.id, p.name, p.status
      ORDER BY p.name COLLATE NOCASE
    `).bind().all<AdminCatalogRow>();
    rows = response.results;
  } catch {
    // Do not reveal whether Access, user provisioning or D1 is missing.
    notFound();
  }
  return (
    <main className="min-h-screen bg-[#F7F1E9] p-6 text-[#231F20] sm:p-10">
      <div className="mx-auto max-w-5xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[#C86021]">
          Chusquisimas Admin
        </p>
        <h1 className="mt-3 text-3xl font-bold">Inventario</h1>
        <p className="mt-3 text-sm text-[#66584D]">
          Vista de consulta protegida. Las modificaciones y cargas de imágenes
          estarán disponibles tras habilitar las operaciones auditadas.
        </p>
        <div className="mt-8 overflow-x-auto rounded-2xl bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F6EADC]">
              <tr>
                <th scope="col" className="p-4">Producto</th>
                <th scope="col" className="p-4">Estado</th>
                <th scope="col" className="p-4">Variantes</th>
                <th scope="col" className="p-4">Existencias disponibles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[#EDE3D7]">
                  <td className="p-4 font-semibold">{row.name}</td>
                  <td className="p-4">{row.status}</td>
                  <td className="p-4">{row.variants_count}</td>
                  <td className="p-4">{row.total_stock}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center">
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
