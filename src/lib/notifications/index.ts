import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SITE_URL } from "@/lib/env";
import { createServiceClient } from "@/lib/supabase/service";
import { localDate } from "@/lib/time";
import { emailConfigured, sendEmail, sendWhatsApp, whatsappConfigured, type SendResult } from "./providers";
import { renderEmail, renderText, type NotificationType, type TemplateData } from "./templates";

export { emailConfigured, whatsappConfigured };
export type { NotificationType };

type Channel = "email" | "whatsapp";

async function log(
  sb: SupabaseClient,
  bookingId: string | null,
  channel: Channel,
  type: NotificationType,
  recipient: string,
  result: SendResult | "not_configured",
) {
  const row =
    result === "not_configured"
      ? { status: "not_configured", error: "Proveedor no configurado (ver .env.example)" }
      : result.ok
        ? { status: "sent", provider_message_id: result.id ?? null }
        : { status: "failed", error: result.error.slice(0, 500) };
  const { error } = await sb.from("notifications").insert({ booking_id: bookingId, channel, type, recipient, ...row });
  if (error) console.error("[notifications] log", error.message);
}

async function deliver(
  sb: SupabaseClient,
  bookingId: string | null,
  type: NotificationType,
  data: TemplateData,
  phone: string | null,
  email: string | null,
) {
  const tasks: Promise<void>[] = [];
  if (phone) {
    tasks.push(
      (async () => {
        if (!whatsappConfigured()) return log(sb, bookingId, "whatsapp", type, phone, "not_configured");
        const r = await sendWhatsApp(phone, renderText(type, data));
        await log(sb, bookingId, "whatsapp", type, phone, r);
      })(),
    );
  }
  if (email) {
    tasks.push(
      (async () => {
        if (!emailConfigured()) return log(sb, bookingId, "email", type, email, "not_configured");
        const m = renderEmail(type, data);
        const r = await sendEmail(email, m.subject, m.html, m.text);
        await log(sb, bookingId, "email", type, email, r);
      })(),
    );
  }
  await Promise.all(tasks);
}

/**
 * Envía la notificación de una reserva por los canales disponibles (WhatsApp y/o correo)
 * y registra el resultado real en la tabla notifications. Si un proveedor no está
 * configurado se registra como "not_configured": nunca se simula un envío.
 */
export async function notifyBooking(bookingId: string, type: Exclude<NotificationType, "waitlist">) {
  const sb = createServiceClient();
  if (!sb) {
    console.warn("[notifications] SUPABASE_SERVICE_ROLE_KEY no configurada; notificación omitida");
    return;
  }
  try {
    const [{ data: b }, { data: s }] = await Promise.all([
      sb.from("bookings").select("*, barbers(name)").eq("id", bookingId).maybeSingle(),
      sb.from("business_settings").select("*").eq("id", 1).maybeSingle(),
    ]);
    if (!b || !s) return;
    const data: TemplateData = {
      businessName: s.name,
      businessAddress: [s.address, s.city].filter(Boolean).join(", ") || null,
      businessPhone: s.phone,
      customerName: b.customer_name,
      serviceName: b.service_name,
      barberName: (b.barbers as { name: string } | null)?.name ?? "",
      startsAt: b.starts_at,
      total: Number(b.total),
      code: b.code,
      status: b.status,
      timezone: s.timezone,
      currency: s.currency,
      locale: s.locale,
      manageUrl: `${SITE_URL}/reserva/${b.code}`,
      bookUrl: `${SITE_URL}/reservar`,
      cancellationPolicy: s.cancellation_policy,
    };
    await deliver(sb, b.id, type, data, b.customer_phone, b.customer_email);

    if (type === "cancellation") await notifyWaitlist(sb, b, s);
  } catch (e) {
    console.error("[notifications]", e);
  }
}

/** Al liberarse un horario, avisa a quienes esperan ese día (y servicio/barbero compatibles). */
async function notifyWaitlist(
  sb: SupabaseClient,
  booking: { id: string; starts_at: string; service_id: string; barber_id: string },
  s: { name: string; timezone: string; currency: string; locale: string; features: Record<string, boolean> },
) {
  if (!s.features?.waitlist) return;
  if (new Date(booking.starts_at) < new Date()) return;
  const day = localDate(booking.starts_at, s.timezone);
  const { data: entries } = await sb
    .from("waitlist")
    .select("*")
    .eq("desired_date", day)
    .eq("status", "waiting")
    .or(`service_id.is.null,service_id.eq.${booking.service_id}`)
    .or(`barber_id.is.null,barber_id.eq.${booking.barber_id}`)
    .order("created_at")
    .limit(5);
  for (const w of entries ?? []) {
    const data: TemplateData = {
      businessName: s.name,
      businessAddress: null,
      businessPhone: null,
      customerName: w.customer_name,
      serviceName: "",
      barberName: "",
      startsAt: booking.starts_at,
      total: 0,
      code: "",
      status: "",
      timezone: s.timezone,
      currency: s.currency,
      locale: s.locale,
      manageUrl: `${SITE_URL}/reservar`,
      bookUrl: `${SITE_URL}/reservar?fecha=${day}${w.service_id ? `&servicio=${w.service_id}` : ""}`,
      cancellationPolicy: null,
    };
    await deliver(sb, booking.id, "waitlist", data, w.phone, w.email);
    if (whatsappConfigured() || (w.email && emailConfigured())) {
      await sb.from("waitlist").update({ status: "contacted" }).eq("id", w.id);
    }
  }
}
