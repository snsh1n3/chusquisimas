import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdmin, loadAdminPrincipal } from "../../src/lib/admin/identity.ts";
import type { AdminReadDatabase } from "../../src/lib/admin/identity.ts";

/** Copia de la matriz sembrada en migrations/0001 (verificada en CI por check_rbac_seed.py). */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  administrator: ["catalog.read", "catalog.write", "inventory.write", "media.write",
    "audit.read", "users.manage", "permissions.manage"],
  manager: ["catalog.read", "catalog.write", "inventory.write", "media.write", "audit.read"],
  inventory: ["catalog.read", "inventory.write", "audit.read"],
  viewer: ["catalog.read", "audit.read"],
};

function fakeDatabase(
  user: { id: string; status: string } | null,
  roles: string[] = [],
  overrides: Array<{ permission_key: string; allowed: number }> = [],
  rolePermissions: Record<string, string[]> = ROLE_PERMISSIONS
): AdminReadDatabase {
  return {
    prepare(sql: string) {
      return {
        bind(...params: unknown[]) {
          assert.ok(params.length > 0, "Queries must bind user identity");
          return {
            async first<T>(): Promise<T | null> {
              assert.match(sql, /WHERE email = \?/);
              return user as T | null;
            },
            async all<T>(): Promise<{ results: T[] }> {
              assert.match(sql, /user_id = \?/);
              if (sql.includes("admin_role_permissions")) {
                const keys = new Set(roles.flatMap((role) => rolePermissions[role] ?? []));
                return { results: [...keys].map((permission_key) => ({ permission_key })) as T[] };
              }
              if (sql.includes("admin_user_permission_overrides")) return { results: overrides as T[] };
              return { results: roles.map((role_id) => ({ role_id })) as T[] };
            },
          };
        },
      };
    },
  };
}

const identity = { subject: "access-subject", email: "owner@example.com" };

test("unregistered identity never receives privileges", async () => {
  assert.equal(await loadAdminPrincipal(fakeDatabase(null), identity), null);
  await assert.rejects(
    authorizeAdmin(fakeDatabase(null), identity, "catalog.read"),
    /Acceso denegado/
  );
});

test("invited or suspended user cannot access inventory", async () => {
  for (const status of ["invited", "suspended"]) {
    await assert.rejects(
      authorizeAdmin(fakeDatabase({ id: "u", status }, ["administrator"]),
        identity, "inventory.write"),
      /Acceso denegado/
    );
  }
});

test("active administrator can consult inventory", async () => {
  const db = fakeDatabase({ id: "u", status: "active" }, ["administrator"]);
  const principal = await authorizeAdmin(db, identity, "inventory.write");
  assert.equal(principal.id, "u");
});

test("inventory role cannot modify users or prices", async () => {
  const db = fakeDatabase({ id: "u", status: "active" }, ["inventory"]);
  await assert.rejects(authorizeAdmin(db, identity, "catalog.write"),
    /Acceso denegado/);
  await assert.rejects(authorizeAdmin(db, identity, "users.manage"),
    /Acceso denegado/);
});

test("individual deny overrides administrator", async () => {
  const db = fakeDatabase({ id: "u", status: "active" }, ["administrator"],
    [{ permission_key: "inventory.write", allowed: 0 }]);
  await assert.rejects(authorizeAdmin(db, identity, "inventory.write"),
    /Acceso denegado/);
});

test("permissions come from D1 role mappings, not from code", async () => {
  // Un rol personalizado creado en D1 concede exactamente lo que dice la base.
  const db = fakeDatabase({ id: "u", status: "active" }, ["photographer"], [],
    { photographer: ["catalog.read", "media.write"] });
  const principal = await authorizeAdmin(db, identity, "media.write");
  assert.deepEqual([...principal.permissions].sort(), ["catalog.read", "media.write"]);
  assert.deepEqual(principal.roles, [], "roles desconocidos no se listan como roles del sistema");
  await assert.rejects(authorizeAdmin(db, identity, "catalog.write"), /Acceso denegado/);
});

test("unknown permission keys stored in D1 never widen privileges", async () => {
  const db = fakeDatabase({ id: "u", status: "active" }, ["viewer"],
    [{ permission_key: "root.everything", allowed: 1 }],
    { viewer: ["catalog.read", "drop.tables"] });
  const principal = await loadAdminPrincipal(db, identity);
  assert.deepEqual([...(principal?.permissions ?? [])], ["catalog.read"]);
});

test("a role whose permissions were removed in D1 loses access immediately", async () => {
  const db = fakeDatabase({ id: "u", status: "active" }, ["manager"], [],
    { ...ROLE_PERMISSIONS, manager: ["catalog.read"] });
  await assert.rejects(authorizeAdmin(db, identity, "inventory.write"), /Acceso denegado/);
});
