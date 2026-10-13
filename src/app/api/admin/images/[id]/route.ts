import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { thumbnailKeyFor } from "@/lib/admin/image-order";
import { isImageId } from "@/lib/catalog/image-delivery";
import { classifyError } from "@/lib/observability/errors";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/**
 * Miniatura para el panel, incluida la de productos no publicados. Exige
 * sesión de Access y catalog.read. Nunca se guarda en cachés compartidas.
 */
export const GET = withApiLogging("admin.images.get", async (
  _request: NextRequest,
  ctx,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  if (!isImageId(id)) return notFound();
  try {
    const { database } = await requireAuthenticatedAdmin("catalog.read");
    const row = await database.prepare(
      "SELECT storage_key FROM store_product_images WHERE id = ? COLLATE NOCASE"
    ).bind(id).first<{ storage_key: string }>();
    if (!row) return notFound();
    const { env } = await getCloudflareContext({ async: true });
    const bucket = (env as typeof env & { PRODUCT_IMAGES: R2Bucket }).PRODUCT_IMAGES;
    const object = await bucket.get(thumbnailKeyFor(row.storage_key)) ?? await bucket.get(row.storage_key);
    if (!object) {
      ctx.logger.warn("admin.image.missing_object", { imageId: id });
      return notFound();
    }
    return new Response(object.body as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (error) {
    ctx.fail(error);
    return classifyError(error) === "auth" ? new Response(null, { status: 403 }) : notFound();
  }
});
