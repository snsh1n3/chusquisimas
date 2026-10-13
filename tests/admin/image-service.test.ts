import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  deleteProductImage, reorderProductImages, type ImageDatabase,
} from "../../src/lib/admin/image-service.ts";

const A = "aaaaaaaa-0000-4000-8000-000000000001";
const B = "bbbbbbbb-0000-4000-8000-000000000002";
const C = "cccccccc-0000-4000-8000-000000000003";
const product = "product-titina";

interface Statement { sql: string; values: unknown[] }

/** Base simulada: guarda filas en memoria y ejecuta los UPDATE/DELETE del batch. */
function fakeDb(ids: string[], options: { failBatch?: boolean } = {}) {
  let rows = ids.map((id, index) => ({
    id, product_id: product, storage_key: `products/${product}/${id}.webp`,
    alt_text: `foto ${index}`, sort_order: index,
  }));
  const batches: Statement[][] = [];
  const db: ImageDatabase = {
    prepare(sql) {
      return {
        bind(...values: unknown[]) {
          const statement = { sql, values } as Statement & { all<T>(): Promise<{ results: T[] }> };
          statement.all = async <T,>() => ({
            results: [...rows].sort((x, y) => x.sort_order - y.sort_order) as T[],
          });
          return statement;
        },
      };
    },
    async batch(statements) {
      const list = statements as Statement[];
      batches.push(list);
      if (options.failBatch) return list.map(() => ({ success: true, meta: { changes: 0 } }));
      for (const s of list) {
        if (s.sql.startsWith("UPDATE")) {
          const [order, id] = s.values as [number, string];
          rows = rows.map((r) => (r.id === id ? { ...r, sort_order: order } : r));
        } else if (s.sql.startsWith("DELETE")) {
          rows = rows.filter((r) => r.id !== s.values[0]);
        }
      }
      return list.map(() => ({ success: true, meta: { changes: 1 } }));
    },
  };
  return { db, batches, rows: () => rows };
}

describe("reorderProductImages", () => {
  it("reescribe el orden completo y audita antes/después en un solo batch", async () => {
    const { db, batches } = fakeDb([A, B, C]);
    const next = await reorderProductImages(db, {
      productId: product, expectedOrder: [A, B, C], action: { type: "primary", imageId: C },
    }, "admin-1", "audit-1");
    assert.deepEqual(next, [C, A, B]);
    assert.equal(batches.length, 1);
    const audit = batches[0].at(-1)!;
    assert.match(audit.sql, /product_image_reorder/);
    assert.deepEqual(audit.values.slice(0, 3), ["audit-1", "admin-1", product]);
    assert.equal(audit.values[3], JSON.stringify([A, B, C]));
    assert.equal(audit.values[4], JSON.stringify([C, A, B]));
  });

  it("no escribe nada si la acción no cambia el orden", async () => {
    const { db, batches } = fakeDb([A, B]);
    await reorderProductImages(db, {
      productId: product, expectedOrder: [A, B], action: { type: "move", imageId: A, direction: "up" },
    }, "admin-1", "audit-1");
    assert.equal(batches.length, 0);
  });

  it("rechaza con conflicto si el panel tenía un orden viejo", async () => {
    const { db, batches } = fakeDb([A, B]);
    await assert.rejects(reorderProductImages(db, {
      productId: product, expectedOrder: [B, A], action: { type: "primary", imageId: B },
    }, "admin-1", "audit-1"), /cambiaron en otra sesión/);
    assert.equal(batches.length, 0);
  });

  it("falla si D1 no aplicó todas las filas", async () => {
    const { db } = fakeDb([A, B], { failBatch: true });
    await assert.rejects(reorderProductImages(db, {
      productId: product, expectedOrder: [A, B], action: { type: "primary", imageId: B },
    }, "admin-1", "audit-1"), /Recarga la página/);
  });
});

describe("deleteProductImage", () => {
  it("audita antes de borrar y devuelve original y miniatura para R2", async () => {
    const { db, batches, rows } = fakeDb([A, B]);
    const result = await deleteProductImage(db, {
      productId: product, imageId: A, expectedOrder: [A, B],
    }, "admin-1", "audit-9");
    assert.deepEqual(result.objectKeys, [
      `products/${product}/${A}.webp`, `products/${product}/${A}-thumb.webp`,
    ]);
    assert.deepEqual(result.remaining, [B]);
    assert.match(batches[0][0].sql, /^INSERT INTO admin_audit_log/);
    assert.match(batches[0][1].sql, /^DELETE FROM store_product_images/);
    assert.deepEqual(rows().map((r) => r.id), [B]);
  });

  it("no borra fotos de otro producto ni con orden desactualizado", async () => {
    const { db, batches } = fakeDb([A, B]);
    await assert.rejects(deleteProductImage(db, {
      productId: product, imageId: C, expectedOrder: [A, B],
    }, "admin-1", "audit-9"), /ya no existe/);
    await assert.rejects(deleteProductImage(db, {
      productId: product, imageId: A, expectedOrder: [B, A],
    }, "admin-1", "audit-9"), /cambiaron en otra sesión/);
    assert.equal(batches.length, 0);
  });
});
