import assert from "node:assert/strict";
import test from "node:test";

import { can, requirePermission } from "../../src/lib/admin/permissions.ts";
import type { AdminPrincipal } from "../../src/lib/admin/permissions.ts";

const admin: AdminPrincipal = {
  id: "admin-1", status: "active", roles: ["administrator"],
};

test("denies missing or inactive identities", () => {
  assert.equal(can(null, "catalog.read"), false);
  assert.equal(can({ ...admin, status: "invited" }, "catalog.read"), false);
  assert.equal(can({ ...admin, status: "suspended" }, "users.manage"), false);
});

test("allows active administrators to manage users and inventory", () => {
  assert.equal(can(admin, "users.manage"), true);
  assert.equal(can(admin, "inventory.write"), true);
});

test("inventory role cannot change users, prices, or media", () => {
  const user: AdminPrincipal = { id: "staff", status: "active", roles: ["inventory"] };
  assert.equal(can(user, "inventory.write"), true);
  assert.equal(can(user, "catalog.write"), false);
  assert.equal(can(user, "media.write"), false);
  assert.equal(can(user, "users.manage"), false);
});

test("individual denial overrides administrator role", () => {
  assert.equal(can({
    ...admin,
    overrides: { "permissions.manage": false },
  }, "permissions.manage"), false);
});

test("explicit grant works only for active identities", () => {
  const user: AdminPrincipal = {
    id: "viewer", status: "active", roles: ["viewer"],
    overrides: { "inventory.write": true },
  };
  assert.equal(can(user, "inventory.write"), true);
  assert.throws(() => requirePermission(user, "users.manage"), /Acceso denegado/);
  assert.equal(can({ ...user, status: "suspended" }, "inventory.write"), false);
});
