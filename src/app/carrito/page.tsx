import type { Metadata } from "next";
import Link from "next/link";
import { CartView } from "@/components/cart/cart-view";
import { PublicShell } from "@/components/layout/public-shell";
import { getPublicOrdersConfig } from "@/lib/orders/runtime";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Tu carrito",
  robots: { index: false, follow: false },
};

export default async function CartPage() {
  const { enabled, turnstileSiteKey } = await getPublicOrdersConfig();
  return (
    <PublicShell>
      <section className="mx-auto max-w-6xl px-5 py-12 md:px-10">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu carrito</h1>
        <div className="mt-8">
          {enabled ? (
            <CartView turnstileSiteKey={turnstileSiteKey} />
          ) : (
            <div className="rounded-card border border-line bg-surface p-8">
              <p className="text-lg font-bold">Muy pronto podrás registrar tus pedidos aquí.</p>
              <p className="mt-2 text-fg-muted">
                Mientras tanto, elige tu producto en la tienda y pídelo por WhatsApp desde su página.
              </p>
              <Link href="/tienda" className="mt-6 inline-block rounded-full bg-action px-6 py-3 font-bold text-on-action">
                Ir a la tienda
              </Link>
            </div>
          )}
        </div>
      </section>
    </PublicShell>
  );
}
