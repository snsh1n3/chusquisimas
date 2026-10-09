/** Authorization primitives. Call only after server-side identity verification.
 * This module does not authenticate sessions or grant access by itself.
 */
export const ADMIN_PERMISSIONS = [
  "catalog.read",
  "catalog.write",
  "inventory.write",
  "media.write",
  "audit.read",
  "users.manage",
  "permissions.manage",
] as const;

export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export type AdminRole = "administrator" | "manager" | "inventory" | "viewer";

const ROLE_PERMISSIONS: Record<AdminRole, readonly AdminPermission[]> = {
  administrator: ADMIN_PERMISSIONS,
  manager: ["catalog.read", "catalog.write", "inventory.write", "media.write", "audit.read"],
  inventory: ["catalog.read", "inventory.write", "audit.read"],
  viewer: ["catalog.read", "audit.read"],
};

export interface AdminPrincipal {
  id: string;
  status: "invited" | "active" | "suspended";
  roles: readonly AdminRole[];
  /** Explicit individual permissions override roles. false always denies. */
  overrides?: Partial<Record<AdminPermission, boolean>>;
}

export function can(
  principal: AdminPrincipal | null | undefined,
  permission: AdminPermission
): boolean {
  if (!principal || principal.status !== "active") return false;
  const override = principal.overrides?.[permission];
  if (override !== undefined) return override;
  return principal.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export function requirePermission(
  principal: AdminPrincipal | null | undefined,
  permission: AdminPermission
): void {
  if (!can(principal, permission)) throw new Error("Acceso denegado.");
}
