import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ valid: false }, { status: 503 });
  if (!rateLimit(`coupon:${clientIp(req.headers)}`, 20, 60_000)) {
    return NextResponse.json({ valid: false, error: "Demasiados intentos" }, { status: 429 });
  }
  const code = req.nextUrl.searchParams.get("code")?.slice(0, 30) ?? "";
  const service = req.nextUrl.searchParams.get("service") ?? "";
  const date = req.nextUrl.searchParams.get("date");
  if (!code || !/^[0-9a-f-]{36}$/i.test(service)) return NextResponse.json({ valid: false }, { status: 400 });

  const { data, error } = await createPublicClient().rpc("validate_coupon", {
    p_code: code,
    p_service_id: service,
    p_date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null,
  });
  if (error) return NextResponse.json({ valid: false }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
