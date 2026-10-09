import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { headers } from "next/headers";
import { verifyAccessToken } from "./access-jwt";
import { authorizeAdmin, type AdminReadDatabase } from "./identity";
import type { AdminPermission, AdminPrincipal } from "./permissions";

type AdminBindings = {
  DB: AdminReadDatabase;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
};

/**
 * Server-only boundary: verified Access JWT AND active D1 account AND RBAC.
 * No fallback to email headers, local development bypasses or static roles.
 */
export async function requireAuthenticatedAdmin(
  permission: AdminPermission
): Promise<{ principal: AdminPrincipal; database: AdminReadDatabase }> {
  const incomingHeaders = await headers();
  // Distinct hostname is a deployment policy as well as an application guard.
  const host = incomingHeaders.get("host")?.toLowerCase();
  if (host !== "admin.chusquisimas.com") {
    throw new Error("Acceso denegado.");
  }
  const context = await getCloudflareContext({ async: true });
  const env = context.env as typeof context.env & AdminBindings;
  if (!env.DB || !env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    throw new Error("Administración no configurada.");
  }
  const jwt = incomingHeaders.get("cf-access-jwt-assertion");
  const identity = await verifyAccessToken(jwt, {
    teamDomain: env.ACCESS_TEAM_DOMAIN,
    audience: env.ACCESS_AUD,
  });
  const principal = await authorizeAdmin(env.DB, identity, permission);
  return { principal, database: env.DB };
}
