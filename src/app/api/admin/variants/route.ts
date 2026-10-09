import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  try {
    const { principal, database } = await requireAuthenticatedAdmin("catalog.write");
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) throw Error("Datos inválidos");
    const input = v as Record<string, unknown>;
    if (typeof input.variantId !== "string" || input.variantId.length > 120 ||
        !["active", "inactive"].includes(String(input.target)) ||
        !["active", "inactive"].includes(String(input.previous)) ||
        input.target === input.previous) throw Error("Datos inválidos");
    // An active variant must have a real configured price.
    const statement = database.prepare(`
      UPDATE store_variants SET status=?,updated_at=CURRENT_TIMESTAMP
      WHERE id=? AND status=? AND (?='inactive' OR price_cop IS NOT NULL)
    `).bind(input.target, input.variantId, input.previous, input.target);
    // Record a state change only if the expected state exists.
    const audit = database.prepare(`
      INSERT INTO admin_audit_log (id,actor_user_id,action,resource_type,resource_id,details_json)
      SELECT ?,?,'variant_status','variant',id,json_object('before',?,'after',?)
      FROM store_variants WHERE id=? AND status=?
      AND (?='inactive' OR price_cop IS NOT NULL)
    `).bind(crypto.randomUUID(), principal.id, input.previous, input.target,
      input.variantId, input.previous, input.target);
    const db = database as unknown as { batch(items: unknown[]): Promise<Array<{ success: boolean; meta: { changes?: number } }>> };
    const results = await db.batch([audit, statement]);
    if (results.length !== 2 || results.some(r => !r.success || r.meta.changes !== 1)) {
      return NextResponse.json({ error: "Variante desactualizada o precio pendiente" }, { status: 409 });
    }
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Solicitud rechazada" }, { status: 403 });
  }
}
