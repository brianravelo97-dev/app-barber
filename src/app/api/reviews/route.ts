import { NextResponse, type NextRequest } from "next/server";
import { friendlyError } from "@/lib/errors";
import { isSupabaseConfigured } from "@/lib/env";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { createPublicClient } from "@/lib/supabase/public";
import { firstIssue, reviewSchema } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isSupabaseConfigured) return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  if (!rateLimit(`review:${clientIp(req.headers)}`, 3, 60 * 60_000)) {
    return NextResponse.json({ error: "Ya enviaste varias reseñas. ¡Gracias!" }, { status: 429 });
  }
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });
  const { error } = await createPublicClient().rpc("submit_review", {
    p_name: parsed.data.name,
    p_rating: parsed.data.rating,
    p_comment: parsed.data.comment,
    p_booking_code: parsed.data.code,
  });
  if (error) return NextResponse.json({ error: friendlyError(error) }, { status: 422 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
