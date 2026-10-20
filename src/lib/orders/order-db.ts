/**
 * Subconjunto de la API de D1 que usan los servicios de pedidos. Permite
 * probarlos contra SQLite real (tests/helpers/d1-sqlite.ts).
 *
 * `batch()` es transaccional: si una sentencia falla, ninguna se aplica.
 */
export interface OrdersStatement {
  bind(...values: unknown[]): OrdersStatement;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
  run(): Promise<{ success: boolean; meta: { changes?: number } }>;
}

export interface OrdersDatabase {
  prepare(sql: string): OrdersStatement;
  batch(statements: OrdersStatement[]): Promise<Array<{
    success: boolean;
    meta: { changes?: number };
  }>>;
}

/** Marca de tiempo ISO en UTC; comparable como texto. */
export function isoNow(now: Date): string {
  return now.toISOString();
}

export function isConstraintError(error: unknown, kind: "CHECK" | "UNIQUE"): boolean {
  const message = error instanceof Error ? `${error.message} ${String(error.cause ?? "")}` : String(error);
  return message.includes(`${kind} constraint failed`);
}
