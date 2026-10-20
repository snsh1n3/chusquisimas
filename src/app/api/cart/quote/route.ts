import { NextRequest, NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/admin/api-errors";
import { isSameSiteOrigin, readJsonBody } from "@/lib/http/json-body";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";
import { quoteCart } from "@/lib/orders/cart-quote";
import { validateOrderLines } from "@/lib/orders/order-inputs";
import { getOrdersRuntime } from "@/lib/orders/runtime";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;

/** Precios y disponibilidad públicos del carrito, más las tarifas de envío. */
export const POST = withApiLogging("public.cart.quote", async (request: NextRequest, ctx) => {
  try {
    if (!isSameSiteOrigin(request, SITE_URL)) {
      return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
    }
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    if (!body.value || typeof body.value !== "object") {
      throw new ValidationError("body_not_object", "Solicitud inválida.");
    }
    const items = validateOrderLines((body.value as Record<string, unknown>).items);
    const { db } = await getOrdersRuntime();
    const quote = await quoteCart(db, items);
    return NextResponse.json(quote, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return publicErrorResponse(error, ctx);
  }
});
