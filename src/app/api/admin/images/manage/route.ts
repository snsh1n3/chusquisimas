import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import { isValidImageId, parseExpectedOrder, type ImageOrderAction } from "@/lib/admin/image-order";
import {
  deleteProductImage, findImageProduct, reorderProductImages, type ImageDatabase,
} from "@/lib/admin/image-service";
import { ConflictError, ValidationError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 4096;
const NO_STORE = { "Cache-Control": "no-store" } as const;

/**
 * Acciones sobre fotografías existentes (JSON):
 * - { action: "primary", imageId, expectedOrder }
 * - { action: "move", imageId, direction: "up" | "down", expectedOrder }
 * - { action: "delete", imageId, expectedOrder, confirmation: "ELIMINAR" }
 *
 * `expectedOrder` es el orden que muestra el panel; si D1 tiene otro, responde
 * 409 para no pisar cambios de otra sesión.
 */
export const POST = withApiLogging("admin.images.manage", async (request: NextRequest, ctx) => {
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
    const { principal, database } = await requireAuthenticatedAdmin("media.write");
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ValidationError("body_not_object", "Datos inválidos");
    }
    const v = body as Record<string, unknown>;
    action = typeof v.action === "string" ? v.action.slice(0, 20) : undefined;
    if (!isValidImageId(v.imageId)) throw new ValidationError("image_id_invalid", "Fotografía inválida");
    const imageId = v.imageId.toLowerCase();
    const expectedOrder = parseExpectedOrder(v.expectedOrder);
    const db = database as unknown as ImageDatabase;

    // El producto se toma de D1, nunca del cliente.
    const productId = await findImageProduct(db, imageId);
    if (!productId) {
      throw new ConflictError("La fotografía ya no existe. Recarga la página.", "image_already_deleted");
    }

    if (v.action === "primary" || v.action === "move") {
      let orderAction: ImageOrderAction;
      if (v.action === "primary") {
        orderAction = { type: "primary", imageId };
      } else {
        if (v.direction !== "up" && v.direction !== "down") {
          throw new ValidationError("image_direction_invalid", "Dirección inválida");
        }
        orderAction = { type: "move", imageId, direction: v.direction };
      }
      const order = await reorderProductImages(db, { productId, expectedOrder, action: orderAction },
        principal.id, crypto.randomUUID());
      ctx.logger.info("admin.image.reordered", { actorId: principal.id, productId, imageId, action });
      return NextResponse.json({ order }, { headers: NO_STORE });
    }

    if (v.action === "delete") {
      if (v.confirmation !== "ELIMINAR") {
        throw new ValidationError("image_delete_confirmation", "Confirmación inválida");
      }
      const { objectKeys, remaining } = await deleteProductImage(db, { productId, imageId, expectedOrder },
        principal.id, crypto.randomUUID());
      ctx.logger.info("admin.image.deleted", { actorId: principal.id, productId, imageId });
      // D1 ya no la referencia, así que la tienda deja de servirla. Borrar R2 es
      // limpieza: si falla, queda registrado y no afecta lo que ve el cliente.
      try {
        const { env } = await getCloudflareContext({ async: true });
        await (env as typeof env & { PRODUCT_IMAGES: R2Bucket }).PRODUCT_IMAGES.delete(objectKeys);
      } catch (error) {
        ctx.fail(error, "storage", { stage: "r2_delete", imageId });
      }
      return NextResponse.json({ deleted: true, order: remaining }, { headers: NO_STORE });
    }

    throw new ValidationError("image_action_invalid", "Acción inválida");
  } catch (error) {
    return adminErrorResponse(error, ctx, { action });
  }
});
