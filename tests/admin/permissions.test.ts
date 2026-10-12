import assert from "node:assert/strict";
import test from "node:test";

import {
  can, isAdminPermission, isAdminRole, requirePermission, resolveEffectivePermissions,
} from "../../src/lib/admin/permissions.ts";
import type { AdminPermission, AdminPrincipal } from "../../src/lib/admin/permissions.ts";

function principal(
  permissions: AdminPermission[],
  status: AdminPrincipal["status"] = "active"
): AdminPrincipal {
  return { id: "u-1", status, roles: [], permissions: new Set(permissions) };
}

test("denies missing or inactive identities even with permissions", () => {
  assert.equal(can(null, "catalog.read"), false);
  assert.equal(can(principal(["catalog.read"], "invited"), "catalog.read"), false);
  assert.equal(can(principal(["users.manage"], "suspended"), "users.manage"), false);
});

test("evaluates only the resolved permission set, never role names", () => {
  const user: AdminPrincipal = {
    id: "u", status: "active", roles: ["administrator"], permissions: new Set(["catalog.read"]),
  };
  assert.equal(can(user, "catalog.read"), true);
  assert.equal(can(user, "users.manage"), false, "el nombre del rol no concede nada por sí solo");
});

test("individual denial removes a permission granted by a role", () => {
  const effective = resolveEffectivePermissions(
    ["catalog.read", "permissions.manage"], { "permissions.manage": false }
  );
  assert.deepEqual([...effective], ["catalog.read"]);
});

test("explicit grant adds a permission and works only for active identities", () => {
  const effective = resolveEffectivePermissions(["catalog.read"], { "inventory.write": true });
  const user: AdminPrincipal = { id: "v", status: "active", roles: ["viewer"], permissions: effective };
  assert.equal(can(user, "inventory.write"), true);
  assert.throws(() => requirePermission(user, "users.manage"), /Acceso denegado/);
  assert.equal(can({ ...user, status: "suspended" }, "inventory.write"), false);
});

test("recognizes only known role and permission identifiers", () => {
  assert.equal(isAdminPermission("media.write"), true);
  assert.equal(isAdminPermission("catalog.delete_everything"), false);
  assert.equal(isAdminRole("manager"), true);
  assert.equal(isAdminRole("superuser"), false);
});
