import { ArrowRight, Award, CalendarCheck, Coffee, Mail, MapPin, Phone, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { BarberCard, ServiceCard } from "@/components/site/cards";
import { OpeningHours } from "@/components/site/hours";
import { Reveal } from "@/components/site/reveal";
import { ReviewButton } from "@/components/site/review-form";
import { ButtonLink, buttonClass } from "@/components/ui/button";
import { EmptyState, SectionHeading, Stars } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import {
  getActivePromotions,
  getApprovedReviews,
  getBarbers,
  getBusinessHours,
  getGallery,
  getServices,
  getSettings,
  getUpcomingHolidays,
} from "@/lib/data";
import { instagramLink, whatsappLink } from "@/lib/format";

export const revalidate = 60;

function heroText(desc: string | null) {
  const sentences = cleanText(desc).match(/[^.!?]+[.!?]/g);
  return sentences?.slice(0, 2).join(" ").trim() || "Reserva tu hora online en menos de un minuto.";
}

function cleanText(s: string | null) {
  return s?.replace(/\s*\[.*?\]\s*/g, " ").trim() ?? "";
}

export default async function HomePage() {
  const [settings, services, barbers, gallery, reviews, hours, holidays, promotions] = await Promise.all([
    getSettings(),
    getServices(),
    getBarbers(),
    getGallery(),
    getApprovedReviews(6),
    getBusinessHours(),
    getUpcomingHolidays(),
    getActivePromotions(),
  ]);

  const featured = (services.filter((s) => s.is_featured).length ? services.filter((s) => s.is_featured) : services).slice(0, 4);
  const avgRating = reviews.length ? reviews.reduce((a, r) => a + r.rating, 0) / reviews.length : null;
  const maxYears = Math.max(0, ...barbers.map((b) => b.years_experience ?? 0));
  const wa = whatsappLink(settings.whatsapp, `Hola ${settings.name}, quiero agendar una hora.`);
  const ig = instagramLink(settings.instagram);
  const [headA, ...headRest] = (settings.tagline ?? "Precisión, estilo y carácter.").split(",");
  const mapSrc = settings.map_query
    ? `https://www.google.com/maps?q=${encodeURIComponent(settings.map_query)}&output=embed`
    : null;

  return (
    <>
      {/* HERO */}
      <section className="grain relative flex min-h-[100svh] items-end overflow-hidden pb-16 pt-28 md:items-center md:pb-0">
        <SmartImage
          src={settings.hero_image_url}
          alt={settings.name}
          priority
          className="absolute inset-0"
          imgClassName="scale-105 animate-[fade-in_1.6s_ease_both]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-950/80 via-transparent to-transparent" />

        <div className="relative mx-auto w-full max-w-7xl px-5 md:px-8">
          <div className="max-w-3xl">
            <span className="eyebrow animate-fade-up">{settings.city ?? "Barbería boutique"}</span>
            <h1 className="h-display mt-5 animate-fade-up text-[3.4rem] text-bone [animation-delay:120ms] sm:text-7xl md:text-8xl lg:text-[7.5rem]">
              {headA}
              {headRest.length > 0 && (
                <>
                  ,<br />
                  <span className="font-serif font-normal normal-case italic tracking-normal text-gold">{headRest.join(",").trim()}</span>
                </>
              )}
            </h1>
            <p className="mt-6 max-w-xl animate-fade-up text-base leading-relaxed text-bone-dim [animation-delay:240ms] md:text-lg">
              {heroText(settings.description)}
            </p>
            <div className="mt-9 flex animate-fade-up flex-col gap-3 [animation-delay:360ms] sm:flex-row">
              <ButtonLink href="/reservar" size="lg" icon={<CalendarCheck className="h-5 w-5" />}>
                Reservar hora
              </ButtonLink>
              <ButtonLink href="/servicios" size="lg" variant="outline">
                Ver servicios y precios
              </ButtonLink>
            </div>
          </div>

          <dl className="mt-14 grid max-w-2xl animate-fade-up grid-cols-3 gap-6 border-t border-white/10 pt-6 [animation-delay:480ms]">
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Experiencia</dt>
              <dd className="mt-1 font-display text-3xl text-bone">{maxYears ? `+${maxYears} años` : "Expertos"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Barberos</dt>
              <dd className="mt-1 font-display text-3xl text-bone">{barbers.length || "—"}</dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Valoración</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-display text-3xl text-bone">
                {avgRating ? (
                  <>
                    {avgRating.toFixed(1)} <Star className="h-5 w-5 fill-gold text-gold" />
                  </>
                ) : (
                  "Nuevo"
                )}
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* PROMOCIONES */}
      {promotions.length > 0 && (
        <section className="border-y border-gold/20 bg-gradient-to-r from-gold/10 via-ink-900 to-copper/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 md:flex-row md:items-center md:px-8">
            {promotions.slice(0, 2).map((p) => (
              <div key={p.id} className="flex flex-1 items-center gap-4">
                <Sparkles className="h-6 w-6 shrink-0 text-gold" />
                <div className="flex-1">
                  <p className="font-display text-lg uppercase tracking-wide text-bone">
                    {p.badge && <span className="mr-2 rounded bg-gold px-1.5 py-0.5 text-[10px] text-ink-950">{p.badge}</span>}
                    {p.title}
                  </p>
                  {p.description && <p className="text-sm text-ink-300">{p.description}</p>}
                </div>
                <ButtonLink
                  href={`/reservar${p.service_id ? `?servicio=${p.service_id}` : ""}${p.coupon_code ? `${p.service_id ? "&" : "?"}cupon=${p.coupon_code}` : ""}`}
                  size="sm"
                  variant="outline"
                >
                  Aprovechar
                </ButtonLink>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* PRESENTACIÓN */}
      <section className="relative py-24 md:py-36">
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 md:grid-cols-2 md:px-8 lg:gap-24">
          <Reveal className="relative">
            <SmartImage
              src={gallery[1]?.image_url ?? settings.hero_image_url}
              alt="El estudio"
              className="aspect-[4/5] rounded-[2rem]"
            />
            <div className="absolute -bottom-8 -right-4 hidden w-56 rounded-3xl border border-white/10 bg-ink-850/95 p-6 backdrop-blur md:block lg:-right-10">
              <Award className="h-8 w-8 text-gold" strokeWidth={1.25} />
              <p className="mt-3 font-display text-xl uppercase leading-tight text-bone">Detalle en cada corte</p>
              <p className="mt-2 text-xs text-ink-400">Técnica clásica, estilo contemporáneo.</p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <span className="eyebrow">La barbería</span>
            <h2 className="h-display mt-4 text-4xl text-bone sm:text-5xl md:text-6xl">
              Más que un corte,
              <br />
              <span className="font-serif font-normal normal-case italic text-gold">un ritual</span>
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-ink-300 md:text-base">
              {cleanText(settings.description) || "Un espacio pensado para el hombre que cuida su imagen."}
            </p>
            <ul className="mt-10 grid gap-6 sm:grid-cols-3">
              {[
                { icon: Sparkles, t: "Toalla caliente", d: "En cada servicio de barba" },
                { icon: Coffee, t: "Café & bebidas", d: "Relájate mientras esperas" },
                { icon: CalendarCheck, t: "Reserva 24/7", d: "Sin llamadas ni esperas" },
              ].map(({ icon: Icon, t, d }) => (
                <li key={t} className="border-l border-gold/40 pl-4">
                  <Icon className="h-5 w-5 text-gold" strokeWidth={1.5} />
                  <p className="mt-3 font-display text-sm uppercase tracking-wider text-bone">{t}</p>
                  <p className="mt-1 text-xs text-ink-400">{d}</p>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>

      {/* SERVICIOS DESTACADOS */}
      <section className="bg-ink-900 py-24 md:py-32" id="servicios">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Servicios"
            title={
              <>
                Elige tu <span className="font-serif font-normal normal-case italic text-gold">estilo</span>
              </>
            }
            description="Precios claros, duración exacta y la posibilidad de reservar al instante."
            action={
              <Link href="/servicios" className="group inline-flex items-center gap-2 font-display text-sm uppercase tracking-[0.2em] text-gold">
                Ver todos <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
          {featured.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featured.map((s, i) => (
                <Reveal key={s.id} delay={i * 90}>
                  <ServiceCard service={s} currency={settings.currency} locale={settings.locale} />
                </Reveal>
              ))}
            </div>
          ) : (
            <EmptyState title="Servicios en preparación" description="Pronto publicaremos nuestro catálogo." />
          )}
        </div>
      </section>

      {/* BARBEROS */}
      <section className="py-24 md:py-32" id="barberos">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="El equipo"
            title={
              <>
                Manos <span className="font-serif font-normal normal-case italic text-gold">expertas</span>
              </>
            }
            description="Elige a tu barbero de confianza o deja que te asignemos al primero disponible."
            action={
              <Link href="/barberos" className="group inline-flex items-center gap-2 font-display text-sm uppercase tracking-[0.2em] text-gold">
                Conocer al equipo <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            }
          />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {barbers.map((b, i) => (
              <Reveal key={b.id} delay={i * 90}>
                <BarberCard barber={b} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* GALERÍA */}
      {gallery.length > 0 && (
        <section className="bg-ink-900 py-24 md:py-32" id="galeria">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <SectionHeading
              eyebrow="Galería"
              title={
                <>
                  Nuestro <span className="font-serif font-normal normal-case italic text-gold">trabajo</span>
                </>
              }
              action={
                ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                    <InstagramIcon className="h-4 w-4" /> Más en Instagram
                  </a>
                )
              }
            />
            <div className="grid auto-rows-[180px] grid-cols-2 gap-3 md:auto-rows-[240px] md:grid-cols-4 md:gap-4">
              {gallery.slice(0, 6).map((g, i) => (
                <Reveal
                  key={g.id}
                  delay={i * 60}
                  className={i === 0 ? "col-span-2 row-span-2" : i === 3 ? "md:col-span-2" : ""}
                >
                  <figure className="group relative h-full overflow-hidden rounded-2xl">
                    <SmartImage
                      src={g.image_url}
                      alt={g.caption ?? "Trabajo de la barbería"}
                      className="h-full w-full"
                      imgClassName="transition-transform duration-[1.2s] ease-[var(--ease-premium)] group-hover:scale-105"
                    />
                    {g.caption && (
                      <figcaption className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-ink-950/90 to-transparent p-4 font-display text-xs uppercase tracking-[0.2em] text-bone opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100">
                        {g.caption}
                      </figcaption>
                    )}
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* OPINIONES */}
      {settings.features.reviews && (
        <section className="py-24 md:py-32" id="opiniones">
          <div className="mx-auto max-w-7xl px-5 md:px-8">
            <SectionHeading
              eyebrow="Opiniones"
              title={
                <>
                  Lo que dicen <span className="font-serif font-normal normal-case italic text-gold">nuestros clientes</span>
                </>
              }
              description={avgRating ? `${avgRating.toFixed(1)} de 5 según ${reviews.length} opiniones recientes.` : undefined}
              action={<ReviewButton />}
            />
            {reviews.length ? (
              <div className="grid gap-5 md:grid-cols-3">
                {reviews.map((r, i) => (
                  <Reveal key={r.id} delay={i * 80}>
                    <blockquote className="flex h-full flex-col rounded-3xl border border-white/[0.07] bg-ink-850 p-7">
                      <Stars value={r.rating} />
                      {r.comment && (
                        <p className="mt-5 flex-1 font-serif text-lg italic leading-relaxed text-bone-dim">“{r.comment}”</p>
                      )}
                      <footer className="mt-6 flex items-center justify-between text-sm">
                        <span className="font-display uppercase tracking-wider text-bone">{r.customer_name}</span>
                        {r.is_verified && <span className="text-[11px] uppercase tracking-wider text-gold">Visita verificada</span>}
                      </footer>
                    </blockquote>
                  </Reveal>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10">
                <EmptyState
                  icon={<Star className="h-6 w-6" />}
                  title="Sé el primero en opinar"
                  description="¿Ya nos visitaste? Cuéntanos tu experiencia."
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="relative overflow-hidden border-y border-white/[0.06] bg-gradient-to-br from-ink-850 via-ink-900 to-ink-950 py-20 md:py-28">
        <div className="pointer-events-none absolute -right-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-gold/10 blur-3xl" />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-5 text-center">
          <span className="eyebrow">Tu próxima visita</span>
          <h2 className="h-display mt-5 text-5xl text-bone md:text-7xl">
            Reserva en <span className="gold-text">menos de un minuto</span>
          </h2>
          <p className="mt-5 max-w-lg text-ink-300">Elige servicio, barbero y hora. Recibirás la confirmación al instante.</p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/reservar" size="lg">
              Reservar hora
            </ButtonLink>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "lg")}>
                <WhatsAppIcon className="h-5 w-5" /> Escríbenos
              </a>
            )}
          </div>
        </div>
      </section>

      {/* UBICACIÓN / HORARIOS / CONTACTO */}
      <section className="py-24 md:py-32" id="contacto">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <SectionHeading
            eyebrow="Visítanos"
            title={
              <>
                Ubicación <span className="font-serif font-normal normal-case italic text-gold">& horarios</span>
              </>
            }
          />
          <div className="grid gap-6 lg:grid-cols-5">
            <div className="overflow-hidden rounded-3xl border border-white/[0.07] bg-ink-850 lg:col-span-3">
              {mapSrc ? (
                <iframe
                  title={`Mapa de ${settings.name}`}
                  src={mapSrc}
                  className="h-[340px] w-full grayscale invert-[0.92] hue-rotate-180 md:h-full md:min-h-[460px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <EmptyState icon={<MapPin className="h-6 w-6" />} title="Ubicación" description={settings.address ?? "Pronto"} />
              )}
            </div>
            <div className="flex flex-col gap-6 lg:col-span-2">
              <div className="rounded-3xl border border-white/[0.07] bg-ink-850 p-7">
                <h3 className="eyebrow mb-5">Horario</h3>
                <OpeningHours hours={hours} holidays={holidays} timezone={settings.timezone} />
              </div>
              <div className="rounded-3xl border border-white/[0.07] bg-ink-850 p-7">
                <h3 className="eyebrow mb-5">Contacto</h3>
                <ul className="space-y-4 text-[15px] text-bone-dim">
                  {settings.address && (
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-gold" />
                      <span>
                        {settings.address}
                        {settings.city && <span className="block text-sm text-ink-400">{settings.city}</span>}
                      </span>
                    </li>
                  )}
                  {settings.phone && (
                    <li className="flex gap-3">
                      <Phone className="h-5 w-5 shrink-0 text-gold" />
                      <a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-bone">
                        {settings.phone}
                      </a>
                    </li>
                  )}
                  {settings.email && (
                    <li className="flex gap-3">
                      <Mail className="h-5 w-5 shrink-0 text-gold" />
                      <a href={`mailto:${settings.email}`} className="break-all hover:text-bone">
                        {settings.email}
                      </a>
                    </li>
                  )}
                </ul>
                <div className="mt-6 grid grid-cols-2 gap-3">
                  {wa && (
                    <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("primary", "md", "w-full")}>
                      <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                    </a>
                  )}
                  {ig && (
                    <a href={ig} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md", "w-full")}>
                      <InstagramIcon className="h-4 w-4" /> Instagram
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
