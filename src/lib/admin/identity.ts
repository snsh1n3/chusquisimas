import type { AdminPermission, AdminPrincipal, AdminRole } from "./permissions.ts";
import { requirePermission } from "./permissions.ts";
import type { AccessIdentity } from "./access-jwt.ts";

interface RowUser { id: string; status: string; }
interface RowRole { role_id: string; }
interface RowOverride { permission_key: string; allowed: number; }

/** Small D1 query interface, intentionally mockable for tests. */
export interface AdminReadDatabase {
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T>(): Promise<T | null>;
      all<T>(): Promise<{ results: T[] }>;
    };
  };
}

const VALID_ROLES = new Set<AdminRole>([
  "administrator", "manager", "inventory", "viewer",
]);
const VALID_PERMISSIONS = new Set<AdminPermission>([
  "catalog.read", "catalog.write", "inventory.write", "media.write",
  "audit.read", "users.manage", "permissions.manage",
]);

/** Deny by default: Access identity alone never grants a store permission. */
export async function loadAdminPrincipal(
  database: AdminReadDatabase,
  identity: AccessIdentity
): Promise<AdminPrincipal | null> {
  const user = await database.prepare(
    "SELECT id, status FROM admin_users WHERE email = ? COLLATE NOCASE LIMIT 1"
  ).bind(identity.email).first<RowUser>();
  if (!user || user.status !== "active") return null;

  const roles = await database.prepare(
    "SELECT role_id FROM admin_user_roles WHERE user_id = ?"
  ).bind(user.id).all<RowRole>();
  const overrides = await database.prepare(
    "SELECT permission_key, allowed FROM admin_user_permission_overrides WHERE user_id = ?"
  ).bind(user.id).all<RowOverride>();

  const recognizedRoles = roles.results.map((row) => row.role_id)
    .filter((role): role is AdminRole => VALID_ROLES.has(role as AdminRole));
  const permissionOverrides: Partial<Record<AdminPermission, boolean>> = {};
  for (const row of overrides.results) {
    if (VALID_PERMISSIONS.has(row.permission_key as AdminPermission)) {
      permissionOverrides[row.permission_key as AdminPermission] = row.allowed === 1;
    }
  }
  return { id: user.id, status: "active", roles: recognizedRoles,
    overrides: permissionOverrides };
}

export async function authorizeAdmin(
  database: AdminReadDatabase,
  identity: AccessIdentity,
  permission: AdminPermission
): Promise<AdminPrincipal> {
  const principal = await loadAdminPrincipal(database, identity);
  requirePermission(principal, permission);
  return principal!;
}
