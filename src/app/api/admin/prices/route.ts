import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { updatePrice, PriceConflictError } from "@/lib/admin/price-service";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const { principal, database } = await requireAuthenticatedAdmin("catalog.write");
    const body = await request.text();
    if (body.length > 4096) return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    const data: unknown = JSON.parse(body);
    if (typeof data !== "object" || data === null || Array.isArray(data)) throw Error("Invalid body");
    const v = data as Record<string, unknown>;
    if (typeof v.variantId !== "string" || !("priceCOP" in v) || !("expectedPriceCOP" in v)) {
      throw Error("Invalid body");
    }
    if (!(v.priceCOP === null || typeof v.priceCOP === "number") ||
        !(v.expectedPriceCOP === null || typeof v.expectedPriceCOP === "number")) throw Error("Invalid price");
    await updatePrice(database as Parameters<typeof updatePrice>[0], {
      variantId: v.variantId, priceCOP: v.priceCOP,
      expectedPriceCOP: v.expectedPriceCOP,
    }, principal.id, crypto.randomUUID());
    return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof PriceConflictError) return NextResponse.json({ error: "Conflicto de precio" }, { status: 409 });
    return NextResponse.json({ error: "No autorizado o datos inválidos" }, { status: 403 });
  }
}
