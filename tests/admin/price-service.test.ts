import assert from "node:assert/strict";
import test from "node:test";
import { updatePrice, PriceConflictError } from "../../src/lib/admin/price-service.ts";

function database(changes: number) {
  const statements: Array<{ query: string; values: unknown[] }> = [];
  return {
    statements,
    prepare(query: string) {
      return { bind(...values: unknown[]) {
        statements.push({ query, values });
        return {};
      } };
    },
    async batch(items: unknown[]) {
      assert.equal(items.length, 2);
      return [
        { success: true, meta: { changes } },
        { success: true, meta: { changes } },
      ];
    },
  };
}

test("price update audits old and new values", async () => {
  const db = database(1);
  await updatePrice(db, {
    variantId: "variant-1", expectedPriceCOP: null, priceCOP: 25000,
  }, "admin-1", "audit-1");
  assert.equal(db.statements.length, 2);
  assert.deepEqual(db.statements[0].values,
    ["audit-1", "admin-1", 25000, "variant-1", null]);
});

test("stale price update returns conflict", async () => {
  await assert.rejects(updatePrice(database(0), {
    variantId: "variant-1", expectedPriceCOP: null, priceCOP: 25000,
  }, "admin-1", "audit-1"), PriceConflictError);
});

test("invalid prices cannot write", async () => {
  const db = database(1);
  await assert.rejects(updatePrice(db, {
    variantId: "variant-1", expectedPriceCOP: null, priceCOP: -5,
  }, "admin-1", "audit-1"));
  assert.equal(db.statements.length, 0);
});
