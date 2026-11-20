import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { createPublicClient } from "@/lib/supabase/public";
import {
  DEFAULT_FEATURES,
  type Barber,
  type BarberSchedule,
  type BusinessHour,
  type BusinessSettings,
  type GalleryImage,
  type Holiday,
  type Promotion,
  type Review,
  type Service,
} from "@/lib/types";
import { todayInTz } from "@/lib/time";

/** Valores por defecto mientras Supabase no esté configurado (permite compilar y previsualizar). */
export const FALLBACK_SETTINGS: BusinessSettings = {
  id: 1,
  name: "Mi Barbería",
  tagline: "Configura Supabase para comenzar",
  description: null,
  logo_url: null,
  hero_image_url: null,
  address: null,
  city: null,
  map_query: null,
  phone: null,
  whatsapp: null,
  email: null,
  instagram: null,
  timezone: "America/Santiago",
  currency: "CLP",
  locale: "es-CL",
  slot_interval_min: 15,
  min_notice_min: 60,
  max_advance_days: 60,
  auto_confirm: false,
  cancellation_policy: null,
  cancellation_window_hours: 3,
  reminder_hours_before: 24,
  features: DEFAULT_FEATURES,
  loyalty_points_per_visit: 10,
  loyalty_reward_threshold: 100,
  loyalty_reward_description: null,
  setup_completed: false,
  updated_at: new Date(0).toISOString(),
};

function client() {
  return isSupabaseConfigured ? createPublicClient() : null;
}

export const getSettings = cache(async (): Promise<BusinessSettings> => {
  const sb = client();
  if (!sb) return FALLBACK_SETTINGS;
  const { data, error } = await sb.from("business_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) console.error("[data] settings", error.message);
    return FALLBACK_SETTINGS;
  }
  return { ...data, features: { ...DEFAULT_FEATURES, ...(data.features ?? {}) } } as BusinessSettings;
});

export const getBusinessHours = cache(async (): Promise<BusinessHour[]> => {
  const sb = client();
  if (!sb) return [];
  const { data } = await sb.from("business_hours").select("*").order("weekday");
  return (data ?? []) as BusinessHour[];
});

export const getUpcomingHolidays = cache(async (): Promise<Holiday[]> => {
  const sb = client();
  if (!sb) return [];
  const settings = await getSettings();
  const { data } = await sb
    .from("holidays")
    .select("*")
    .gte("date", todayInTz(settings.timezone))
    .order("date")
    .limit(60);
  return (data ?? []) as Holiday[];
});

export const getServices = cache(async (): Promise<Service[]> => {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("sort_order")
    .order("name");
  if (error) console.error("[data] services", error.message);
  return ((data ?? []) as Service[]).map((s) => ({ ...s, price: Number(s.price) }));
});

export const getBarbers = cache(async (): Promise<Barber[]> => {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.from("barbers").select("*").eq("is_active", true).order("sort_order").order("name");
  if (error) console.error("[data] barbers", error.message);
  return (data ?? []) as Barber[];
});

export const getBarberBySlug = cache(async (slug: string): Promise<Barber | null> => {
  const sb = client();
  if (!sb) return null;
  const { data } = await sb.from("barbers").select("*").eq("slug", slug).eq("is_active", true).maybeSingle();
  return (data as Barber) ?? null;
});

export const getSchedules = cache(async (): Promise<BarberSchedule[]> => {
  const sb = client();
  if (!sb) return [];
  const { data } = await sb.from("barber_schedules").select("*").order("weekday").order("start_time");
  return (data ?? []) as BarberSchedule[];
});

export const getBarberServices = cache(async (): Promise<{ barber_id: string; service_id: string }[]> => {
  const sb = client();
  if (!sb) return [];
  const { data } = await sb.from("barber_services").select("barber_id, service_id");
  return data ?? [];
});

export const getGallery = cache(async (): Promise<GalleryImage[]> => {
  const sb = client();
  if (!sb) return [];
  const { data } = await sb.from("gallery_images").select("*").order("sort_order").limit(12);
  return (data ?? []) as GalleryImage[];
});

export const getApprovedReviews = cache(async (limit = 9): Promise<Review[]> => {
  const sb = client();
  if (!sb) return [];
  const { data } = await sb
    .from("reviews")
    .select("*")
    .eq("is_approved", true)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Review[];
});

export const getActivePromotions = cache(async (): Promise<Promotion[]> => {
  const sb = client();
  if (!sb) return [];
  const settings = await getSettings();
  if (!settings.features.promotions) return [];
  const today = todayInTz(settings.timezone);
  const { data } = await sb.from("promotions").select("*").eq("is_active", true).order("sort_order");
  return ((data ?? []) as Promotion[]).filter(
    (p) => (!p.starts_on || p.starts_on <= today) && (!p.ends_on || p.ends_on >= today),
  );
});

export async function getBarberNextSlots(barberId: string, limit = 6): Promise<string[]> {
  const sb = client();
  if (!sb) return [];
  const { data, error } = await sb.rpc("barber_next_slots", { p_barber_id: barberId, p_limit: limit });
  if (error) {
    console.error("[data] next slots", error.message);
    return [];
  }
  return ((data ?? []) as { slot_start: string }[]).map((r) => r.slot_start);
}
