import { ArrowLeft, CalendarClock, Clock } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InstagramIcon } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { getBarberBySlug, getBarberNextSlots, getBarberServices, getSchedules, getServices, getSettings } from "@/lib/data";
import { WEEKDAYS, capitalize, formatDuration, formatMoney, instagramLink } from "@/lib/format";
import { localDate, localTime } from "@/lib/time";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const b = await getBarberBySlug(slug);
  return b ? { title: b.name, description: b.bio?.replace(/\[.*?\]/g, "").slice(0, 160) } : { title: "Barbero" };
}

export default async function BarberPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const barber = await getBarberBySlug(slug);
  if (!barber) notFound();

  const [settings, schedules, allServices, links, nextSlots] = await Promise.all([
    getSettings(),
    getSchedules(),
    getServices(),
    getBarberServices(),
    getBarberNextSlots(barber.id, 8),
  ]);
  const mine = schedules.filter((s) => s.barber_id === barber.id);
  const serviceIds = new Set(links.filter((l) => l.barber_id === barber.id).map((l) => l.service_id));
  const services = allServices.filter((s) => serviceIds.has(s.id));
  const ig = instagramLink(barber.instagram);
  const tz = settings.timezone;

  const slotsByDay = nextSlots.reduce<Record<string, string[]>>((acc, iso) => {
    const d = localDate(iso, tz);
    (acc[d] ??= []).push(iso);
    return acc;
  }, {});

  return (
    <div className="pb-24 pt-28 md:pt-36">
      <div className="mx-auto max-w-7xl px-5 md:px-8">
        <Link href="/barberos" className="mb-8 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-bone">
          <ArrowLeft className="h-4 w-4" /> Todo el equipo
        </Link>

        <div className="grid gap-10 lg:grid-cols-5 lg:gap-16">
          <div className="lg:col-span-2">
            <div className="sticky top-28">
              <SmartImage src={barber.photo_url} alt={barber.name} label={barber.name} priority className="aspect-[4/5] rounded-[2rem]" />
            </div>
          </div>

          <div className="lg:col-span-3">
            {barber.role_title && <span className="eyebrow">{barber.role_title}</span>}
            <h1 className="h-display mt-3 text-5xl text-bone md:text-7xl">{barber.name}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-ink-300">
              {barber.years_experience != null && (
                <span className="rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-gold-light">
                  {barber.years_experience} años de experiencia
                </span>
              )}
              {ig && (
                <a href={ig} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-gold">
                  <InstagramIcon className="h-4 w-4" /> Instagram
                </a>
              )}
            </div>
            {barber.bio && <p className="mt-7 max-w-2xl text-base leading-relaxed text-ink-300">{barber.bio}</p>}

            {barber.specialties.length > 0 && (
              <div className="mt-8">
                <h2 className="eyebrow mb-3">Especialidades</h2>
                <div className="flex flex-wrap gap-2">
                  {barber.specialties.map((s) => (
                    <span key={s} className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm text-bone-dim">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <section className="rounded-3xl border border-white/[0.07] bg-ink-850 p-6">
                <h2 className="eyebrow mb-4 flex items-center gap-2">
                  <CalendarClock className="h-4 w-4" /> Próximas horas libres
                </h2>
                {nextSlots.length ? (
                  <div className="space-y-4">
                    {Object.entries(slotsByDay).map(([day, slots]) => (
                      <div key={day}>
                        <p className="mb-2 text-xs uppercase tracking-wider text-ink-400">
                          {capitalize(new Intl.DateTimeFormat(settings.locale, { timeZone: tz, weekday: "long", day: "numeric", month: "short" }).format(new Date(slots[0])))}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((iso) => (
                            <Link
                              key={iso}
                              href={`/reservar?barbero=${barber.id}&fecha=${day}`}
                              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-bone transition-colors hover:border-gold hover:bg-gold hover:text-ink-950"
                            >
                              {localTime(iso, tz)}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-ink-400">No hay horas libres en los próximos días.</p>
                )}
              </section>

              <section className="rounded-3xl border border-white/[0.07] bg-ink-850 p-6">
                <h2 className="eyebrow mb-4 flex items-center gap-2">
                  <Clock className="h-4 w-4" /> Horario de trabajo
                </h2>
                <ul className="divide-y divide-white/[0.06] text-sm">
                  {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                    const ranges = mine.filter((s) => s.weekday === wd);
                    return (
                      <li key={wd} className="flex justify-between py-2.5">
                        <span className="text-bone-dim">{WEEKDAYS[wd]}</span>
                        <span className={ranges.length ? "text-bone" : "text-ink-500"}>
                          {ranges.length
                            ? ranges.map((r) => `${r.start_time.slice(0, 5)}–${r.end_time.slice(0, 5)}`).join(" · ")
                            : "Descanso"}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            </div>

            {services.length > 0 && (
              <section className="mt-10">
                <h2 className="eyebrow mb-4">Servicios que realiza</h2>
                <ul className="divide-y divide-white/[0.06] rounded-3xl border border-white/[0.07] bg-ink-850">
                  {services.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/reservar?servicio=${s.id}&barbero=${barber.id}`}
                        className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-white/[0.02]"
                      >
                        <span>
                          <span className="block font-display uppercase tracking-wide text-bone">{s.name}</span>
                          <span className="text-xs text-ink-400">{formatDuration(s.duration_min)}</span>
                        </span>
                        <span className="font-display text-lg text-gold">{formatMoney(s.price, settings.currency, settings.locale)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-10">
              <ButtonLink href={`/reservar?barbero=${barber.id}`} size="lg" className="w-full sm:w-auto">
                Reservar con {barber.name.split(" ")[0]}
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
