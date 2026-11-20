import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import { isSupabaseConfigured, SITE_URL } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { PublicBooking } from "@/lib/types";

export const dynamic = "force-dynamic";

function icsDate(iso: string) {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

/** Archivo de calendario (.ics) para añadir la cita a Google/Apple/Outlook Calendar. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const { code } = await params;
  const sb = createPublicClient();
  const [{ data }, settings] = await Promise.all([sb.rpc("get_booking_public", { p_code: code }), getSettings()]);
  const b = data as PublicBooking | null;
  if (!b) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const location = [settings.address, settings.city].filter(Boolean).join(", ");
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Barber Booking//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${b.code}@${new URL(SITE_URL).hostname}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(b.starts_at)}`,
    `DTEND:${icsDate(b.ends_at)}`,
    `SUMMARY:${esc(`${b.service_name} · ${settings.name}`)}`,
    `DESCRIPTION:${esc(`Barbero: ${b.barber_name}\nCódigo: ${b.code}\n${SITE_URL}/reserva/${b.code}`)}`,
    location ? `LOCATION:${esc(location)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Recordatorio de cita",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="reserva-${b.code}.ics"`,
    },
  });
}
