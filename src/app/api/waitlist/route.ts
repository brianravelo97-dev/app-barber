import { NextResponse, type NextRequest } from "next/server";
import { friendlyError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { firstIssue, waitlistSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  if (!rateLimit(`wait:${clientIp(req.headers)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Demasiados intentos." }, { status: 429 });
  }
  const parsed = waitlistSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const d = parsed.data;
  const { error } = await createPublicClient().rpc("join_waitlist", {
    p_name: d.name,
    p_phone: d.phone,
    p_email: d.email,
    p_service_id: d.serviceId ?? null,
    p_barber_id: d.barberId ?? null,
    p_date: d.date,
    p_time_from: d.timeFrom ?? null,
    p_time_to: d.timeTo ?? null,
    p_notes: d.notes,
  });
  if (error) return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
