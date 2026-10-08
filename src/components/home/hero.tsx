export function Hero() {
  return (
    <section
      aria-labelledby="hero-title"
      className="overflow-hidden bg-brand-cream px-5 py-10 sm:py-14 lg:px-10 lg:py-20"
    >
      <div className="mx-auto grid max-w-7xl items-center gap-9 lg:grid-cols-2 lg:gap-14">
        <div>
          <span className="inline-flex rounded-full border border-brand-black/15 bg-brand-white px-4 py-2 text-xs font-bold sm:text-sm">
            Hecho a mano, pensado para ti
          </span>

          <h1
            id="hero-title"
            className="mt-5 max-w-xl text-[clamp(2.1rem,8vw,4.5rem)] font-bold leading-[1.08] tracking-tight"
          >
            Crea ambiente,
            <span className="block text-brand-orange">
              enciende tu chusquísima.
            </span>
          </h1>

          <p className="mt-5 max-w-lg text-base leading-relaxed sm:text-lg">
            Velas aromáticas, wax melts y detalles artesanales
            para llenar tus espacios de personalidad.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <a
              href="#colecciones"
              className="inline-flex min-h-11 items-center justify-center rounded-full bg-brand-orange px-5 py-3 text-sm font-bold text-white transition-transform hover:-translate-y-1"
            >
              Explorar colecciones
              <span aria-hidden="true" className="ml-2">→</span>
            </a>

            <a
              href="#nuestra-esencia"
              className="inline-flex min-h-11 items-center justify-center rounded-full border-2 border-brand-black px-5 py-3 text-sm font-bold hover:bg-brand-yellow"
            >
              Nuestra esencia
            </a>
          </div>
        </div>

        <div className="relative mx-auto aspect-[5/4] w-full max-w-[540px] overflow-hidden rounded-[2rem] bg-brand-yellow sm:aspect-[6/4] lg:aspect-square">
          <div
            aria-hidden="true"
            className="absolute -left-10 -top-14 h-44 w-44 rounded-full border-[24px] border-brand-orange/75 sm:h-56 sm:w-56"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-20 -right-12 h-64 w-64 rounded-full bg-brand-orange/80 sm:h-80 sm:w-80"
          />
          <div
            aria-hidden="true"
            className="absolute right-[12%] top-[15%] h-8 w-8 rotate-12 rounded-xl bg-brand-white sm:h-12 sm:w-12"
          />
          <div
            aria-hidden="true"
            className="absolute bottom-[20%] left-[13%] h-5 w-5 rounded-full bg-brand-white"
          />

          <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
            <span className="text-5xl font-bold text-brand-black sm:text-7xl">
              ¡Qué chusquísimo!
            </span>
            <span className="mt-5 rounded-full bg-brand-white px-5 py-2 text-sm font-bold text-brand-black">
              Pequeños detalles, grandes momentos
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}