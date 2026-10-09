import { NextRequest, NextResponse } from "next/server";
import { requireAuthenticatedAdmin } from "@/lib/admin/server-auth";
import {
  createDraftProduct, changeProductStatus, validateStatus, ProductConflictError,
  type ProductDatabase,
} from "@/lib/admin/product-service";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== "https://admin.chusquisimas.com") {
    return NextResponse.json({ error: "Origen no autorizado" }, { status: 403 });
  }
  if (!(request.headers.get("content-type") ?? "").toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 415 });
  }
  if (Number(request.headers.get("content-length") ?? "0") > 8192) {
    return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
  }
  try {
    const { principal, database } = await requireAuthenticatedAdmin("catalog.write");
    const raw = await request.text();
    if (raw.length > 8192) return NextResponse.json({ error: "Solicitud demasiado grande" }, { status: 413 });
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }
    const v = body as Record<string, unknown>;
    const db = database as unknown as ProductDatabase;
    if (v.action === "create") {
      if (typeof v.name !== "string" || typeof v.description !== "string" ||
          typeof v.productType !== "string") throw Error("Datos inválidos");
      const product = await createDraftProduct(db, {
        name: v.name, description: v.description, productType: v.productType,
      }, principal.id, crypto.randomUUID(), crypto.randomUUID());
      return NextResponse.json({ created: true, ...product }, { status: 201, headers: { "Cache-Control": "no-store" } });
    }
    if (v.action === "visibility") {
      if (typeof v.id !== "string") throw Error("ID inválido");
      const previous = validateStatus(v.previous);
      const target = validateStatus(v.target);
      await changeProductStatus(db, v.id, previous, target, principal.id, crypto.randomUUID());
      return NextResponse.json({ updated: true }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  } catch (error) {
    if (error instanceof ProductConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Operación rechazada o datos inválidos" }, { status: 403 });
  }
}
