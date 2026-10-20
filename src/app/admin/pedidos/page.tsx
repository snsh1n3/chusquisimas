import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShippingEditor } from "@/components/admin/shipping-editor";
import { can } from "@/lib/admin/permissions";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { classifyError } from "@/lib/observability/errors";
import { createLogger, describeError } from "@/lib/observability/logger";
import { formatBogota, listOrders, type AdminOrderSummary } from "@/lib/orders/admin-queries";
import type { OrdersDatabase } from "@/lib/orders/order-db";
import {
  ORDER_STATUSES, ORDER_STATUS_LABELS, isOrderStatus, releaseExpiredOrders, type OrderStatus,
} from "@/lib/orders/order-service";
import { listShippingZones, type ShippingZoneView } from "@/lib/orders/shipping-service";
import { formatPriceCOP } from "@/types/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pedidos | Chusquisimas",
  robots: { index: false, follow: false },
};

const FILTERS: Array<{ value: OrderStatus | "open" | "all"; label: string }> = [
  { value: "open", label: "Abiertos" },
  ...ORDER_STATUSES.map((status) => ({ value: status, label: ORDER_STATUS_LABELS[status] })),
  { value: "all", label: "Todos" },
];

export default async function AdminOrdersPage({ searchParams }: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const requested = (await searchParams).estado;
  const filter = requested === "all" || isOrderStatus(requested) ? requested : "open";
  let orders: AdminOrderSummary[] = [];
  let zones: ShippingZoneView[] = [];
  let canWrite = false;
  try {
    const { database, principal } = await requireAuthenticatedAdmin("orders.read");
    const db = database as unknown as OrdersDatabase;
    canWrite = can(principal, "orders.write");
    // Libera reservas vencidas antes de mostrar la lista.
    await releaseExpiredOrders(db, new Date(), () => crypto.randomUUID());
    [orders, zones] = await Promise.all([listOrders(db, filter), listShippingZones(db)]);
  } catch (error) {
    const logger = createLogger({ operation: "admin.orders.render" });
    if (classifyError(error) === "auth") logger.warn("admin.page.denied", describeError(error));
    else logger.error("admin.page.failed", describeError(error));
    notFound();
  }

  return (
    <main className="min-h-screen bg-page p-6 text-fg sm:p-10">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-fg-accent">Chusquisimas Admin</p>
        <nav aria-label="Secciones del panel" className="mt-3 flex gap-4 text-sm font-bold">
          <Link href="/admin" className="pb-1 text-fg-muted hover:text-fg">Catálogo</Link>
          <span aria-current="page" className="border-b-2 border-line-strong pb-1">Pedidos</span>
        </nav>
        <h1 className="mt-3 text-3xl font-bold">Pedidos</h1>
        <p className="mt-2 text-sm text-fg-muted">
          Los pedidos en «Recibido» apartan sus unidades 48 horas; si no pasan a «En preparación», se cancelan solos.
        </p>

        <nav aria-label="Filtrar por estado" className="mt-6 flex flex-wrap gap-2 text-sm">
          {FILTERS.map((item) => (
            <Link key={item.value} href={item.value === "open" ? "/admin/pedidos" : `/admin/pedidos?estado=${item.value}`}
              aria-current={filter === item.value ? "page" : undefined}
              className={`rounded-control px-4 py-2 ${filter === item.value ? "bg-inverse text-on-inverse" : "border bg-surface"}`}>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <thead className="bg-panel">
              <tr>
                <th scope="col" className="p-4">Pedido</th>
                <th scope="col" className="p-4">Cliente</th>
                <th scope="col" className="p-4">Estado</th>
                <th scope="col" className="p-4">Unidades</th>
                <th scope="col" className="p-4">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-line align-top">
                  <td className="p-4">
                    <Link href={`/admin/pedidos/${order.id}`} className="font-bold underline underline-offset-4">{order.code}</Link>
                    <div className="text-xs text-fg-muted">{formatBogota(order.created_at)}</div>
                  </td>
                  <td className="p-4">{order.customer_name}<div className="text-xs text-fg-muted">{order.customer_city}</div></td>
                  <td className="p-4">
                    {ORDER_STATUS_LABELS[order.status]}
                    {order.status === "received" && order.expires_at && (
                      <div className="text-xs text-fg-muted">Vence {formatBogota(order.expires_at)}</div>
                    )}
                  </td>
                  <td className="p-4">{order.units}</td>
                  <td className="p-4">
                    {formatPriceCOP(order.subtotal_cop + (order.shipping_cop ?? 0))}
                    {order.shipping_cop === null && <div className="text-xs text-fg-muted">+ envío por confirmar</div>}
                  </td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center">No hay pedidos con este filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <section className="mt-10" aria-labelledby="shipping-title">
          <h2 id="shipping-title" className="text-xl font-bold">Tarifas de envío</h2>
          <p className="mt-1 text-sm text-fg-muted">
            El cliente elige una al registrar el pedido. El valor queda guardado en el pedido aunque después lo cambies.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {zones.map((zone) => canWrite ? (
              <ShippingEditor key={`${zone.id}:${zone.label}:${zone.priceCOP}`} zone={zone} />
            ) : (
              <div key={zone.id} className="rounded-card border border-line bg-surface p-4">
                <strong>{zone.label}</strong>
                <div>{zone.priceCOP === null ? "Por confirmar" : formatPriceCOP(zone.priceCOP)}</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
