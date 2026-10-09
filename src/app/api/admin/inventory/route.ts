import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import { updateInventory, InventoryConflictError, type InventoryDatabase } from "@/lib/admin/inventory-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  // Admin mutations must originate from the protected admin hostname.
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 8192) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  try {
    const { database, principal } = await requireAuthenticatedAdmin("inventory.write");
    const raw = await request.text();
    if (raw.length > 8192) {
      return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    }
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    const value = data as Record<string, unknown>;
    if (typeof value.variantId !== "string" ||
        typeof value.reason !== "string" ||
        typeof value.onHand !== "number" ||
        typeof value.expectedOnHand !== "number") {
      return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
    }
    await updateInventory(
      database as unknown as InventoryDatabase,
      { variantId: value.variantId, onHand: value.onHand,
        expectedOnHand: value.expectedOnHand, reason: value.reason },
      principal.id,
      crypto.randomUUID()
    );
    return NextResponse.json({ updated: true }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof InventoryConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Do not disclose whether JWT, permissions, DB configuration or record is absent.
    return NextResponse.json({ error: "Solicitud rechazada" }, { status: 403 });
  }
}
