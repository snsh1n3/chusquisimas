import { NextRequest } from "next/server";
import { buildRobotsTxt } from "@/lib/seo/crawl";

export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  return new Response(buildRobotsTxt(request.headers.get("host")), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
