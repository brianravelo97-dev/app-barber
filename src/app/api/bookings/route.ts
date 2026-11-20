import { after, NextResponse, type NextRequest } from "next/server";
import { errorCode, friendlyError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/env";
import { notifyBooking } from "@/lib/notifications";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { createBookingSchema, firstIssue } from "@/lib/validation";

export const dynamic = "force-dynamic";

/**
 * Crea una reserva. Toda la validación de negocio (horario, festivos, bloqueos,
 * solapamientos, cupones) y la escritura ocurren dentro de una única transacción
 * en Postgres (función create_booking) protegida por advisory lock + EXCLUDE constraint.
 */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  if (!rateLimit(`book:${clientIp(req.headers)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Espera unos minutos o escríbenos por WhatsApp." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const d = parsed.data;
  if (d.website) return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });

  const sb = createPublicClient();
  const { data, error } = await sb.rpc("create_booking", {
    p_service_id: d.serviceId,
    p_starts_at: d.startsAt,
    p_customer_name: d.name,
    p_customer_phone: d.phone,
    p_customer_email: d.email,
    p_barber_id: d.barberId ?? null,
    p_notes: d.notes,
    p_coupon_code: d.coupon,
  });

  if (error) {
    const code = errorCode(error);
    const status = code === "SLOT_UNAVAILABLE" ? 409 : code.startsWith("INVALID") || code === "TOO_MANY_BOOKINGS" ? 422 : 500;
    if (status === 500) console.error("[bookings] create", error);
    return NextResponse.json({ error: friendlyError(error), code }, { status });
  }

  const booking = data as { id: string; code: string };
  // Notificaciones tras responder al cliente (no bloquean la confirmación).
  after(() => notifyBooking(booking.id, "confirmation"));

  return NextResponse.json({ booking: { ...booking, customer_phone: undefined } }, { status: 201 });
}
