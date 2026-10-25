import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { thumbnailKeyFor } from "@/lib/admin/image-order";
import {
  EDGE_IMAGE_CACHE_CONTROL, edgeCacheKey, isImageId, matchesEtag, publicImageHeaders,
  type ImageSize,
} from "@/lib/catalog/image-delivery";
import type { RequestContext } from "@/lib/observability/with-api-logging";
import { PUBLISHED_VARIANT_SQL } from "./publish-rules";
import { SITE_URL } from "@/lib/site";

type Bindings = { DB: D1Database; PRODUCT_IMAGES: R2Bucket };

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/** Cache API del Worker; ausente en desarrollo local con `next dev`. */
function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return storage?.default ?? null;
}

/**
 * Sirve la foto principal o su miniatura. D1 se consulta siempre: si el
 * producto deja de estar publicado o la foto se elimina, responde 404 aunque
 * el contenido siga en la caché del Worker.
 */
export async function servePublicImage(
  request: Request,
  ctx: RequestContext,
  id: string,
  size: ImageSize
): Promise<Response> {
  if (!isImageId(id)) return notFound();
  try {
    const { env, ctx: workerCtx } = await getCloudflareContext({ async: true });
    const { DB: db, PRODUCT_IMAGES: bucket } = env as typeof env & Bindings;

    const row = await db.prepare(`SELECT i.storage_key FROM store_product_images i
      JOIN store_products p ON p.id=i.product_id
      WHERE i.id=? COLLATE NOCASE AND p.status='active'
      AND EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
      AND ${PUBLISHED_VARIANT_SQL})`)
      .bind(id).first<{ storage_key: string }>();
    if (!row) return notFound();

    const headers = publicImageHeaders(id, size);
    if (matchesEtag(request.headers.get("if-none-match"), headers.ETag)) {
      return new Response(null, { status: 304, headers });
    }

    const cache = edgeCache();
    const cacheKey = new Request(edgeCacheKey(SITE_URL, id, size));
    if (cache) {
      try {
        const hit = await cache.match(cacheKey);
        if (hit?.body) {
          return new Response(hit.body, { status: 200, headers: { ...headers, "X-Edge-Cache": "HIT" } });
        }
      } catch (error) {
        // La caché es una optimización: si falla, se sirve desde R2.
        ctx.fail(error, "storage", { stage: "edge_cache_match", imageId: id });
      }
    }

    // La miniatura cae a la foto principal si no existe (cargas anteriores).
    const image = size === "thumb"
      ? await bucket.get(thumbnailKeyFor(row.storage_key)) ?? await bucket.get(row.storage_key)
      : await bucket.get(row.storage_key);
    if (!image) {
      // D1 apunta a un objeto que no existe en R2: inconsistencia que hay que ver.
      ctx.logger.warn("public.image.missing_object", { imageId: id, size });
      return notFound();
    }

    if (!cache) {
      return new Response(image.body as ReadableStream<Uint8Array>, {
        status: 200, headers: { ...headers, "X-Edge-Cache": "BYPASS" },
      });
    }

    const [forClient, forCache] = (image.body as ReadableStream<Uint8Array>).tee();
    const stored = new Response(forCache, {
      headers: { "Content-Type": "image/webp", "Cache-Control": EDGE_IMAGE_CACHE_CONTROL },
    });
    workerCtx.waitUntil(cache.put(cacheKey, stored).catch((error: unknown) => {
      ctx.fail(error, "storage", { stage: "edge_cache_put", imageId: id });
    }));
    return new Response(forClient, { status: 200, headers: { ...headers, "X-Edge-Cache": "MISS" } });
  } catch (error) {
    // El público recibe 404 para no revelar el estado interno; el fallo queda registrado.
    ctx.fail(error, "storage", { imageId: id, size });
    return notFound();
  }
}
