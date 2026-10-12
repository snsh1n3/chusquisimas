import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";

/**
 * Guarda de arquitectura: la tienda pública solo puede consumir
 * getPublicCatalog(). getPublishedCatalog() incluye on_hand/reserved y queda
 * reservado a código de servidor del catálogo.
 */
const ROOT = new URL("../../src/", import.meta.url).pathname;
const PUBLIC_DIRS = ["app", "components"];
const ALLOWED = [/^app\/admin\//, /^app\/api\/admin\//, /^components\/admin\//];

function* walk(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else if (/\.(ts|tsx)$/.test(name)) yield full;
  }
}

test("ninguna página o componente público usa el catálogo con inventario", () => {
  const offenders: string[] = [];
  for (const dir of PUBLIC_DIRS) {
    for (const file of walk(join(ROOT, dir))) {
      const rel = relative(ROOT, file).replaceAll("\\", "/");
      if (ALLOWED.some((pattern) => pattern.test(rel))) continue;
      const source = readFileSync(file, "utf8");
      if (/\bgetPublishedCatalog\b/.test(source)) offenders.push(rel);
    }
  }
  assert.deepEqual(offenders, [], `Usa getPublicCatalog() en: ${offenders.join(", ")}`);
});
