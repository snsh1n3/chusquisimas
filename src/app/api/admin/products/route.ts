import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { parseJsonText, readBodyTextWithin } from "@/lib/http/json-body";
import {
  createDraftProduct, changeProductStatus, editProduct, deleteArchivedProduct, validateStatus,
  type ProductDatabase,
} from "@/lib/admin/product-service";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 8192;
const NO_STORE = { "Cache-Control": "no-store" } as const;

export const POST = withApiLogging("admin.products.mutate", async (request: NextRequest, ctx) => {
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
    const raw = await readBodyTextWithin(request, MAX_BODY_BYTES);
    if (raw === null) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const body: unknown = parseJsonText(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ValidationError("body_not_object", "Datos inválidos");
    }
    const v = body as Record<string, unknown>;
    action = typeof v.action === "string" ? v.action.slice(0, 40) : undefined;
    const db = database as unknown as ProductDatabase;

    if (v.action === "create") {
      if (typeof v.name !== "string" || typeof v.description !== "string" ||
          typeof v.productType !== "string") {
        throw new ValidationError("product_create_invalid", "Datos inválidos");
      }
      const product = await createDraftProduct(db, {
        name: v.name, description: v.description, productType: v.productType, categoryId: v.categoryId,
      }, principal.id, crypto.randomUUID(), crypto.randomUUID());
      ctx.logger.info("admin.product.created", { actorId: principal.id, productId: product.id });
      return NextResponse.json({ created: true, ...product }, { status: 201, headers: NO_STORE });
    }

    if (v.action === "edit") {
      if (typeof v.id !== "string" || typeof v.expectedName !== "string" ||
          typeof v.name !== "string" || typeof v.description !== "string" ||
          typeof v.productType !== "string") {
        throw new ValidationError("product_edit_invalid", "Datos inválidos");
      }
      await editProduct(db, {
        id: v.id, expectedName: v.expectedName, name: v.name,
        description: v.description, productType: v.productType, categoryId: v.categoryId,
      }, principal.id, crypto.randomUUID());
      ctx.logger.info("admin.product.edited", { actorId: principal.id, productId: v.id });
      return NextResponse.json({ updated: true }, { headers: NO_STORE });
    }

    if (v.action === "delete") {
      if (typeof v.id !== "string" || typeof v.expectedName !== "string" ||
          v.confirmation !== "ELIMINAR") {
        throw new ValidationError("product_delete_confirmation", "Confirmación inválida");
      }
      await deleteArchivedProduct(db, v.id, v.expectedName, principal.id, crypto.randomUUID());
      ctx.logger.info("admin.product.deleted", { actorId: principal.id, productId: v.id });
      return NextResponse.json({ deleted: true }, { headers: NO_STORE });
    }

    if (v.action === "visibility") {
      if (typeof v.id !== "string") throw new ValidationError("product_id_invalid", "ID inválido");
      const previous = validateStatus(v.previous);
      const target = validateStatus(v.target);
      await changeProductStatus(db, v.id, previous, target, principal.id, crypto.randomUUID());
      ctx.logger.info("admin.product.visibility_changed", {
        actorId: principal.id, productId: v.id, previous, target,
      });
      return NextResponse.json({ updated: true }, { headers: NO_STORE });
    }

    throw new ValidationError("product_action_invalid", "Acción inválida");
  } catch (error) {
    return adminErrorResponse(error, ctx, { action });
  }
});
