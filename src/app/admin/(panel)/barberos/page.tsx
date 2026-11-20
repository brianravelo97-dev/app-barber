import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs } from "@/lib/admin-data";
import { WEEKDAYS_SHORT } from "@/lib/format";
import type { BarberSchedule } from "@/lib/types";

export const metadata = { title: "Barberos" };

export default async function BarbersAdminPage() {
  const { supabase, profile } = await requireStaffPage();
  const [refs, { data: sched }] = await Promise.all([getAdminRefs(supabase), supabase.from("barber_schedules").select("*")]);
  const schedules = (sched ?? []) as BarberSchedule[];

  return (
    <>
      <PageHeader
        title="Barberos"
        description="Perfiles, horarios, días de descanso y agendas individuales."
        actions={
          profile?.role === "admin" && (
            <ButtonLink href="/admin/barberos/nuevo" size="sm" icon={<Plus className="h-4 w-4" />}>
              Agregar barbero
            </ButtonLink>
          )
        }
      />
      {refs.barbers.length === 0 ? (
        <EmptyState title="Sin barberos" description="Agrega a tu equipo para empezar a recibir reservas." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {refs.barbers.map((b) => {
            const days = new Set(schedules.filter((s) => s.barber_id === b.id).map((s) => s.weekday));
            return (
              <div key={b.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
                <Link href={`/admin/barberos/${b.id}`} className="flex items-center gap-4 p-4 hover:bg-white/[0.02]">
                  <SmartImage src={b.photo_url} alt={b.name} className="h-16 w-16 shrink-0 rounded-full" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                      <h3 className="truncate font-display text-lg uppercase tracking-wide text-bone">{b.name}</h3>
                    </div>
                    <p className="truncate text-sm text-ink-400">{b.role_title ?? "—"}</p>
                    {!b.is_active && <Badge tone="danger" className="mt-1">Inactivo</Badge>}
                  </div>
                </Link>
                <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
                      <span
                        key={wd}
                        className={`grid h-6 w-7 place-items-center rounded text-[10px] ${days.has(wd) ? "bg-gold/15 text-gold-light" : "bg-white/[0.03] text-ink-600"}`}
                        title={days.has(wd) ? "Trabaja" : "Descanso"}
                      >
                        {WEEKDAYS_SHORT[wd].slice(0, 2)}
                      </span>
                    ))}
                  </div>
                  <Link href={`/admin/agenda?barber=${b.id}&view=week`} className="inline-flex items-center gap-1 text-xs text-gold hover:underline">
                    <CalendarDays className="h-3.5 w-3.5" /> Agenda
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
