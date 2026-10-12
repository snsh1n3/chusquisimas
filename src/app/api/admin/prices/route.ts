import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { updatePrice } from "@/lib/admin/price-service";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;

export const POST = withApiLogging("admin.prices.update", async (request: NextRequest, ctx) => {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  const type = request.headers.get("content-type") ?? "";
  if (!type.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  const size = Number(request.headers.get("content-length") ?? "0");
  if (!Number.isFinite(size) || size > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  try {
    const { principal, database } = await requireAuthenticatedAdmin("catalog.write");
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const data: unknown = JSON.parse(body);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      throw new ValidationError("body_not_object", "Solicitud inválida");
    }
    const v = data as Record<string, unknown>;
    if (typeof v.variantId !== "string" || !("priceCOP" in v) || !("expectedPriceCOP" in v)) {
      throw new ValidationError("price_body_invalid", "Solicitud inválida");
    }
    if (!(v.priceCOP === null || typeof v.priceCOP === "number") ||
        !(v.expectedPriceCOP === null || typeof v.expectedPriceCOP === "number")) {
      throw new ValidationError("price_invalid", "Precio COP inválido.");
    }
    await updatePrice(database as Parameters<typeof updatePrice>[0], {
      variantId: v.variantId, priceCOP: v.priceCOP,
      expectedPriceCOP: v.expectedPriceCOP,
    }, principal.id, crypto.randomUUID());
    ctx.logger.info("admin.price.updated", { actorId: principal.id, variantId: v.variantId });
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminErrorResponse(error, ctx);
  }
});
