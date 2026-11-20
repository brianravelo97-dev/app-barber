import { after, NextResponse, type NextRequest } from "next/server";
import { errorCode, friendlyError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/env";
import { notifyBooking } from "@/lib/notifications";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { cancelBookingSchema, firstIssue } from "@/lib/validation";

export const dynamic = "force-dynamic";

/** Cancelación por parte del cliente: requiere el código de reserva + el teléfono usado. */
export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  if (!rateLimit(`cancel:${clientIp(req.headers)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos. Inténtalo más tarde." }, { status: 429 });
  }
  const parsed = cancelBookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  const sb = createPublicClient();
  const { data, error } = await sb.rpc("cancel_booking_public", { p_code: parsed.data.code, p_phone: parsed.data.phone });
  if (error) {
    const code = errorCode(error);
    return NextResponse.json({ error: friendlyError(error), code }, { status: code === "NOT_FOUND" ? 404 : 422 });
  }
  const { id } = data as { id: string };
  after(() => notifyBooking(id, "cancellation"));
  return NextResponse.json({ ok: true });
}
