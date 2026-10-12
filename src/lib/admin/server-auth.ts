import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { verifyAccessToken, type AccessIdentity } from "./access-jwt";
import { authorizeAdmin, type AdminReadDatabase } from "./identity";
import type { AdminPermission, AdminPrincipal } from "./permissions";
import { AuthError, ConfigurationError, UpstreamError } from "@/lib/observability/errors";

type AdminBindings = {
  DB: AdminReadDatabase;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};

/** Mensajes de access-jwt que indican configuración del Worker, no del usuario. */
const ACCESS_CONFIGURATION_MESSAGES = new Set([
  "Dominio de Access no configurado",
  "Audience no configurado",
]);
const ACCESS_UPSTREAM_MESSAGE = "No se pudieron consultar las claves de Access";

/**
 * Server-only boundary: verified Access JWT AND active D1 account AND RBAC.
 * No fallback to email headers, local development bypasses or static roles.
 *
 * Todos los fallos se lanzan como AppError tipados para que las rutas puedan
 * registrarlos con su categoría real, sin cambiar la respuesta genérica.
 */
export async function requireAuthenticatedAdmin(
  permission: AdminPermission
): Promise<{ principal: AdminPrincipal; database: AdminReadDatabase }> {
  const incomingHeaders = await headers();
  // Distinct hostname is a deployment policy as well as an application guard.
  const host = incomingHeaders.get("host")?.toLowerCase();
  if (host !== "admin.chusquisimas.com") {
    throw new AuthError("admin_host_mismatch");
  }
  const context = await getCloudflareContext({ async: true });
  const env = context.env as typeof context.env & AdminBindings;
  if (!env.DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    throw new ConfigurationError("admin_bindings_missing", "Administración no configurada.");
  }
  const jwt = incomingHeaders.get("cf-access-jwt-assertion");

  const identity = await verifyIdentity(jwt, env);

  try {
    const principal = await authorizeAdmin(env.DB, identity, permission);
    return { principal, database: env.DB };
  } catch (error) {
    // Distingue "sin permiso" (esperado) de un fallo al consultar D1.
    if (error instanceof Error && error.message === "Acceso denegado.") {
      throw new AuthError("permission_denied", `Permiso ${permission} denegado.`, { cause: error });
    }
    throw error;
  }
}

/** Verifica el JWT de Access y traduce sus fallos a errores tipados. */
async function verifyIdentity(
  jwt: string | null,
  env: Pick<AdminBindings, "ACCESS_TEAM_DOMAIN" | "ACCESS_AUD">
): Promise<AccessIdentity> {
  try {
    return await verifyAccessToken(jwt, {
      teamDomain: env.ACCESS_TEAM_DOMAIN,
      audience: env.ACCESS_AUD,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (ACCESS_CONFIGURATION_MESSAGES.has(message)) {
      throw new ConfigurationError("access_config_invalid", message, { cause: error });
    }
    if (message === ACCESS_UPSTREAM_MESSAGE) {
      throw new UpstreamError("access_jwks_unavailable", message, { cause: error });
    }
    throw new AuthError(jwt ? "access_jwt_invalid" : "access_jwt_missing", "Acceso denegado.", {
      cause: error,
    });
  }
}
