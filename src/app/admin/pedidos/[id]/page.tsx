import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/order-actions";
import { can } from "@/lib/admin/permissions";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { classifyError } from "@/lib/observability/errors";
import { createLogger, describeError } from "@/lib/observability/logger";
import { formatBogota, getOrderDetail, type AdminOrderDetail } from "@/lib/orders/admin-queries";
import type { OrdersDatabase } from "@/lib/orders/order-db";
import { ORDER_STATUS_LABELS, ORDER_TRANSITIONS } from "@/lib/orders/order-service";
import { formatPriceCOP } from "@/types/catalog";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Pedido | Chusquisimas",
  robots: { index: false, follow: false },
};

export default async function AdminOrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  let order: AdminOrderDetail | null = null;
  let canWrite = false;
  try {
    const { database, principal } = await requireAuthenticatedAdmin("orders.read");
    canWrite = can(principal, "orders.write");
    order = await getOrderDetail(database as unknown as OrdersDatabase, id);
  } catch (error) {
    const logger = createLogger({ operation: "admin.order.render" });
    if (classifyError(error) === "auth") logger.warn("admin.page.denied", describeError(error));
    else logger.error("admin.page.failed", describeError(error));
    notFound();
  }
  if (!order) notFound();

  const total = order.subtotal_cop + (order.shipping_cop ?? 0);
  const phoneDigits = order.customer_phone.replace(/\D/g, "");

  return (
    <main className="min-h-screen bg-page p-6 text-fg sm:p-10">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/pedidos" className="text-sm font-bold underline underline-offset-4">← Pedidos</Link>
        <h1 className="mt-4 text-3xl font-bold tracking-wider">{order.code}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          {ORDER_STATUS_LABELS[order.status]} · registrado {formatBogota(order.created_at)}
          {order.status === "received" && order.expires_at && ` · vence ${formatBogota(order.expires_at)}`}
        </p>
        {order.cancel_reason && <p className="mt-2 text-sm">Motivo: {order.cancel_reason}</p>}

        {canWrite && (
          <section className="mt-6" aria-label="Cambiar estado">
            <OrderActions orderId={order.id} status={order.status} next={ORDER_TRANSITIONS[order.status]} />
          </section>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-bold">Cliente</h2>
            <p className="mt-2">{order.customer_name}</p>
            <p>{order.customer_city}</p>
            <a href={`https://wa.me/${phoneDigits}`} target="_blank" rel="noopener noreferrer"
              className="mt-2 inline-block font-bold underline underline-offset-4">
              {order.customer_phone}<span className="sr-only"> (abrir WhatsApp)</span>
            </a>
            <p className="mt-3 text-xs text-fg-muted">
              Autorizó el tratamiento de datos (aviso {order.privacy_notice_version}) el {formatBogota(order.privacy_consent_at)}.
            </p>
          </section>
          <section className="rounded-card border border-line bg-surface p-5">
            <h2 className="font-bold">Totales</h2>
            <dl className="mt-2 flex flex-col gap-1 text-sm">
              <div className="flex justify-between"><dt>Productos</dt><dd>{formatPriceCOP(order.subtotal_cop)}</dd></div>
              <div className="flex justify-between"><dt>{order.shipping_label}</dt>
                <dd>{order.shipping_cop === null ? "Por confirmar" : formatPriceCOP(order.shipping_cop)}</dd></div>
              <div className="flex justify-between font-bold"><dt>{order.shipping_cop === null ? "Total sin envío" : "Total"}</dt>
                <dd>{formatPriceCOP(total)}</dd></div>
            </dl>
          </section>
        </div>

        <section className="mt-6 overflow-x-auto rounded-card border border-line bg-surface">
          <table className="w-full text-left text-sm">
            <caption className="p-4 text-left font-bold">Productos</caption>
            <thead className="bg-panel">
              <tr>
                <th scope="col" className="p-3">Producto</th>
                <th scope="col" className="p-3">Cant.</th>
                <th scope="col" className="p-3">Entrega</th>
                <th scope="col" className="p-3">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, index) => (
                <tr key={index} className="border-t border-line">
                  <td className="p-3">{item.product_name}
                    <div className="text-xs text-fg-muted">{[item.variant_label, item.aroma].filter(Boolean)
                      .filter((v, i, all) => all.indexOf(v) === i).join(" · ")}</div></td>
                  <td className="p-3">{item.quantity}</td>
                  <td className="p-3">
                    {item.fulfillment === "ready_stock" ? "Inmediata" : `Bajo pedido (${item.preparation_days ?? 14} días)`}
                    {item.reserved_qty > 0 && <div className="text-xs text-fg-muted">{item.reserved_qty} apartadas</div>}
                  </td>
                  <td className="p-3">{formatPriceCOP(item.unit_price_cop * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-6 rounded-card border border-line bg-surface p-5">
          <h2 className="font-bold">Historial</h2>
          <ol className="mt-3 flex flex-col gap-2 text-sm">
            {order.events.map((event, index) => (
              <li key={index}>
                <span className="font-bold">{ORDER_STATUS_LABELS[event.to_status]}</span>
                {" · "}{formatBogota(event.created_at)}
                {" · "}{event.actor ?? "Sistema"}
                {event.note && <span className="text-fg-muted"> — {event.note}</span>}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </main>
  );
}
