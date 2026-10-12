import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { createVariant } from "@/lib/admin/variant-service";
import type { ProductDatabase } from "@/lib/admin/product-service";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const NO_STORE = { "Cache-Control": "no-store" } as const;

type BatchDatabase = {
  batch(items: unknown[]): Promise<Array<{ success: boolean; meta: { changes?: number } }>>;
};

export const POST = withApiLogging("admin.variants.mutate", async (request: NextRequest, ctx) => {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  let action: string | undefined;
  try {
    const { principal, database } = await requireAuthenticatedAdmin("catalog.write");
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      throw new ValidationError("body_not_object", "Datos inválidos");
    }
    const input = v as Record<string, unknown>;
    action = input.action === "create" ? "create" : "status";

    if (input.action === "create") {
      if (typeof input.productId !== "string" || input.productId.length > 120 ||
          typeof input.label !== "string" || input.label.trim().length < 2 ||
          input.label.length > 120 ||
          !(input.aromaId === null || typeof input.aromaId === "string")) {
        throw new ValidationError("variant_create_invalid", "Datos de variante inválidos");
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
        if (!aroma) throw new ValidationError("aroma_not_found", "Aroma no encontrado");
        aromaName = aroma.name;
      }
      const created = await createVariant(database as unknown as ProductDatabase, {
        productId: product.id, productSlug: product.slug,
        aromaId: input.aromaId, aromaName,
        label: input.label, actorId: principal.id,
        variantId: crypto.randomUUID(), auditId: crypto.randomUUID(),
      });
      ctx.logger.info("admin.variant.created", { actorId: principal.id, productId: product.id });
      return NextResponse.json({ created: true, ...created }, { status: 201, headers: NO_STORE });
    }

    if (typeof input.variantId !== "string" || input.variantId.length > 120 ||
        !["active", "inactive"].includes(String(input.target)) ||
        !["active", "inactive"].includes(String(input.previous)) ||
        input.target === input.previous) {
      throw new ValidationError("variant_status_invalid", "Datos inválidos");
    }
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
    const results = await (database as unknown as BatchDatabase).batch([audit, statement]);
    if (results.length !== 2 || results.some(r => !r.success || r.meta.changes !== 1)) {
      ctx.logger.warn("admin.variant.status_conflict", { variantId: input.variantId });
      return NextResponse.json({ error: "Variante desactualizada o precio pendiente" }, { status: 409 });
    }
    ctx.logger.info("admin.variant.status_changed", {
      actorId: principal.id, variantId: input.variantId, target: String(input.target),
    });
    return NextResponse.json({ updated: true }, { headers: NO_STORE });
  } catch (error) {
    return adminErrorResponse(error, ctx, { action });
  }
});
