import { notFound } from "next/navigation";
import { BarberEditor } from "@/components/admin/barber-editor";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import type { BarberSchedule, BusinessHour, TimeBlock } from "@/lib/types";

export const metadata = { title: "Barbero" };

export default async function BarberAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, profile } = await requireStaffPage();
  const isNew = id === "nuevo";
  if (!isNew && !/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [settings, refs] = await Promise.all([getSettings(), getAdminRefs(supabase)]);
  const barber = isNew ? null : refs.barbers.find((b) => b.id === id);
  if (!isNew && !barber) notFound();

  const [{ data: links }, { data: sched }, { data: blocks }, { data: hours }] = await Promise.all([
    isNew ? Promise.resolve({ data: [] }) : supabase.from("barber_services").select("service_id").eq("barber_id", id),
    isNew ? Promise.resolve({ data: [] }) : supabase.from("barber_schedules").select("*").eq("barber_id", id).order("weekday").order("start_time"),
    isNew
      ? Promise.resolve({ data: [] })
      : supabase.from("time_blocks").select("*").or(`barber_id.eq.${id},barber_id.is.null`).gte("ends_at", new Date().toISOString()).order("starts_at").limit(50),
    supabase.from("business_hours").select("*").order("weekday"),
  ]);

  return (
    <BarberEditor
      barber={barber ?? null}
      services={refs.services}
      serviceIds={((links ?? []) as { service_id: string }[]).map((l) => l.service_id)}
      schedules={(sched ?? []) as BarberSchedule[]}
      blocks={(blocks ?? []) as TimeBlock[]}
      hours={(hours ?? []) as BusinessHour[]}
      tz={settings.timezone}
      locale={settings.locale}
      canEdit={profile?.role === "admin"}
    />
  );
}
