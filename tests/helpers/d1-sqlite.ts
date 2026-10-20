/**
 * Adaptador mínimo con la interfaz de D1 sobre SQLite real (node:sqlite), con
 * todas las migraciones aplicadas. `batch()` es transaccional como en D1.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import type { OrdersDatabase, OrdersStatement } from "../../src/lib/orders/order-db.ts";

const ROOT = fileURLToPath(new URL("../../", import.meta.url));

type SqlValue = null | number | string | bigint | Uint8Array;

function toSql(value: unknown): SqlValue {
  if (value === undefined || value === null) return null;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "number" || typeof value === "string" || typeof value === "bigint") return value;
  if (value instanceof Uint8Array) return value;
  throw new TypeError(`Tipo no soportado por D1: ${typeof value}`);
}

class Statement implements OrdersStatement {
  readonly db: DatabaseSync;
  readonly sql: string;
  readonly values: SqlValue[];

  constructor(db: DatabaseSync, sql: string, values: SqlValue[] = []) {
    this.db = db;
    this.sql = sql;
    this.values = values;
  }

  bind(...values: unknown[]): OrdersStatement {
    return new Statement(this.db, this.sql, values.map(toSql));
  }

  async first<T>(): Promise<T | null> {
    const row = this.db.prepare(this.sql).get(...this.values);
    return row ? ({ ...row } as T) : null;
  }

  async all<T>(): Promise<{ results: T[] }> {
    return { results: this.db.prepare(this.sql).all(...this.values).map((row) => ({ ...row }) as T) };
  }

  async run() {
    return this.execute();
  }

  execute() {
    const result = this.db.prepare(this.sql).run(...this.values);
    return { success: true, meta: { changes: Number(result.changes) } };
  }
}

export interface TestDatabase extends OrdersDatabase {
  raw: DatabaseSync;
}

export function createTestDatabase(): TestDatabase {
  const raw = new DatabaseSync(":memory:");
  raw.exec("PRAGMA foreign_keys = ON");
  const migrations = readdirSync(join(ROOT, "migrations")).filter((f) => f.endsWith(".sql")).sort();
  for (const file of migrations) {
    raw.exec(readFileSync(join(ROOT, "migrations", file), "utf8").replace(/^﻿/, ""));
  }
  return {
    raw,
    prepare: (sql: string) => new Statement(raw, sql),
    async batch(statements: OrdersStatement[]) {
      raw.exec("BEGIN");
      try {
        const results = statements.map((statement) => (statement as Statement).execute());
        raw.exec("COMMIT");
        return results;
      } catch (error) {
        raw.exec("ROLLBACK");
        throw error;
      }
    },
  };
}

/** Producto activo con una variante a la venta, para las pruebas de pedidos. */
export function seedVariant(db: TestDatabase, options: {
  variantId: string;
  productId?: string;
  name?: string;
  priceCOP?: number;
  onHand?: number;
  reserved?: number;
  allowMadeToOrder?: boolean;
}): void {
  const productId = options.productId ?? `product-${options.variantId}`;
  db.raw.prepare(`INSERT OR IGNORE INTO store_products (id, slug, name, status, product_type)
    VALUES (?, ?, ?, 'active', 'candle')`).run(productId, productId, options.name ?? "Titina");
  db.raw.prepare(`INSERT INTO store_variants (id, product_id, sku, label, price_cop, status, on_hand, reserved,
    allow_made_to_order, preparation_days) VALUES (?, ?, ?, 'Café', ?, 'active', ?, ?, ?, 14)`)
    .run(options.variantId, productId, `SKU-${options.variantId}`, options.priceCOP ?? 45000,
      options.onHand ?? 0, options.reserved ?? 0, options.allowMadeToOrder === false ? 0 : 1);
}

export function variantStock(db: TestDatabase, variantId: string): { on_hand: number; reserved: number } {
  return { ...db.raw.prepare("SELECT on_hand, reserved FROM store_variants WHERE id = ?")
    .get(variantId) } as { on_hand: number; reserved: number };
}

export function sequentialIds(prefix = "id"): () => string {
  let n = 0;
  return () => `${prefix}-${++n}`;
}
