import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import { availabilitySchema } from "@/lib/validation";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Horas disponibles para un servicio/fecha (y barbero opcional). Calculado en la base de datos. */
export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  if (!rateLimit(`avail:${clientIp(req.headers)}`, 120, 60_000)) {
    return NextResponse.json({ error: "Demasiadas solicitudes, espera un momento." }, { status: 429 });
  }

  const parsed = availabilitySchema.safeParse({
    service: req.nextUrl.searchParams.get("service"),
    date: req.nextUrl.searchParams.get("date"),
    barber: req.nextUrl.searchParams.get("barber") || null,
  });
  if (!parsed.success) return NextResponse.json({ error: "Parámetros inválidos" }, { status: 400 });

  const { service, date, barber } = parsed.data;
  const sb = createPublicClient();
  const { data, error } = await sb.rpc("get_available_slots", {
    p_service_id: service,
    p_date: date,
    p_barber_id: barber ?? null,
  });
  if (error) {
    console.error("[availability]", error.message);
    return NextResponse.json({ error: "No se pudo obtener la disponibilidad" }, { status: 500 });
  }

  const map = new Map<string, string[]>();
  for (const row of (data ?? []) as { barber_id: string; slot_start: string }[]) {
    const key = new Date(row.slot_start).toISOString();
    const list = map.get(key) ?? [];
    list.push(row.barber_id);
    map.set(key, list);
  }
  const slots = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([start, barbers]) => ({ start, barbers }));

  return NextResponse.json({ slots }, { headers: { "Cache-Control": "no-store" } });
}
