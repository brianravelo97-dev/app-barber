import type { Metadata } from "next";
import { BarberCard } from "@/components/site/cards";
import { Reveal } from "@/components/site/reveal";
import { EmptyState } from "@/components/ui/misc";
import { getBarbers } from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Nuestro equipo", description: "Conoce a nuestros barberos y reserva con tu favorito." };

export default async function BarbersPage() {
  const barbers = await getBarbers();
  return (
    <div className="pb-24 pt-32 md:pt-40">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <header className="mb-16 max-w-3xl">
          <span className="eyebrow">El equipo</span>
          <h1 className="h-display mt-4 text-5xl text-bone md:text-7xl">
            Nuestros <span className="font-serif font-normal normal-case italic text-gold">barberos</span>
          </h1>
          <p className="mt-5 text-ink-300">Cada barbero tiene su agenda propia. Revisa sus especialidades y próximas horas disponibles.</p>
        </header>
        {barbers.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b, i) => (
              <Reveal key={b.id} delay={i * 80}>
                <BarberCard barber={b} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState title="Equipo en preparación" />
        )}
      </div>
    </div>
  );
}
