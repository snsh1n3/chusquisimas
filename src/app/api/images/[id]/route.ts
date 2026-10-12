import { NextRequest } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  EDGE_IMAGE_CACHE_CONTROL, edgeCacheKey, isImageId, matchesEtag, publicImageHeaders,
} from "@/lib/catalog/image-delivery";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";
type Bindings = { DB: D1Database; PRODUCT_IMAGES: R2Bucket };

const notFound = () => new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });

/** Cache API del Worker; ausente en desarrollo local con `next dev`. */
function edgeCache(): Cache | null {
  const storage = (globalThis as { caches?: CacheStorage & { default?: Cache } }).caches;
  return storage?.default ?? null;
}

export const GET = withApiLogging("public.images.get", async (
  request: NextRequest,
  ctx,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  if (!isImageId(id)) return notFound();
  try {
    const { env, ctx: workerCtx } = await getCloudflareContext({ async: true });
    const { DB: db, PRODUCT_IMAGES: bucket } = env as typeof env & Bindings;

    // Siempre: la foto solo se sirve si su producto está publicado y a la venta.
    const row = await db.prepare(`SELECT i.storage_key FROM store_product_images i
      JOIN store_products p ON p.id=i.product_id
      WHERE i.id=? AND p.status='active'
      AND EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
      AND v.status='active' AND v.price_cop IS NOT NULL)`)
      .bind(id).first<{ storage_key: string }>();
    if (!row) return notFound();

    const headers = publicImageHeaders(id);
    if (matchesEtag(request.headers.get("if-none-match"), headers.ETag)) {
      return new Response(null, { status: 304, headers });
    }

    const cache = edgeCache();
    const cacheKey = new Request(edgeCacheKey(new URL(request.url).origin, id));
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

    const image = await bucket.get(row.storage_key);
    if (!image) {
      // D1 apunta a un objeto que no existe en R2: inconsistencia que hay que ver.
      ctx.logger.warn("public.image.missing_object", { imageId: id });
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
    ctx.fail(error, "storage", { imageId: id });
    return notFound();
  }
});
