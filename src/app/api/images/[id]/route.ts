import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
export const dynamic = "force-dynamic";
type Bindings = { DB: D1Database; PRODUCT_IMAGES: R2Bucket };
export async function GET(request: NextRequest, { params }: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  try {
    const { env } = await getCloudflareContext({ async: true });
    const { DB: db, PRODUCT_IMAGES: bucket } = env as typeof env & Bindings;
    const row = await db.prepare(`SELECT i.storage_key FROM store_product_images i
      JOIN store_products p ON p.id=i.product_id
      WHERE i.id=? AND p.status='active'
      AND EXISTS (SELECT 1 FROM store_variants v WHERE v.product_id=p.id
      AND v.status='active' AND v.price_cop IS NOT NULL)`)
      .bind(id).first<{ storage_key: string }>();
    if (!row) return new NextResponse(null, { status: 404 });
    const image = await bucket.get(row.storage_key);
    if (!image) return new NextResponse(null, { status: 404 });
    return new NextResponse(image.body as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "image/webp",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "public, max-age=60",
      },
    });
  } catch { return new NextResponse(null, { status: 404 }); }
}
