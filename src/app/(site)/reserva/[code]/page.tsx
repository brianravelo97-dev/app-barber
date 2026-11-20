import { CalendarDays, CalendarPlus, Clock, Hash, Scissors, User } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookingManage } from "@/components/booking/booking-manage";
import { WhatsAppIcon } from "@/components/icons";
import { buttonClass, ButtonLink } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/misc";
import { getSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";
import { capitalize, formatLongDate, formatMoney, formatTime, whatsappLink } from "@/lib/format";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicBooking } from "@/lib/types";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu reserva", robots: { index: false } };

export default async function BookingPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ nueva?: string }>;
}) {
  const { code } = await params;
  const { nueva } = await searchParams;
  if (!isSupabaseConfigured || !/^[A-Za-z0-9]{4,12}$/.test(code)) notFound();

  const [settings, { data, error }] = await Promise.all([getSettings(), createPublicClient().rpc("get_booking_public", { p_code: code })]);
  if (error) throw new Error("No se pudo cargar la reserva");
  const b = data as PublicBooking | null;
  if (!b) notFound();

  const tz = settings.timezone;
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale);
  const isNew = nueva === "1";
  const upcoming = new Date(b.starts_at) > new Date() && ["pending", "confirmed"].includes(b.status);
  const wa = whatsappLink(
    settings.whatsapp,
    `Hola, tengo la reserva ${b.code} para el ${formatLongDate(b.starts_at, tz, settings.locale)} a las ${formatTime(b.starts_at, tz)}.`,
  );
  const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${b.service_name} · ${settings.name}`,
  )}&dates=${new Date(b.starts_at).toISOString().replace(/[-:]|\.\d{3}/g, "")}/${new Date(b.ends_at)
    .toISOString()
    .replace(/[-:]|\.\d{3}/g, "")}&location=${encodeURIComponent([settings.address, settings.city].filter(Boolean).join(", "))}`;

  return (
    <div className="pb-24 pt-28 md:pt-36">
      <div className="mx-auto max-w-2xl px-4 md:px-8">
        <div className="text-center">
          {isNew && (
            <div className="mx-auto mb-6 grid h-20 w-20 animate-scale-in place-items-center rounded-full bg-gold text-ink-950 shadow-[0_0_60px_-10px] shadow-gold">
              <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" className="[stroke-dasharray:24] [stroke-dashoffset:24] animate-[draw_0.6s_0.2s_ease_forwards]" />
              </svg>
            </div>
          )}
          <span className="eyebrow">{isNew ? "¡Reserva realizada!" : "Detalle de tu reserva"}</span>
          <h1 className="h-display mt-3 text-4xl text-bone md:text-5xl">
            {isNew ? (
              <>
                Gracias, <span className="font-serif font-normal normal-case italic text-gold">{b.customer_name.split(" ")[0]}</span>
              </>
            ) : (
              b.service_name
            )}
          </h1>
          {isNew && (
            <p className="mx-auto mt-4 max-w-md text-ink-300">
              {b.status === "pending"
                ? "Recibimos tu solicitud. Te confirmaremos a la brevedad. Guarda tu número de reserva."
                : "Tu hora está confirmada. Te esperamos."}
            </p>
          )}
        </div>

        <div className="mt-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-850">
          <div className="flex items-center justify-between border-b border-dashed border-white/10 bg-gradient-to-r from-gold/10 to-transparent px-6 py-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-ink-400">Número de reserva</p>
              <p className="font-display text-3xl tracking-[0.2em] text-gold">{b.code}</p>
            </div>
            <StatusBadge status={b.status} />
          </div>
          <dl className="grid gap-5 px-6 py-6 sm:grid-cols-2">
            <Item icon={<User className="h-4 w-4" />} label="Cliente" value={b.customer_name} />
            <Item icon={<Scissors className="h-4 w-4" />} label="Servicio" value={b.service_name} />
            <Item icon={<User className="h-4 w-4" />} label="Barbero" value={b.barber_name} />
            <Item icon={<CalendarDays className="h-4 w-4" />} label="Fecha" value={capitalize(formatLongDate(b.starts_at, tz, settings.locale, true))} />
            <Item icon={<Clock className="h-4 w-4" />} label="Hora" value={`${formatTime(b.starts_at, tz)} – ${formatTime(b.ends_at, tz)}`} />
            <Item icon={<Hash className="h-4 w-4" />} label="Precio" value={b.discount > 0 ? `${money(b.total)} (antes ${money(b.price)})` : money(b.total)} />
          </dl>
          {settings.address && (
            <div className="border-t border-white/[0.06] px-6 py-4 text-sm text-ink-400">
              {settings.address}
              {settings.city ? `, ${settings.city}` : ""}
            </div>
          )}
        </div>

        {upcoming && (
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <a href={`/api/bookings/${b.code}/ics`} className={buttonClass("outline", "md", "w-full")}>
              <CalendarPlus className="h-4 w-4" /> Apple / Outlook
            </a>
            <a href={gcal} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md", "w-full")}>
              <CalendarPlus className="h-4 w-4" /> Google Calendar
            </a>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md", "w-full")}>
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            )}
          </div>
        )}

        <BookingManage
          code={b.code}
          canCancel={upcoming}
          canReview={b.status === "completed" && settings.features.reviews}
          customerName={b.customer_name}
          policy={settings.cancellation_policy}
          windowHours={settings.cancellation_window_hours}
        />

        <div className="mt-10 text-center">
          <ButtonLink href="/" variant="ghost">
            Volver al inicio
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

function Item({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 text-gold">{icon}</span>
      <div>
        <dt className="text-[11px] uppercase tracking-wider text-ink-500">{label}</dt>
        <dd className="text-[15px] text-bone">{value}</dd>
      </div>
    </div>
  );
}
