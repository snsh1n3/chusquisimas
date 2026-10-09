import assert from "node:assert/strict";
import test from "node:test";
import { makeSku } from "../../src/lib/admin/variant-service.ts";

test("new variants receive readable product and aroma codes", () => {
  assert.equal(makeSku("gnomo", "Café"), "CHV2-gnomo-cafe");
  assert.equal(makeSku("avatar-80b79433"), "CHV2-avatar");
  assert.equal(makeSku("kit-brujas"), "CHV2-kit-brujas");
  assert.equal(makeSku("halloween"), "CHV2-halloween");
});
