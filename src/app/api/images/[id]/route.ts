import { NextRequest } from "next/server";
import { servePublicImage } from "@/lib/catalog/serve-public-image";
import { withApiLogging } from "@/lib/observability/with-api-logging";

export const dynamic = "force-dynamic";

export const GET = withApiLogging("public.images.get", async (
  request: NextRequest,
  ctx,
  { params }: { params: Promise<{ id: string }> }
) => servePublicImage(request, ctx, (await params).id, "full"));
