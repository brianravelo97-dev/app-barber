import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Barber, Service } from "@/lib/types";

/** Servicios y barberos (incluye inactivos) para formularios del panel. */
export async function getAdminRefs(supabase: SupabaseClient) {
  const [{ data: services }, { data: barbers }] = await Promise.all([
    supabase.from("services").select("*").order("sort_order").order("name"),
    supabase.from("barbers").select("*").order("sort_order").order("name"),
  ]);
  return {
    services: ((services ?? []) as Service[]).map((s) => ({ ...s, price: Number(s.price) })),
    barbers: (barbers ?? []) as Barber[],
  };
}

export function numberRows<T extends Record<string, unknown>>(rows: T[] | null, keys: (keyof T)[]): T[] {
  return (rows ?? []).map((r) => {
    const copy = { ...r };
    for (const k of keys) copy[k] = Number(r[k] ?? 0) as T[keyof T];
    return copy;
  });
}
