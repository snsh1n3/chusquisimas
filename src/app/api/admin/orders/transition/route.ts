import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { readJsonBody } from "@/lib/http/json-body";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";
import type { OrdersDatabase } from "@/lib/orders/order-db";
import { isOrderStatus, transitionOrder } from "@/lib/orders/order-service";

export const dynamic = "force-dynamic";

export const POST = withApiLogging("admin.orders.transition", async (request: NextRequest, ctx) => {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  try {
    const body = await readJsonBody(request, 4096);
    if (!body.ok) return body.response;
    const { database, principal } = await requireAuthenticatedAdmin("orders.write");
    const value = (body.value ?? {}) as Record<string, unknown>;
    if (typeof value.orderId !== "string" || !/^[0-9a-f-]{36}$/i.test(value.orderId) ||
        !isOrderStatus(value.from) || !isOrderStatus(value.to) ||
        (value.note !== undefined && typeof value.note !== "string")) {
      throw new ValidationError("order_transition_body_invalid", "Solicitud inválida.");
    }
    await transitionOrder(database as unknown as OrdersDatabase,
      { orderId: value.orderId, from: value.from, to: value.to, note: value.note as string | undefined },
      { actorUserId: principal.id, eventId: crypto.randomUUID(), now: new Date(), newId: () => crypto.randomUUID() });
    ctx.logger.info("admin.order.transitioned", {
      actorId: principal.id, orderId: value.orderId, from: value.from, to: value.to,
    });
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error, ctx);
  }
});
