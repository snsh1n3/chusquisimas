import { SiteHeader } from "@/components/layout/site-header";
import { Hero } from "@/components/home/hero";

const categories = [
  {
    number: "01",
    title: "Velas aromáticas",
    description: "Aromas que hacen que cualquier rincón se sienta especial.",
    accent: "bg-brand-orange",
    text: "text-white",
  },
  {
    number: "02",
    title: "Wax melts",
    description: "Pequeños detalles llenos de aroma y personalidad.",
    accent: "bg-brand-yellow",
    text: "text-brand-black",
  },
  {
    number: "03",
    title: "Detalles personalizados",
    description: "Ideas únicas para celebrar momentos que importan.",
    accent: "bg-brand-cream-deep",
    text: "text-brand-black",
  },
];

export default function Home() {
  return (
    <main id="inicio" className="min-h-screen bg-brand-cream text-brand-black">
      <SiteHeader />
      <Hero />

      <section
        id="colecciones"
        className="bg-brand-white px-5 py-12 sm:py-16 md:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <p className="font-bold uppercase tracking-[0.2em] text-brand-orange">
            Un universo de aromas
          </p>
          <h2 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Algo chusquísimo para cada ocasión.
          </h2>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {categories.map((category) => (
              <article
                key={category.number}
                className={`${category.accent} ${category.text} flex min-h-52 flex-col justify-between rounded-[1.5rem] p-6 shadow-sm sm:min-h-56 sm:p-7`}
              >
                <span className="text-sm font-bold">
                  {category.number} / Colección
                </span>

                <div>
                  <h3 className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {category.title}
                  </h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed sm:text-base">
                    {category.description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        id="nuestra-esencia"
        className="px-5 py-12 sm:py-16 md:px-10"
      >
        <div className="mx-auto grid max-w-7xl items-center gap-8 md:grid-cols-2">
          <div>
            <p className="font-bold uppercase tracking-[0.2em] text-brand-orange">
              Nuestra esencia
            </p>
            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Más que aromas: pequeños momentos felices.
            </h2>
          </div>

          <p className="text-lg leading-relaxed">
            Creemos en los detalles hechos con intención.
            Creamos productos artesanales con recipientes
            de cemento y ceras vegetales, para acompañar
            momentos cotidianos y ocasiones especiales.
          </p>
        </div>
      </section>

      <footer className="bg-brand-black px-5 py-8 text-brand-white md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-3 text-sm md:flex-row">
          <span className="font-bold">Chusquisimas</span>
          <span>Crea ambiente, enciende tu chusquísima.</span>
          <span>Vista preliminar V2 · No publicada</span>
        </div>
      </footer>
    </main>
  );
}