import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PublicShell } from "@/components/layout/public-shell";

export const metadata: Metadata = {
  title: "Página no encontrada",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <PublicShell>
      <section className="mx-auto flex max-w-xl flex-col items-center px-5 py-20 text-center">
        <Image src="/brand/chusquisimas-logo.svg" alt="" width={112} height={112} className="h-28 w-28" />
        <h1 className="mt-6 text-3xl font-bold tracking-tight sm:text-4xl">
          Esta página se nos derritió.
        </h1>
        <p className="mt-4 leading-7 text-fg-muted">
          No encontramos lo que buscabas. Puede que el enlace haya cambiado o que el producto
          ya no esté disponible.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/tienda"
            className="rounded-full bg-action px-6 py-3 font-bold text-on-action transition-colors hover:bg-action-hover hover:text-on-action-hover">
            Ver la tienda
          </Link>
          <Link href="/" className="rounded-full border border-line-control px-6 py-3 font-bold">
            Ir al inicio
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}
