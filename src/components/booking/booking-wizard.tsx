"use client";

import { clsx } from "clsx";
import {
  ArrowLeft,
  BadgePercent,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Scissors,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { WhatsAppIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { useToast } from "@/components/ui/toast";
import { WaitlistForm } from "@/components/booking/waitlist-form";
import { capitalize, formatDuration, formatMoney, whatsappLink } from "@/lib/format";
import { addDays, localTime, todayInTz, weekdayOf } from "@/lib/time";
import type { Barber, BusinessHour, Features, Service } from "@/lib/types";

type WizardSettings = {
  name: string;
  timezone: string;
  currency: string;
  locale: string;
  maxAdvanceDays: number;
  cancellationPolicy: string | null;
  autoConfirm: boolean;
  features: Features;
  whatsapp: string | null;
};

type Props = {
  settings: WizardSettings;
  services: Service[];
  barbers: Barber[];
  links: { barber_id: string; service_id: string }[];
  schedules: { barber_id: string; weekday: number }[];
  hours: BusinessHour[];
  holidays: string[];
};

type Slot = { start: string; barbers: string[] };
const ANY = "any";
const STEPS = ["Servicio", "Barbero", "Fecha y hora", "Tus datos"] as const;
const STORAGE_KEY = "booking:customer";

export function BookingWizard(props: Props) {
  return (
    <Suspense fallback={<Skeleton className="h-[60vh]" />}>
      <Wizard {...props} />
    </Suspense>
  );
}

function Wizard({ settings, services, barbers, links, schedules, hours, holidays }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();
  const tz = settings.timezone;
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale);

  const initialService = services.find((s) => s.id === params.get("servicio"))?.id ?? null;
  const initialBarber = barbers.find((b) => b.id === params.get("barbero"))?.id ?? null;
  const initialDate = params.get("fecha");

  const [step, setStep] = useState(initialService ? (initialBarber ? 2 : 1) : 0);
  const [serviceId, setServiceId] = useState<string | null>(initialService);
  const [barberId, setBarberId] = useState<string>(initialBarber ?? ANY);
  const [barberChosen, setBarberChosen] = useState(Boolean(initialBarber));
  const [date, setDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Fecha elegida automáticamente (no por el cliente): si no tiene horas, se avanza sola.
  const autoDate = useRef(!initialDate);
  const autoTries = useRef(0);
  const [skippedNotice, setSkippedNotice] = useState(false);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [couponOpen, setCouponOpen] = useState(Boolean(params.get("cupon")));
  const [coupon, setCoupon] = useState(params.get("cupon") ?? "");
  const [couponState, setCouponState] = useState<{ code: string; discount: number; total: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");

  const topRef = useRef<HTMLDivElement>(null);

  // Datos recordados del cliente (reservas repetidas más rápidas)
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (saved) {
        setName(saved.name ?? "");
        setPhone(saved.phone ?? "");
        setEmail(saved.email ?? "");
      }
    } catch {}
  }, []);

  const service = services.find((s) => s.id === serviceId) ?? null;
  const barber = barbers.find((b) => b.id === barberId) ?? null;
  const eligibleBarbers = useMemo(
    () => (serviceId ? barbers.filter((b) => links.some((l) => l.barber_id === b.id && l.service_id === serviceId)) : barbers),
    [barbers, links, serviceId],
  );

  // Días seleccionables
  const today = todayInTz(tz);
  const days = useMemo(() => {
    const n = Math.min(settings.maxAdvanceDays, 45);
    const workingBarbers = barberId === ANY ? eligibleBarbers.map((b) => b.id) : [barberId];
    return Array.from({ length: n + 1 }, (_, i) => {
      const d = addDays(today, i);
      const wd = weekdayOf(d);
      const h = hours.find((x) => x.weekday === wd);
      const open =
        !!h?.is_open &&
        !holidays.includes(d) &&
        schedules.some((s) => s.weekday === wd && workingBarbers.includes(s.barber_id));
      return { date: d, weekday: wd, open };
    });
  }, [today, settings.maxAdvanceDays, hours, holidays, schedules, barberId, eligibleBarbers]);

  // Selección inicial de fecha
  useEffect(() => {
    if (step !== 2 || date) return;
    const fromParam = days.find((d) => d.date === initialDate && d.open);
    const first = fromParam ?? days.find((d) => d.open);
    if (first) setDate(first.date);
  }, [step, date, days, initialDate]);

  const loadSlots = useCallback(async () => {
    if (!serviceId || !date) return;
    setSlots(null);
    setSlotsError(null);
    try {
      const qs = new URLSearchParams({ service: serviceId, date });
      if (barberId !== ANY) qs.set("barber", barberId);
      const res = await fetch(`/api/availability?${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      if (json.slots.length === 0 && autoDate.current && autoTries.current < 14) {
        const next = days.find((d) => d.open && d.date > date);
        if (next) {
          autoTries.current += 1;
          setSkippedNotice(true);
          setDate(next.date);
          return;
        }
      }
      setSlots(json.slots);
    } catch (e) {
      setSlotsError(e instanceof Error ? e.message : "No se pudo cargar la disponibilidad");
      setSlots([]);
    }
  }, [serviceId, date, barberId, days]);

  useEffect(() => {
    if (step === 2) loadSlots();
  }, [step, loadSlots]);

  // Reiniciar cupón si cambia el servicio
  useEffect(() => setCouponState(null), [serviceId]);

  function go(n: number) {
    setStep(n);
    requestAnimationFrame(() => topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function pickService(id: string) {
    setServiceId(id);
    setSlot(null);
    if (barberId !== ANY && !links.some((l) => l.barber_id === barberId && l.service_id === id)) {
      setBarberId(ANY);
      setBarberChosen(false);
    }
    go(barberChosen ? 2 : 1);
  }

  function pickBarber(id: string) {
    autoDate.current = true;
    autoTries.current = 0;
    setBarberId(id);
    setBarberChosen(true);
    setSlot(null);
    setDate(null);
    go(2);
  }

  function pickSlot(s: Slot) {
    setSlot(s);
    go(3);
  }

  async function applyCoupon() {
    if (!coupon.trim() || !serviceId) return;
    setCouponLoading(true);
    try {
      const qs = new URLSearchParams({ code: coupon.trim(), service: serviceId });
      if (date) qs.set("date", date);
      const res = await fetch(`/api/coupons/validate?${qs}`);
      const json = await res.json();
      if (json.valid) {
        setCouponState({ code: json.code, discount: Number(json.discount), total: Number(json.total) });
        toast.success(`Cupón aplicado: -${money(Number(json.discount))}`);
      } else {
        setCouponState(null);
        toast.error("El cupón no es válido o ya expiró.");
      }
    } catch {
      toast.error("No se pudo validar el cupón");
    } finally {
      setCouponLoading(false);
    }
  }

  function validate() {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Ingresa tu nombre";
    const digits = phone.replace(/[^0-9]/g, "");
    if (digits.length < 8 || digits.length > 15) e.phone = "Ingresa un teléfono válido con código de país";
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) e.email = "Correo inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    if (!service || !slot || !validate()) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId: service.id,
          barberId: barberId === ANY ? null : barberId,
          startsAt: slot.start,
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || null,
          notes: notes.trim() || null,
          coupon: couponState?.code ?? null,
          website: honeypot,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.code === "SLOT_UNAVAILABLE") {
          toast.error(json.error);
          setSlot(null);
          go(2);
          loadSlots();
          return;
        }
        throw new Error(json.error);
      }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ name: name.trim(), phone: phone.trim(), email: email.trim() }));
      } catch {}
      router.push(`/reserva/${json.booking.code}?nueva=1`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo completar la reserva");
      setSubmitting(false);
    }
  }

  const total = couponState ? couponState.total : (service?.price ?? 0);
  const wa = whatsappLink(settings.whatsapp, `Hola ${settings.name}, necesito ayuda con una reserva.`);

  const grouped = useMemo(() => {
    const g: Record<"Mañana" | "Tarde" | "Noche", Slot[]> = { Mañana: [], Tarde: [], Noche: [] };
    for (const s of slots ?? []) {
      const h = Number(localTime(s.start, tz).slice(0, 2));
      g[h < 12 ? "Mañana" : h < 18 ? "Tarde" : "Noche"].push(s);
    }
    return g;
  }, [slots, tz]);

  if (services.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="h-display text-4xl">Reservas no disponibles</h1>
        <p className="mt-3 text-ink-400">Aún no hay servicios publicados.</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-24">
      <header className="mb-8 md:mb-10">
        <span className="eyebrow">Reserva online</span>
        <h1 className="h-display mt-3 text-4xl text-bone md:text-6xl">
          Reserva tu <span className="font-serif font-normal normal-case italic text-gold">hora</span>
        </h1>
      </header>

      {/* Progreso */}
      <ol className="mb-8 grid grid-cols-4 gap-2" aria-label="Pasos de la reserva">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          const reachable = i <= step || (i === 1 && !!serviceId) || (i === 2 && !!serviceId) || (i === 3 && !!slot);
          return (
            <li key={label}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => reachable && go(i)}
                className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span className={clsx("h-1 rounded-full transition-colors duration-500", done || active ? "bg-gold" : "bg-white/10")} />
                <span
                  className={clsx(
                    "hidden items-center gap-1.5 font-display text-[11px] uppercase tracking-[0.2em] sm:flex",
                    active ? "text-gold" : done ? "text-bone-dim" : "text-ink-500",
                  )}
                >
                  {done && <Check className="h-3 w-3" />} {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mb-6 font-display text-sm uppercase tracking-[0.2em] text-bone-dim sm:hidden">
        Paso {step + 1} de 4 · <span className="text-gold">{STEPS[step]}</span>
      </p>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div key={step} className="min-w-0 animate-fade-up">
          {/* PASO 1: SERVICIO */}
          {step === 0 && (
            <div className="grid gap-3">
              {services.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickService(s.id)}
                  className={clsx(
                    "group flex items-center gap-4 rounded-2xl border p-3 pr-5 text-left transition-all duration-300 sm:p-4",
                    serviceId === s.id ? "border-gold bg-gold/[0.07]" : "border-white/[0.08] bg-ink-850 hover:border-white/20",
                  )}
                >
                  <SmartImage src={s.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl sm:h-20 sm:w-20" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg uppercase tracking-wide text-bone sm:text-xl">{s.name}</span>
                    {s.description && <span className="line-clamp-1 text-sm text-ink-400">{s.description}</span>}
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-ink-400">
                      <Clock className="h-3 w-3" /> {formatDuration(s.duration_min)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block font-display text-xl text-gold">{money(s.price)}</span>
                    <ChevronRight className="ml-auto mt-1 h-5 w-5 text-ink-500 transition-transform group-hover:translate-x-1 group-hover:text-gold" />
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* PASO 2: BARBERO */}
          {step === 1 && (
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => pickBarber(ANY)}
                className={clsx(
                  "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all sm:col-span-2",
                  barberId === ANY && barberChosen ? "border-gold bg-gold/[0.07]" : "border-white/[0.08] bg-ink-850 hover:border-white/20",
                )}
              >
                <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                  <Users className="h-7 w-7" />
                </span>
                <span className="flex-1">
                  <span className="block font-display text-lg uppercase tracking-wide text-bone">Cualquier barbero</span>
                  <span className="text-sm text-ink-400">Más horarios disponibles · te asignamos el primero libre</span>
                </span>
                <ChevronRight className="h-5 w-5 text-ink-500" />
              </button>
              {eligibleBarbers.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => pickBarber(b.id)}
                  className={clsx(
                    "flex items-center gap-4 rounded-2xl border p-4 text-left transition-all",
                    barberId === b.id ? "border-gold bg-gold/[0.07]" : "border-white/[0.08] bg-ink-850 hover:border-white/20",
                  )}
                >
                  <SmartImage src={b.photo_url} alt={b.name} className="h-16 w-16 shrink-0 rounded-full" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-lg uppercase tracking-wide text-bone">{b.name}</span>
                    <span className="line-clamp-1 text-sm text-ink-400">{b.role_title ?? b.specialties.slice(0, 2).join(" · ")}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* PASO 3: FECHA Y HORA */}
          {step === 2 && (
            <div>
              <DateStrip
                days={days}
                value={date}
                onChange={(d) => {
                  autoDate.current = false;
                  setSkippedNotice(false);
                  setDate(d);
                  setSlot(null);
                }}
                locale={settings.locale}
              />
              {skippedNotice && slots && slots.length > 0 && (
                <p className="mt-3 text-xs text-ink-400">Te mostramos el próximo día con horas disponibles.</p>
              )}

              <div className="mt-8">
                {slots === null ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                    {Array.from({ length: 15 }).map((_, i) => (
                      <Skeleton key={i} className="h-12" />
                    ))}
                  </div>
                ) : slotsError ? (
                  <div className="rounded-2xl border border-danger/30 bg-danger/10 p-5 text-sm text-danger">
                    {slotsError}{" "}
                    <button className="underline" onClick={loadSlots}>
                      Reintentar
                    </button>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 p-6 text-center">
                    <CalendarDays className="mx-auto h-8 w-8 text-gold" strokeWidth={1.25} />
                    <p className="mt-3 font-display text-lg uppercase tracking-wide text-bone">Sin horas disponibles</p>
                    <p className="mt-1 text-sm text-ink-400">Prueba otro día{barberId !== ANY ? " u otro barbero" : ""}.</p>
                    {settings.features.waitlist && date && (
                      <div className="mx-auto mt-6 max-w-md text-left">
                        <WaitlistForm serviceId={serviceId} barberId={barberId === ANY ? null : barberId} date={date} defaultName={name} defaultPhone={phone} />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-7">
                    {(Object.keys(grouped) as (keyof typeof grouped)[]).map((k) =>
                      grouped[k].length ? (
                        <div key={k}>
                          <h3 className="mb-3 font-display text-xs uppercase tracking-[0.25em] text-ink-400">{k}</h3>
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 md:grid-cols-6">
                            {grouped[k].map((s) => (
                              <button
                                key={s.start}
                                type="button"
                                onClick={() => pickSlot(s)}
                                className={clsx(
                                  "h-12 rounded-xl border text-[15px] font-medium tabular-nums transition-all duration-200",
                                  slot?.start === s.start
                                    ? "border-gold bg-gold text-ink-950"
                                    : "border-white/10 bg-ink-850 text-bone hover:border-gold/60 hover:text-gold-light",
                                )}
                              >
                                {localTime(s.start, tz)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null,
                    )}
                    {settings.features.waitlist && date && (
                      <details className="rounded-2xl border border-white/[0.07] bg-ink-850 p-4 text-sm">
                        <summary className="cursor-pointer text-ink-300">¿No encuentras la hora que buscas? Únete a la lista de espera</summary>
                        <div className="mt-4">
                          <WaitlistForm serviceId={serviceId} barberId={barberId === ANY ? null : barberId} date={date} defaultName={name} defaultPhone={phone} />
                        </div>
                      </details>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASO 4: DATOS */}
          {step === 3 && service && slot && (
            <form onSubmit={submit} className="flex flex-col gap-5" noValidate>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nombre y apellido *" error={errors.name} htmlFor="b-name" className="sm:col-span-2">
                  <Input id="b-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Juan Pérez" maxLength={80} />
                </Field>
                <Field label="Teléfono (WhatsApp) *" error={errors.phone} htmlFor="b-phone" hint="Incluye el código de país. Te enviaremos la confirmación.">
                  <Input id="b-phone" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+56 9 1234 5678" />
                </Field>
                <Field label="Correo electrónico (opcional)" error={errors.email} htmlFor="b-email">
                  <Input id="b-email" type="email" inputMode="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="tu@correo.com" />
                </Field>
                <Field label="Comentario para tu barbero (opcional)" htmlFor="b-notes" className="sm:col-span-2">
                  <Textarea id="b-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} placeholder="Ej: quiero mantener el largo arriba" />
                </Field>
              </div>
              {/* honeypot */}
              <input type="text" tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} className="hidden" aria-hidden />

              {settings.features.coupons && (
                <div className="rounded-2xl border border-white/[0.07] bg-ink-850 p-4">
                  {!couponOpen ? (
                    <button type="button" className="inline-flex items-center gap-2 text-sm text-gold" onClick={() => setCouponOpen(true)}>
                      <BadgePercent className="h-4 w-4" /> ¿Tienes un cupón de descuento?
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={coupon}
                        onChange={(e) => {
                          setCoupon(e.target.value.toUpperCase());
                          setCouponState(null);
                        }}
                        placeholder="CÓDIGO"
                        className="uppercase tracking-widest"
                        maxLength={30}
                        aria-label="Cupón"
                      />
                      <Button type="button" variant="outline" onClick={applyCoupon} loading={couponLoading} className="h-12 shrink-0">
                        {couponState ? <Check className="h-4 w-4" /> : null} Aplicar
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {settings.cancellationPolicy && <p className="text-xs leading-relaxed text-ink-400">{settings.cancellationPolicy}</p>}

              <Button type="submit" size="lg" loading={submitting} className="w-full">
                Confirmar reserva · {money(total)}
              </Button>
            </form>
          )}

          {step > 0 && (
            <button type="button" onClick={() => go(step - 1)} className="mt-8 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-bone">
              <ArrowLeft className="h-4 w-4" /> Volver
            </button>
          )}
        </div>

        {/* RESUMEN */}
        <aside className="hidden lg:block">
          <div className="sticky top-28">
            <Summary
              service={service}
              barber={barber}
              any={barberId === ANY}
              slot={slot}
              tz={tz}
              locale={settings.locale}
              money={money}
              discount={couponState?.discount ?? 0}
              total={total}
            />
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-400 hover:text-bone">
                <WhatsAppIcon className="h-4 w-4" /> ¿Dudas? Escríbenos
              </a>
            )}
          </div>
        </aside>
      </div>

      {/* Barra inferior móvil */}
      {service && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-ink-900/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 pr-24 backdrop-blur-xl lg:hidden">
          <div className="flex items-center gap-3">
            <Scissors className="h-5 w-5 shrink-0 text-gold" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="truncate font-medium text-bone">{service.name}</p>
              <p className="truncate text-xs text-ink-400">
                {barberId === ANY ? "Cualquier barbero" : barber?.name}
                {slot && ` · ${capitalize(new Intl.DateTimeFormat(settings.locale, { timeZone: tz, weekday: "short", day: "numeric" }).format(new Date(slot.start)))} ${localTime(slot.start, tz)}`}
              </p>
            </div>
            <span className="font-display text-lg text-gold">{money(total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function DateStrip({
  days,
  value,
  onChange,
  locale,
}: {
  days: { date: string; weekday: number; open: boolean }[];
  value: string | null;
  onChange: (d: string) => void;
  locale: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * 280, behavior: "smooth" });

  useEffect(() => {
    if (!value) return;
    ref.current?.querySelector<HTMLElement>(`[data-date="${value}"]`)?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [value]);

  const month = value
    ? capitalize(new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`)))
    : "";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="font-display text-sm uppercase tracking-[0.2em] text-bone-dim">{month}</span>
        <div className="hidden gap-1 sm:flex">
          <button type="button" onClick={() => scroll(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-gold" aria-label="Días anteriores">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => scroll(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-gold" aria-label="Días siguientes">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {days.map((d) => {
          const dt = new Date(`${d.date}T12:00:00Z`);
          const selected = d.date === value;
          return (
            <button
              key={d.date}
              type="button"
              data-date={d.date}
              disabled={!d.open}
              onClick={() => onChange(d.date)}
              className={clsx(
                "flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl border py-3 transition-all duration-200",
                selected
                  ? "border-gold bg-gold text-ink-950"
                  : d.open
                    ? "border-white/10 bg-ink-850 text-bone hover:border-gold/60"
                    : "cursor-not-allowed border-transparent bg-white/[0.02] text-ink-600",
              )}
            >
              <span className="text-[11px] uppercase tracking-wider">
                {new Intl.DateTimeFormat(locale, { timeZone: "UTC", weekday: "short" }).format(dt).replace(".", "")}
              </span>
              <span className="font-display text-2xl leading-tight">{dt.getUTCDate()}</span>
              <span className="text-[10px] uppercase">
                {new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short" }).format(dt).replace(".", "")}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Summary({
  service,
  barber,
  any,
  slot,
  tz,
  locale,
  money,
  discount,
  total,
}: {
  service: Service | null;
  barber: Barber | null;
  any: boolean;
  slot: Slot | null;
  tz: string;
  locale: string;
  money: (n: number) => string;
  discount: number;
  total: number;
}) {
  return (
    <div className="overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-850">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h2 className="eyebrow">Tu reserva</h2>
      </div>
      <dl className="space-y-4 px-6 py-5 text-sm">
        <Row icon={<Sparkles className="h-4 w-4" />} label="Servicio" value={service ? `${service.name} · ${formatDuration(service.duration_min)}` : "—"} />
        <Row icon={<User className="h-4 w-4" />} label="Barbero" value={any ? "Cualquier barbero disponible" : (barber?.name ?? "—")} />
        <Row
          icon={<CalendarDays className="h-4 w-4" />}
          label="Fecha"
          value={slot ? capitalize(new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long" }).format(new Date(slot.start))) : "—"}
        />
        <Row icon={<Clock className="h-4 w-4" />} label="Hora" value={slot ? localTime(slot.start, tz) : "—"} />
      </dl>
      <div className="space-y-1 border-t border-white/[0.06] bg-ink-900/50 px-6 py-4">
        {discount > 0 && service && (
          <>
            <div className="flex justify-between text-sm text-ink-400">
              <span>Subtotal</span>
              <span>{money(service.price)}</span>
            </div>
            <div className="flex justify-between text-sm text-success">
              <span>Descuento</span>
              <span>-{money(discount)}</span>
            </div>
          </>
        )}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-bone-dim">Total</span>
          <span className="font-display text-3xl text-gold">{money(total)}</span>
        </div>
        <p className="text-[11px] text-ink-500">Pagas en el local al finalizar tu servicio.</p>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-wider text-ink-500">{label}</dt>
        <dd className="text-bone">{value}</dd>
      </div>
    </div>
  );
}
