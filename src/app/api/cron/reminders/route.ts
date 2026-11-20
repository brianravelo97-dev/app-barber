import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { notifyBooking } from "@/lib/notifications";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  return header.length === expected.length && timingSafeEqual(Buffer.from(header), Buffer.from(expected));
}

/**
 * Envía recordatorios de las citas que comienzan dentro de la ventana configurada
 * (business_settings.reminder_hours_before). Idempotente: marca reminder_sent_at.
 * Programar cada hora (Vercel Cron, Supabase pg_cron o cron-job.org) con
 * Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sb = createServiceClient();
  if (!sb) return NextResponse.json({ error: "Falta SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });

  const { data: s } = await sb.from("business_settings").select("reminder_hours_before").eq("id", 1).single();
  const hours = s?.reminder_hours_before ?? 24;
  const now = new Date();
  const until = new Date(now.getTime() + hours * 3600_000);

  const { data: due, error } = await sb
    .from("bookings")
    .select("id")
    .in("status", ["pending", "confirmed"])
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString())
    .limit(200);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let processed = 0;
  for (const b of due ?? []) {
    // Se marca antes de enviar para evitar duplicados si dos ejecuciones se superponen.
    const { data: claimed } = await sb
      .from("bookings")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", b.id)
      .is("reminder_sent_at", null)
      .select("id");
    if (!claimed?.length) continue;
    await notifyBooking(b.id, "reminder");
    processed++;
  }
  return NextResponse.json({ ok: true, processed });
}
