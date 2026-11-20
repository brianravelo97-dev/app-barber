import { ArrowUpRight, Clock } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { SmartImage } from "@/components/ui/smart-image";
import { formatDuration, formatMoney } from "@/lib/format";
import type { Barber, Service } from "@/lib/types";

export function ServiceCard({ service, currency, locale }: { service: Service; currency: string; locale: string }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-ink-850 transition-all duration-500 hover:-translate-y-1 hover:border-gold/30 hover:shadow-[0_30px_60px_-30px_rgba(200,161,101,0.35)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        <SmartImage
          src={service.image_url}
          alt={service.name}
          label={service.category ?? undefined}
          className="h-full w-full"
          imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-premium)] group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-850 via-ink-850/10 to-transparent" />
        {service.category && (
          <span className="absolute left-4 top-4 rounded-full bg-ink-950/70 px-3 py-1 font-display text-[10px] uppercase tracking-[0.25em] text-gold-light backdrop-blur">
            {service.category}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6 pt-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-display text-2xl uppercase tracking-wide text-bone">{service.name}</h3>
          <span className="shrink-0 font-display text-2xl text-gold">{formatMoney(service.price, currency, locale)}</span>
        </div>
        {service.description && <p className="text-sm leading-relaxed text-ink-300">{service.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-ink-400">
            <Clock className="h-3.5 w-3.5" /> {formatDuration(service.duration_min)}
          </span>
          <ButtonLink href={`/reservar?servicio=${service.id}`} size="sm" variant="outline">
            Reservar
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}

export function BarberCard({ barber }: { barber: Barber }) {
  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/[0.07] bg-ink-850">
      <Link href={`/barberos/${barber.slug}`} className="block">
        <div className="relative aspect-[3/4] overflow-hidden">
          <SmartImage
            src={barber.photo_url}
            alt={barber.name}
            label={barber.name}
            className="h-full w-full"
            imgClassName="grayscale transition-all duration-[1.2s] ease-[var(--ease-premium)] group-hover:scale-105 group-hover:grayscale-0"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            {barber.role_title && <span className="eyebrow">{barber.role_title}</span>}
            <h3 className="mt-2 font-display text-3xl uppercase tracking-wide text-bone">{barber.name}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {barber.specialties.slice(0, 3).map((s) => (
                <span key={s} className="rounded-full border border-white/15 bg-ink-950/50 px-2.5 py-1 text-[11px] text-bone-dim backdrop-blur">
                  {s}
                </span>
              ))}
            </div>
          </div>
          <span className="absolute right-5 top-5 grid h-11 w-11 translate-y-2 place-items-center rounded-full bg-gold text-ink-950 opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </div>
      </Link>
    </article>
  );
}
