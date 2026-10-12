import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { updateInventory, type InventoryDatabase } from "@/lib/admin/inventory-service";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8192;

export const POST = withApiLogging("admin.inventory.update", async (request: NextRequest, ctx) => {
  // Admin mutations must originate from the protected admin hostname.
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  try {
    const { database, principal } = await requireAuthenticatedAdmin("inventory.write");
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new ValidationError("body_not_object", "Solicitud inválida");
    }
    const value = data as Record<string, unknown>;
    if (typeof value.variantId !== "string" ||
        typeof value.reason !== "string" ||
        typeof value.onHand !== "number" ||
        typeof value.expectedOnHand !== "number") {
      throw new ValidationError("inventory_body_invalid", "Solicitud inválida");
    }
    await updateInventory(
      database as unknown as InventoryDatabase,
      { variantId: value.variantId, onHand: value.onHand,
        expectedOnHand: value.expectedOnHand, reason: value.reason },
      principal.id,
      crypto.randomUUID()
    );
    ctx.logger.info("admin.inventory.updated", { actorId: principal.id, variantId: value.variantId });
    return NextResponse.json({ updated: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return adminErrorResponse(error, ctx);
  }
});
