/** Authorization primitives. Call only after server-side identity verification.
 * This module does not authenticate sessions or grant access by itself.
 *
 * Fuente única de verdad: D1. Qué permisos tiene cada rol vive en
 * `admin_role_permissions` y se resuelve en identity.ts al cargar el usuario.
 * Este módulo solo define los identificadores válidos (para rechazar claves
 * desconocidas que lleguen de la base) y evalúa el conjunto ya resuelto.
 */
export const ADMIN_PERMISSIONS = [
  "catalog.read",
  "catalog.write",
  "inventory.write",
  "media.write",
  "audit.read",
  "users.manage",
  "permissions.manage",
  "orders.read",
  "orders.write",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];

export const ADMIN_ROLES = ["administrator", "manager", "inventory", "viewer"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

const PERMISSION_SET: ReadonlySet<string> = new Set(ADMIN_PERMISSIONS);
const ROLE_SET: ReadonlySet<string> = new Set(ADMIN_ROLES);

export function isAdminPermission(value: string): value is AdminPermission {
  return PERMISSION_SET.has(value);
}

export function isAdminRole(value: string): value is AdminRole {
  return ROLE_SET.has(value);
}

export interface AdminPrincipal {
  id: string;
  status: "invited" | "active" | "suspended";
  /** Roles asignados; informativos, no se usan para autorizar. */
  roles: readonly AdminRole[];
  /** Permisos efectivos ya resueltos desde D1 (roles + overrides individuales). */
  permissions: ReadonlySet<AdminPermission>;
}

/**
 * Combina los permisos heredados de los roles con los overrides individuales.
 * Un override `false` siempre retira el permiso aunque un rol lo conceda;
 * un override `true` lo concede aunque ningún rol lo tenga.
 */
export function resolveEffectivePermissions(
  rolePermissions: Iterable<AdminPermission>,
  overrides: Partial<Record<AdminPermission, boolean>> = {}
): ReadonlySet<AdminPermission> {
  const effective = new Set<AdminPermission>(rolePermissions);
  for (const [key, allowed] of Object.entries(overrides) as Array<[AdminPermission, boolean]>) {
    if (allowed) effective.add(key);
    else effective.delete(key);
  }
  return effective;
}

export function can(
  principal: AdminPrincipal | null | undefined,
  permission: AdminPermission
): boolean {
  if (!principal || principal.status !== "active") return false;
  return principal.permissions.has(permission);
}

export function requirePermission(
  principal: AdminPrincipal | null | undefined,
  permission: AdminPermission
): void {
  if (!can(principal, permission)) throw new Error("Acceso denegado.");
}
