import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { createVariant } from "@/lib/admin/variant-service";
import type { ProductDatabase } from "@/lib/admin/product-service";

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
    if (input.action === "create") {
      if (typeof input.productId !== "string" || input.productId.length > 120 ||
          typeof input.label !== "string" || input.label.trim().length < 2 ||
          input.label.length > 120 ||
          !(input.aromaId === null || typeof input.aromaId === "string")) {
        return NextResponse.json({ error: "Datos de variante inválidos" }, { status: 400 });
      }
      const product = await database.prepare(
        "SELECT id, slug FROM store_products WHERE id=?"
      ).bind(input.productId).first<{ id: string; slug: string }>();
      if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
      let aromaName: string | null = null;
      if (input.aromaId !== null) {
        const aroma = await database.prepare(
          "SELECT name FROM store_aromas WHERE id=? AND active=1"
        ).bind(input.aromaId).first<{ name: string }>();
        if (!aroma) return NextResponse.json({ error: "Aroma no encontrado" }, { status: 400 });
        aromaName = aroma.name;
      }
      const created = await createVariant(database as unknown as ProductDatabase, {
        productId: product.id, productSlug: product.slug,
        aromaId: input.aromaId, aromaName,
        label: input.label, actorId: principal.id,
        variantId: crypto.randomUUID(), auditId: crypto.randomUUID(),
      });
      return NextResponse.json({ created: true, ...created }, {
        status: 201, headers: { "Cache-Control": "no-store" },
      });
    }
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
