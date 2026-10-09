import assert from "node:assert/strict";
import test from "node:test";
import { authorizeAdmin, loadAdminPrincipal } from "../../src/lib/admin/identity.ts";
import type { AdminReadDatabase } from "../../src/lib/admin/identity.ts";

function fakeDatabase(
  user: { id: string; status: string } | null,
  roles: string[] = [],
  overrides: Array<{ permission_key: string; allowed: number }> = []
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
              assert.match(sql, /WHERE user_id = \?/);
              return { results: (sql.includes("admin_user_roles")
                ? roles.map((role_id) => ({ role_id }))
                : overrides) as T[] };
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
