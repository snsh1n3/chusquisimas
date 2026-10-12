import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { adminErrorResponse, GENERIC_REJECTION } from "../../src/lib/admin/api-errors.ts";
import { ProductConflictError } from "../../src/lib/admin/product-service.ts";
import { InventoryConflictError } from "../../src/lib/admin/inventory-service.ts";
import {
  AuthError, ConfigurationError, ValidationError, type ErrorCategory,
} from "../../src/lib/observability/errors.ts";

function context() {
  const failures: Array<{ error: unknown; category?: ErrorCategory }> = [];
  return {
    failures,
    ctx: { requestId: "req-9", fail: (error: unknown, category?: ErrorCategory) => { failures.push({ error, category }); } },
  };
}

async function respond(error: unknown) {
  const { ctx, failures } = context();
  const response = adminErrorResponse(error, ctx);
  return { response, body: await response.json() as Record<string, unknown>, failures };
}

describe("adminErrorResponse", () => {
  it("validación → 400 con el mensaje de la aplicación", async () => {
    const { response, body, failures } = await respond(new ValidationError("x", "Nombre inválido"));
    assert.equal(response.status, 400);
    assert.equal(body.error, "Nombre inválido");
    assert.equal(failures[0].category, "validation");
  });

  it("JSON mal formado → 400 genérico", async () => {
    const { response, body } = await respond(new SyntaxError("Unexpected token"));
    assert.equal(response.status, 400);
    assert.equal(body.error, "Datos inválidos");
  });

  it("conflictos de servicios → 409 con su mensaje", async () => {
    const product = await respond(new ProductConflictError("Producto desactualizado."));
    assert.equal(product.response.status, 409);
    assert.equal(product.body.error, "Producto desactualizado.");
    const inventory = await respond(new InventoryConflictError());
    assert.equal(inventory.response.status, 409);
    assert.match(String(inventory.body.error), /inventario cambió/);
  });

  it("autenticación y configuración → 403 genérico sin detalle", async () => {
    for (const error of [new AuthError("access_jwt_invalid"), new ConfigurationError("bindings")]) {
      const { response, body } = await respond(error);
      assert.equal(response.status, 403);
      assert.deepEqual(body, { error: GENERIC_REJECTION });
    }
  });

  it("errores inesperados → 500 genérico con requestId y sin detalle interno", async () => {
    const { response, body, failures } = await respond(new Error("D1_ERROR: no such table"));
    assert.equal(response.status, 500);
    assert.equal(body.requestId, "req-9");
    assert.equal(String(body.error).includes("D1_ERROR"), false);
    assert.equal(failures[0].category, "internal");
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  });
});
