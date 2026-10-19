// Resume `npm audit --json` como anotaciones de GitHub Actions (una por paquete
// vulnerable) y falla solo si hay vulnerabilidades altas o críticas en
// dependencias de producción (las que llegan al Worker).
import { readFileSync } from "node:fs";

const [fullPath, prodPath] = process.argv.slice(2);
const read = (path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    console.log(`::error title=npm audit::No se pudo leer ${path}: ${error.message}`);
    process.exit(1);
  }
};
const full = read(fullPath);
const prod = read(prodPath);
const prodNames = new Set(Object.keys(prod.vulnerabilities ?? {}));

const rows = Object.values(full.vulnerabilities ?? {}).map((v) => {
  const advisories = (v.via ?? []).filter((x) => typeof x === "object")
    .map((x) => `${x.title} (${x.url}) rango ${x.range}`);
  const viaPkgs = (v.via ?? []).filter((x) => typeof x === "string");
  const fix = v.fixAvailable === true ? "npm audit fix"
    : v.fixAvailable ? `actualizar ${v.fixAvailable.name}@${v.fixAvailable.version}${v.fixAvailable.isSemVerMajor ? " (mayor)" : ""}`
    : "sin corrección publicada";
  return {
    name: v.name, severity: v.severity, direct: v.isDirect, range: v.range,
    scope: prodNames.has(v.name) ? "producción" : "desarrollo",
    detail: advisories.length ? advisories.join(" | ") : `vía ${viaPkgs.join(", ")}`,
    chain: (v.effects ?? []).join(", "), fix,
  };
});

const order = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
rows.sort((a, b) => order[a.severity] - order[b.severity] || a.name.localeCompare(b.name));
for (const r of rows) {
  const level = r.scope === "producción" && ["critical", "high"].includes(r.severity) ? "error" : "notice";
  console.log(`::${level} title=${r.severity} ${r.name} [${r.scope}]::` +
    `${r.direct ? "directa" : "transitiva"}; versiones ${r.range}; ${r.detail}; arrastra: ${r.chain || "—"}; corrección: ${r.fix}`);
}
const meta = full.metadata?.vulnerabilities ?? {};
console.log(`::notice title=npm audit resumen::total ${meta.total ?? 0} (críticas ${meta.critical ?? 0}, altas ${meta.high ?? 0}, moderadas ${meta.moderate ?? 0}, bajas ${meta.low ?? 0}); en producción: ${prodNames.size}`);

const prodBlocking = rows.filter((r) => r.scope === "producción" && ["critical", "high"].includes(r.severity));
process.exit(prodBlocking.length > 0 ? 1 : 0);
