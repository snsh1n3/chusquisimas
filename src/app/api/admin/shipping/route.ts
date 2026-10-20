import { NextRequest, NextResponse } from "next/server";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { readJsonBody } from "@/lib/http/json-body";
import { withApiLogging } from "@/lib/observability/with-api-logging";
import type { OrdersDatabase } from "@/lib/orders/order-db";
import { updateShippingZone, validateShippingZoneEdit } from "@/lib/orders/shipping-service";

export const dynamic = "force-dynamic";

export const POST = withApiLogging("admin.shipping.update", async (request: NextRequest, ctx) => {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  try {
    const body = await readJsonBody(request, 2048);
    if (!body.ok) return body.response;
    const { database, principal } = await requireAuthenticatedAdmin("orders.write");
    const edit = validateShippingZoneEdit(body.value);
    await updateShippingZone(database as unknown as OrdersDatabase, edit, principal.id,
      crypto.randomUUID(), new Date());
    ctx.logger.info("admin.shipping.updated", { actorId: principal.id, zone: edit.zone, priceCOP: edit.priceCOP });
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error, ctx);
  }
});
