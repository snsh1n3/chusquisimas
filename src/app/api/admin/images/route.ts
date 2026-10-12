import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { MAX_IMAGE_BYTES, validateProductImage } from "@/lib/admin/product-image";
import { adminErrorResponse } from "@/lib/admin/api-errors";
import {
  AppError, ConfigurationError, UpstreamError, ValidationError,
} from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";
type Bindings = { DB: D1Database; PRODUCT_IMAGES: R2Bucket; IMAGES: ImagesBinding };

const MULTIPART_OVERHEAD_BYTES = 32_768;

export const POST = withApiLogging("admin.images.upload", async (request: NextRequest, ctx) => {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    ctx.logger.warn("api.origin_rejected");
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > MAX_IMAGE_BYTES + MULTIPART_OVERHEAD_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 413 });
  }
  let objectKey: string | undefined;
  let bucket: R2Bucket | undefined;
  let productIdForLog: string | undefined;
  try {
    // Fotografías tienen su propio permiso (roles Administrador y Gestor en D1).
    const { principal } = await requireAuthenticatedAdmin("media.write");
    const { env } = await getCloudflareContext({ async: true });
    const bindings = env as typeof env & Bindings;
    const { DB: db, IMAGES: images } = bindings;
    bucket = bindings.PRODUCT_IMAGES;
    if (!bucket || !images || !db) {
      throw new ConfigurationError("image_bindings_missing", "Almacenamiento no configurado");
    }
    const form = await request.formData();
    const productId = form.get("productId");
    const picture = form.get("picture");
    const alt = form.get("alt");
    if (typeof productId !== "string" || !/^[a-z0-9-]{1,120}$/i.test(productId) ||
        !(picture instanceof File) || picture.size > MAX_IMAGE_BYTES || picture.size === 0 ||
        typeof alt !== "string" || alt.trim().length < 2 || alt.length > 200) {
      throw new ValidationError("image_form_invalid", "Imagen o datos inválidos");
    }
    productIdForLog = productId;
    const product = await db.prepare("SELECT id FROM store_products WHERE id=?")
      .bind(productId).first<{ id: string }>();
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });

    const bytes = new Uint8Array(await picture.arrayBuffer());
    validateProductImage(bytes, picture.type);

    // Decode and re-encode on Cloudflare Images, never store original user bytes.
    let clean: ArrayBuffer;
    try {
      const converted = (await images.input(new Blob([bytes]).stream())
        .transform({ width: 1400, fit: "scale-down" })
        .output({ format: "image/webp", anim: false, quality: 82 })).response();
      if (!converted.ok) {
        throw new UpstreamError("image_transform_failed", `Cloudflare Images respondió ${converted.status}`);
      }
      clean = await converted.arrayBuffer();
    } catch (error) {
      if (error instanceof AppError) throw error;
      // Un archivo que pasa la firma pero no se puede decodificar es un dato inválido.
      throw new ValidationError("image_decode_failed", "No se pudo procesar la imagen", { cause: error });
    }
    if (clean.byteLength === 0 || clean.byteLength > MAX_IMAGE_BYTES) {
      throw new ValidationError("image_output_too_large", "Imagen procesada demasiado grande");
    }

    const imageId = crypto.randomUUID();
    objectKey = `products/${productId}/${imageId}.webp`;
    try {
      await bucket.put(objectKey, clean, { httpMetadata: { contentType: "image/webp" } });
    } catch (error) {
      objectKey = undefined; // Nada que limpiar si la escritura falló.
      throw new AppError("storage", "r2_put_failed", "No se pudo guardar en R2", { cause: error });
    }

    const auditId = crypto.randomUUID();
    // D1 batch keeps DB attachment + audit atomic.
    const result = await db.batch([
      db.prepare(`INSERT INTO store_product_images(id,product_id,storage_key,alt_text,sort_order)
        SELECT ?,id,?,?,COALESCE((SELECT MAX(sort_order)+1 FROM store_product_images
          WHERE product_id=?),0) FROM store_products WHERE id=?`)
        .bind(imageId, objectKey, alt.trim(), productId, productId),
      db.prepare(`INSERT INTO admin_audit_log
        (id,actor_user_id,action,resource_type,resource_id,details_json)
        SELECT ?,?,'product_image_add','product',product_id,json_object('image_id',id)
        FROM store_product_images WHERE id=?`)
        .bind(auditId, principal.id, imageId),
    ]);
    if (result.some(x => !x.success || x.meta.changes !== 1)) {
      throw new AppError("storage", "image_db_attach_failed", "No se pudo registrar la imagen en D1");
    }
    ctx.logger.info("admin.image.uploaded", {
      actorId: principal.id, productId, imageId,
      inputBytes: bytes.byteLength, outputBytes: clean.byteLength,
    });
    return NextResponse.json({ imageId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    // Roll back orphaned R2 blobs if DB attachment failed.
    if (objectKey && bucket) {
      try {
        await bucket.delete(objectKey);
        ctx.logger.warn("admin.image.orphan_removed", { productId: productIdForLog });
      } catch (cleanupError) {
        ctx.fail(cleanupError, "storage", { stage: "orphan_cleanup", objectKey });
      }
    }
    return adminErrorResponse(error, ctx, { productId: productIdForLog });
  }
});
