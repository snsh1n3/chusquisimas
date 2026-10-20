import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ConfigurationError } from "@/lib/observability/errors";
import type { OrdersDatabase } from "./order-db";
import { isPrivacyNoticeComplete } from "@/lib/legal/privacy-notice";

/**
 * Configuración de pedidos desde el entorno del Worker.
 *
 * ORDERS_ENABLED="true" activa carrito y pedidos, siempre que el aviso de
 * privacidad tenga los datos del responsable. Si falta algo, la
 * ficha mantiene el pedido directo por WhatsApp y /api/orders responde 503.
 */
interface OrdersBindings {
  DB?: OrdersDatabase;
  ORDERS_ENABLED?: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  ORDER_RATE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

/** Sin aviso de privacidad completo no se recogen datos de clientes. */
function ordersActive(env: OrdersBindings): boolean {
  return env.ORDERS_ENABLED === "true" && isPrivacyNoticeComplete();
}

async function bindings(): Promise<OrdersBindings> {
  const context = await getCloudflareContext({ async: true });
  return context.env as unknown as OrdersBindings;
}

export async function getPublicOrdersConfig(): Promise<{ enabled: boolean; turnstileSiteKey: string }> {
  const env = await bindings();
  const turnstileSiteKey = env.TURNSTILE_SITE_KEY?.trim() ?? "";
  return { enabled: ordersActive(env) && turnstileSiteKey !== "", turnstileSiteKey };
}

export async function getOrdersRuntime() {
  const env = await bindings();
  if (!env.DB) throw new ConfigurationError("orders_db_missing", "Pedidos no disponibles.");
  return {
    db: env.DB,
    enabled: ordersActive(env),
    turnstileSecret: env.TURNSTILE_SECRET_KEY?.trim() ?? "",
    rateLimiter: env.ORDER_RATE_LIMITER,
  };
}
