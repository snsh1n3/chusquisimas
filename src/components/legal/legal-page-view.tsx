import Link from "next/link";
import { PublicShell } from "@/components/layout/public-shell";
import { LEGAL_PAGES_VERSION, type LegalPage } from "@/lib/legal/legal-pages";

/** Presentación común de las páginas legales y de confianza. */
export function LegalPageView({ page }: { page: LegalPage }) {
  return (
    <PublicShell>
      <article className="mx-auto max-w-3xl px-5 py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{page.title}</h1>
        <p className="mt-3 text-sm text-fg-muted">Actualizado: {LEGAL_PAGES_VERSION}</p>
        <p className="mt-6 text-lg leading-8">{page.intro}</p>
        {page.sections.map((section) => (
          <section key={section.title} className="mt-10">
            <h2 className="text-xl font-bold">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => (
              <p key={paragraph} className="mt-3 leading-7">{paragraph}</p>
            ))}
            {section.items && (
              <ul className="mt-3 list-disc space-y-2 pl-6 leading-7">
                {section.items.map((item) => <li key={item}>{item}</li>)}
              </ul>
            )}
            {section.links && (
              <ul className="mt-3 space-y-2 leading-7">
                {section.links.map((link) => (
                  <li key={link.href}>
                    {link.href.startsWith("http") ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer"
                        className="font-bold text-fg-accent underline underline-offset-4">
                        {link.label}<span className="sr-only"> (se abre en una pestaña nueva)</span>
                      </a>
                    ) : (
                      <Link href={link.href} className="font-bold text-fg-accent underline underline-offset-4">
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </article>
    </PublicShell>
  );
}
