import type { AdminPermission, AdminPrincipal, AdminRole } from "./permissions.ts";
import {
  isAdminPermission, isAdminRole, requirePermission, resolveEffectivePermissions,
} from "./permissions.ts";
import type { AccessIdentity } from "./access-jwt.ts";

interface RowUser { id: string; status: string; }
interface RowRole { role_id: string; }
interface RowRolePermission { permission_key: string; }
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

/**
 * Deny by default: Access identity alone never grants a store permission.
 *
 * Los permisos efectivos se leen de D1 (admin_role_permissions + overrides).
 * Claves de rol o permiso desconocidas para el código se ignoran: una fila
 * inesperada en la base nunca amplía privilegios.
 */
export async function loadAdminPrincipal(
  database: AdminReadDatabase,
  identity: AccessIdentity
): Promise<AdminPrincipal | null> {
  const user = await database.prepare(
    "SELECT id, status FROM admin_users WHERE email = ? COLLATE NOCASE LIMIT 1"
  ).bind(identity.email).first<RowUser>();
  if (!user || user.status !== "active") return null;

  const [roles, rolePermissions, overrides] = await Promise.all([
    database.prepare(
      "SELECT role_id FROM admin_user_roles WHERE user_id = ?"
    ).bind(user.id).all<RowRole>(),
    database.prepare(
      `SELECT DISTINCT rp.permission_key FROM admin_user_roles ur
        JOIN admin_role_permissions rp ON rp.role_id = ur.role_id
        WHERE ur.user_id = ?`
    ).bind(user.id).all<RowRolePermission>(),
    database.prepare(
      "SELECT permission_key, allowed FROM admin_user_permission_overrides WHERE user_id = ?"
    ).bind(user.id).all<RowOverride>(),
  ]);

  const recognizedRoles: AdminRole[] = roles.results
    .map((row) => row.role_id)
    .filter(isAdminRole);
  const inherited: AdminPermission[] = rolePermissions.results
    .map((row) => row.permission_key)
    .filter(isAdminPermission);
  const permissionOverrides: Partial<Record<AdminPermission, boolean>> = {};
  for (const row of overrides.results) {
    if (isAdminPermission(row.permission_key)) {
      permissionOverrides[row.permission_key] = row.allowed === 1;
    }
  }
  return {
    id: user.id,
    status: "active",
    roles: recognizedRoles,
    permissions: resolveEffectivePermissions(inherited, permissionOverrides),
  };
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
