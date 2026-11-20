import { redirect } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { SettingsTabs } from "@/components/admin/settings/settings-tabs";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { SITE_URL } from "@/lib/env";
import { todayInTz } from "@/lib/time";
import type { BusinessHour, GalleryImage, Holiday, Profile } from "@/lib/types";

export const metadata = { title: "Configuración" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const { supabase, profile } = await requireStaffPage();
  if (profile?.role !== "admin") redirect("/admin");
  const settings = await getSettings();

  const [{ data: hours }, { data: holidays }, { data: gallery }, { data: users }] = await Promise.all([
    supabase.from("business_hours").select("*").order("weekday"),
    supabase.from("holidays").select("*").gte("date", todayInTz(settings.timezone)).order("date"),
    supabase.from("gallery_images").select("*").order("sort_order"),
    supabase.from("profiles").select("*").order("created_at"),
  ]);

  return (
    <>
      <PageHeader title="Configuración" description="Todo lo que se muestra en el sitio y las reglas de reserva." />
      <SettingsTabs
        initialTab={tab}
        settings={settings}
        hours={(hours ?? []) as BusinessHour[]}
        holidays={(holidays ?? []) as Holiday[]}
        gallery={(gallery ?? []) as GalleryImage[]}
        users={(users ?? []) as Profile[]}
        currentUserId={profile.id}
        siteUrl={SITE_URL}
      />
    </>
  );
}
