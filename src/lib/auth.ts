import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export class AuthError extends Error {}

/** Usuario + perfil de la sesión actual (validado contra Supabase Auth). */
export const getSession = cache(async () => {
  if (!isSupabaseConfigured) return { supabase: null, user: null, profile: null };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, profile: null };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return { supabase, user, profile: (profile as Profile) ?? null };
});

/** Para páginas del panel: redirige si no hay sesión con rol válido. */
export async function requireStaffPage() {
  const s = await getSession();
  if (!s.supabase || !s.user) redirect("/admin/login");
  return s as { supabase: NonNullable<typeof s.supabase>; user: NonNullable<typeof s.user>; profile: Profile | null };
}

/** Para Server Actions / Route Handlers: lanza AuthError si no hay permisos. */
export async function requireStaff() {
  const s = await getSession();
  if (!s.supabase || !s.user || !s.profile || !["admin", "staff"].includes(s.profile.role)) {
    throw new AuthError("FORBIDDEN");
  }
  return s as { supabase: NonNullable<typeof s.supabase>; user: NonNullable<typeof s.user>; profile: Profile };
}

export async function requireAdmin() {
  const s = await requireStaff();
  if (s.profile.role !== "admin") throw new AuthError("FORBIDDEN");
  return s;
}
