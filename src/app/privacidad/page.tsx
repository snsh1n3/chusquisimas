import type { Metadata } from "next";
import { PublicShell } from "@/components/layout/public-shell";
import {
  PRIVACY_NOTICE_VERSION, isPrivacyNoticeComplete, privacyNoticeSections,
} from "@/lib/legal/privacy-notice";

export const metadata: Metadata = {
  title: "Aviso de privacidad",
  description: "Cómo trata Chusquisimas los datos personales de quienes registran un pedido.",
  alternates: { canonical: "/privacidad" },
  robots: isPrivacyNoticeComplete() ? undefined : { index: false, follow: false },
};

export default function PrivacyPage() {
  const complete = isPrivacyNoticeComplete();
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-5 py-16">
        {!complete && (
          <p role="note" className="mb-8 rounded-control bg-highlight px-4 py-3 text-sm font-bold text-on-highlight">
            Borrador en revisión. Este aviso aún no está vigente.
          </p>
        )}
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Aviso de privacidad</h1>
        <p className="mt-3 text-sm text-fg-muted">Versión {PRIVACY_NOTICE_VERSION} · Ley 1581 de 2012</p>
        {privacyNoticeSections().map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-xl font-bold">{section.title}</h2>
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">{paragraph}</p>
            ))}
          </section>
        ))}
      </article>
    </PublicShell>
  );
}
