import { CalendarPlus, Check, Hourglass, X } from "lucide-react";
import { setWaitlistStatus } from "@/app/admin/actions/marketing";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppIcon } from "@/components/icons";
import { buttonClass } from "@/components/ui/button";
import { Badge, EmptyState } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { capitalize, formatDateStr, whatsappLink } from "@/lib/format";
import { todayInTz } from "@/lib/time";
import type { WaitlistEntry } from "@/lib/types";

export const metadata = { title: "Lista de espera" };

const LABEL = { waiting: "En espera", contacted: "Contactado", booked: "Agendado", discarded: "Descartado" } as const;
const TONE = { waiting: "warning", contacted: "info", booked: "success", discarded: "neutral" } as const;

export default async function WaitlistPage({ searchParams }: { searchParams: Promise<{ all?: string }> }) {
  const { all } = await searchParams;
  const { supabase } = await requireStaffPage();
  const [settings, refs] = await Promise.all([getSettings(), getAdminRefs(supabase)]);
  let q = supabase.from("waitlist").select("*").order("desired_date").order("created_at").limit(300);
  if (!all) q = q.in("status", ["waiting", "contacted"]).gte("desired_date", todayInTz(settings.timezone));
  const { data } = await q;
  const entries = (data ?? []) as WaitlistEntry[];

  return (
    <>
      <PageHeader
        title="Lista de espera"
        description="Clientes que quieren una hora en un día completo. Al cancelarse una reserva se les avisa automáticamente (si WhatsApp/correo están configurados)."
        actions={
          <a href={all ? "/admin/lista-espera" : "/admin/lista-espera?all=1"} className={buttonClass("outline", "sm")}>
            {all ? "Solo activas" : "Ver historial"}
          </a>
        }
      />
      {entries.length === 0 ? (
        <EmptyState icon={<Hourglass className="h-6 w-6" />} title="Lista vacía" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((w) => {
              const service = refs.services.find((s) => s.id === w.service_id);
              const barber = refs.barbers.find((b) => b.id === w.barber_id);
              const wa = whatsappLink(
                w.phone,
                `Hola ${w.customer_name.split(" ")[0]}, te escribimos de ${settings.name}: se liberó una hora para el ${formatDateStr(w.desired_date, settings.locale)}. ¿Te la reservamos?`,
              );
              return (
                <li key={w.id} className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-bone">{w.customer_name}</span>
                      <Badge tone={TONE[w.status]}>{LABEL[w.status]}</Badge>
                    </div>
                    <p className="text-sm text-ink-400">
                      {capitalize(formatDateStr(w.desired_date, settings.locale))}
                      {(w.time_from || w.time_to) && ` · ${w.time_from?.slice(0, 5) ?? "…"}–${w.time_to?.slice(0, 5) ?? "…"}`} · {service?.name ?? "Cualquier servicio"} ·{" "}
                      {barber?.name ?? "Cualquier barbero"}
                    </p>
                    <p className="text-xs text-ink-500">{w.phone}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm")}>
                        <WhatsAppIcon className="h-3.5 w-3.5" /> Escribir
                      </a>
                    )}
                    <a href={`/admin/agenda?date=${w.desired_date}`} className={buttonClass("ghost", "sm")}>
                      <CalendarPlus className="h-3.5 w-3.5" /> Agenda
                    </a>
                    {w.status !== "contacted" && w.status !== "booked" && (
                      <ActionButton size="sm" variant="ghost" action={setWaitlistStatus.bind(null, w.id, "contacted")}>
                        Contactado
                      </ActionButton>
                    )}
                    {w.status !== "booked" && (
                      <ActionButton size="sm" variant="success" icon={<Check className="h-3.5 w-3.5" />} action={setWaitlistStatus.bind(null, w.id, "booked")} success="Marcado como agendado">
                        Agendado
                      </ActionButton>
                    )}
                    {w.status !== "discarded" && (
                      <ActionButton size="sm" variant="ghost" icon={<X className="h-3.5 w-3.5" />} action={setWaitlistStatus.bind(null, w.id, "discarded")}>
                        Descartar
                      </ActionButton>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
