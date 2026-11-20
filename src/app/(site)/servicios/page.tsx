import type { Metadata } from "next";
import { ServiceCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { getServices, getSettings } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Servicios y precios",
  description: "Cortes, fades, barba, afeitado tradicional y tratamientos. Precios y duración de cada servicio.",
};

export default async function ServicesPage() {
  const [settings, services] = await Promise.all([getSettings(), getServices()]);
  const categories = Array.from(new Set(services.map((s) => s.category ?? "Otros")));

  return (
    <div className="pb-24 pt-32 md:pt-40">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <header className="mb-16 max-w-3xl">
          <span className="eyebrow">Catálogo</span>
          <h1 className="h-display mt-4 text-5xl text-bone md:text-7xl">
            Servicios <span className="font-serif font-normal normal-case italic text-gold">& precios</span>
          </h1>
          <p className="mt-5 text-ink-300">
            Todos nuestros servicios incluyen asesoría personalizada. Elige el tuyo y reserva en segundos.
          </p>
          {categories.length > 1 && (
            <nav className="scrollbar-none -mx-5 mt-8 flex gap-2 overflow-x-auto px-5" aria-label="Categorías">
              {categories.map((c) => (
                <a
                  key={c}
                  href={`#${encodeURIComponent(c)}`}
                  className="shrink-0 rounded-full border border-white/10 px-4 py-2 font-display text-xs uppercase tracking-[0.2em] text-bone-dim hover:border-gold hover:text-gold"
                >
                  {c}
                </a>
              ))}
            </nav>
          )}
        </header>

        {services.length === 0 ? (
          <EmptyState title="Sin servicios publicados" description="Vuelve pronto." />
        ) : (
          categories.map((cat) => (
            <section key={cat} id={encodeURIComponent(cat)} className="mb-16 scroll-mt-28">
              <h2 className="mb-6 flex items-center gap-4 font-display text-xl uppercase tracking-[0.25em] text-gold">
                {cat}
                <span className="h-px flex-1 bg-white/[0.08]" />
              </h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {services
                  .filter((s) => (s.category ?? "Otros") === cat)
                  .map((s, i) => (
                    <Reveal key={s.id} delay={i * 70}>
                      <ServiceCard service={s} currency={settings.currency} locale={settings.locale} />
                    </Reveal>
                  ))}
              </div>
            </section>
          ))
        )}

        <div className="mt-8 flex flex-col items-center gap-4 rounded-3xl border border-white/[0.07] bg-ink-850 p-10 text-center">
          <p className="font-display text-2xl uppercase tracking-wide text-bone">¿No sabes qué elegir?</p>
          <p className="max-w-md text-sm text-ink-400">Reserva un corte clásico y tu barbero te asesorará según tu tipo de cabello y rostro.</p>
          <ButtonLink href="/reservar" size="lg">
            Reservar hora
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}
