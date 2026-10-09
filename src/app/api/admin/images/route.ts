import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { MAX_IMAGE_BYTES, validateProductImage } from "@/lib/admin/product-image";

export const dynamic = "force-dynamic";
type Bindings = { DB: D1Database; PRODUCT_IMAGES: R2Bucket; IMAGES: ImagesBinding };

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  const size = Number(request.headers.get("content-length") ?? "0");
  if (size > MAX_IMAGE_BYTES + 32_768) {
    return NextResponse.json({ error: "Archivo demasiado grande" }, { status: 413 });
  }
  let objectKey: string | undefined;
  try {
    const { principal } = await requireAuthenticatedAdmin("catalog.write");
    const { env } = await getCloudflareContext({ async: true });
    const { DB: db, PRODUCT_IMAGES: bucket, IMAGES: images } = env as typeof env & Bindings;
    if (!bucket || !images || !db) throw Error("Almacenamiento no configurado");
    const form = await request.formData();
    const productId = form.get("productId");
    const picture = form.get("picture");
    const alt = form.get("alt");
    if (typeof productId !== "string" || !/^[a-z0-9-]{1,120}$/i.test(productId) ||
        !(picture instanceof File) || picture.size > MAX_IMAGE_BYTES || picture.size === 0 ||
        typeof alt !== "string" || alt.trim().length < 2 || alt.length > 200) {
      return NextResponse.json({ error: "Imagen o datos inválidos" }, { status: 400 });
    }
    const product = await db.prepare("SELECT id FROM store_products WHERE id=?")
      .bind(productId).first<{ id: string }>();
    if (!product) return NextResponse.json({ error: "Producto no encontrado" }, { status: 404 });
    const bytes = new Uint8Array(await picture.arrayBuffer());
    validateProductImage(bytes, picture.type);
    // Decode and re-encode on Cloudflare Images, never store original user bytes.
    const converted = (await images.input(new Blob([bytes]).stream())
      .transform({ width: 1400, fit: "scale-down" })
      .output({ format: "image/webp", anim: false, quality: 82 })).response();
    if (!converted.ok) throw Error("No se pudo procesar la imagen");
    const clean = await converted.arrayBuffer();
    if (clean.byteLength === 0 || clean.byteLength > MAX_IMAGE_BYTES)
      throw Error("Imagen procesada demasiado grande");
    const imageId = crypto.randomUUID();
    objectKey = `products/${productId}/${imageId}.webp`;
    await bucket.put(objectKey, clean, { httpMetadata: { contentType: "image/webp" } });
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
    if (result.some(x => !x.success || x.meta.changes !== 1))
      throw Error("No se pudo registrar la imagen");
    return NextResponse.json({ imageId }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    // Roll back orphaned R2 blobs if DB attachment failed.
    if (objectKey) {
      try {
        const { env } = await getCloudflareContext({ async: true });
        await (env as typeof env & Bindings).PRODUCT_IMAGES.delete(objectKey);
      } catch { /* cleanup is best effort; log separately when observability is enabled */ }
    }
    return NextResponse.json({ error: "No fue posible guardar la fotografía" }, { status: 400 });
  }
}
