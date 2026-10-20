import { NextRequest, NextResponse } from "next/server";
import { publicErrorResponse } from "@/lib/admin/api-errors";
import { isSameSiteOrigin, readJsonBody } from "@/lib/http/json-body";
import { ConfigurationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";
import { validateOrderInput } from "@/lib/orders/order-inputs";
import { createRegisteredOrderWhatsAppUrl } from "@/lib/orders/order-message";
import { createOrder, releaseExpiredOrders } from "@/lib/orders/order-service";
import { getOrdersRuntime } from "@/lib/orders/runtime";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8192;
const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Registro de pedidos desde la tienda pública.
 * Orden de controles: activación → origen → límite por IP → cuerpo →
 * validación → Turnstile → D1. Lo barato y lo que filtra bots va primero.
 */
export const POST = withApiLogging("public.orders.create", async (request: NextRequest, ctx) => {
  try {
    const runtime = await getOrdersRuntime();
    if (!runtime.enabled) {
      return NextResponse.json({ error: "Los pedidos en línea aún no están disponibles." },
        { status: 503, headers: NO_STORE });
    }
    if (!isSameSiteOrigin(request, SITE_URL)) {
      ctx.logger.warn("api.origin_rejected");
      return NextResponse.json({ error: "Origen no autorizado" }, { status: 403, headers: NO_STORE });
    }
    const ip = request.headers.get("cf-connecting-ip");
    if (runtime.rateLimiter && ip) {
      const { success } = await runtime.rateLimiter.limit({ key: `orders:${ip}` });
      if (!success) {
        ctx.logger.warn("orders.rate_limited");
        return NextResponse.json({ error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
          { status: 429, headers: { ...NO_STORE, "Retry-After": "60" } });
      }
    }
    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) return body.response;
    const order = validateOrderInput(body.value);

    if (!runtime.turnstileSecret) {
      throw new ConfigurationError("turnstile_secret_missing", "Pedidos no disponibles.");
    }
    await verifyTurnstile((body.value as Record<string, unknown>).turnstileToken, {
      secret: runtime.turnstileSecret,
      remoteIp: ip,
      idempotencyKey: ctx.requestId.length === 36 ? ctx.requestId : undefined,
    });

    const now = new Date();
    const newId = () => crypto.randomUUID();
    await releaseExpiredOrders(runtime.db, now, newId);
    const created = await createOrder(runtime.db, order, { now: () => now, newId });

    ctx.logger.info("orders.created", {
      orderCode: created.code,
      lines: created.lines.length,
      units: created.lines.reduce((sum, line) => sum + line.quantity, 0),
      madeToOrderLines: created.lines.filter((line) => line.fulfillment === "made_to_order").length,
      subtotalCOP: created.subtotalCOP,
      shippingZone: order.shippingZone,
    });
    return NextResponse.json({
      code: created.code,
      whatsappUrl: createRegisteredOrderWhatsAppUrl(created),
      order: {
        lines: created.lines,
        subtotalCOP: created.subtotalCOP,
        shippingLabel: created.shippingLabel,
        shippingCOP: created.shippingCOP,
        expiresAt: created.expiresAt,
      },
    }, { status: 201, headers: NO_STORE });
  } catch (error) {
    return publicErrorResponse(error, ctx);
  }
});
