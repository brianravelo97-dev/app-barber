import { Bell, CircleCheck, CircleX, Mail, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { WhatsAppIcon } from "@/components/icons";
import { Badge, Card, EmptyState } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { emailConfigured, whatsappConfigured } from "@/lib/notifications";
import type { NotificationLog } from "@/lib/types";

export const metadata = { title: "Notificaciones" };

const TYPE = { confirmation: "Confirmación", reminder: "Recordatorio", cancellation: "Cancelación", reschedule: "Reprogramación", waitlist: "Lista de espera" };

export default async function NotificationsPage() {
  const { supabase } = await requireStaffPage();
  const settings = await getSettings();
  const { data } = await supabase.from("notifications").select("*, bookings(code, customer_name)").order("created_at", { ascending: false }).limit(200);
  const logs = (data ?? []) as (NotificationLog & { bookings: { code: string; customer_name: string } | null })[];

  const integrations = [
    {
      name: "WhatsApp (Twilio)",
      icon: WhatsAppIcon,
      ok: whatsappConfigured(),
      env: "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM",
    },
    { name: "Correo (Resend)", icon: Mail, ok: emailConfigured(), env: "RESEND_API_KEY, EMAIL_FROM" },
    { name: "Registro / service role", icon: Bell, ok: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY), env: "SUPABASE_SERVICE_ROLE_KEY" },
    { name: "Recordatorios automáticos (cron)", icon: Bell, ok: Boolean(process.env.CRON_SECRET), env: "CRON_SECRET + programar /api/cron/reminders" },
  ];

  return (
    <>
      <PageHeader title="Notificaciones" description={`Confirmaciones, recordatorios (${settings.reminder_hours_before} h antes), cancelaciones y reprogramaciones.`} />

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {integrations.map((i) => (
          <Card key={i.name} className="p-4">
            <div className="flex items-center justify-between">
              <i.icon className="h-5 w-5 text-gold" />
              {i.ok ? (
                <span className="flex items-center gap-1 text-xs text-success">
                  <CircleCheck className="h-4 w-4" /> Configurado
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-warning">
                  <TriangleAlert className="h-4 w-4" /> Falta configurar
                </span>
              )}
            </div>
            <p className="mt-3 text-sm text-bone">{i.name}</p>
            {!i.ok && <p className="mt-1 font-mono text-[11px] text-ink-500">{i.env}</p>}
          </Card>
        ))}
      </div>
      {(!whatsappConfigured() || !emailConfigured()) && (
        <p className="mb-6 rounded-xl border border-white/[0.07] bg-ink-850 p-4 text-sm text-ink-400">
          Sin un proveedor configurado, los mensajes <strong className="text-bone">no se envían</strong> y quedan registrados como «no configurado». Revisa la
          sección <em>Notificaciones</em> del README para activar Twilio y Resend.
        </p>
      )}

      {logs.length === 0 ? (
        <EmptyState icon={<Bell className="h-6 w-6" />} title="Sin notificaciones registradas" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
          <ul className="divide-y divide-white/[0.05] text-sm">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 px-4 py-3">
                {l.channel === "whatsapp" ? <WhatsAppIcon className="mt-0.5 h-4 w-4 text-ink-400" /> : <Mail className="mt-0.5 h-4 w-4 text-ink-400" />}
                <div className="min-w-0 flex-1">
                  <p className="text-bone">
                    {TYPE[l.type]} · <span className="text-ink-300">{l.bookings?.customer_name ?? l.recipient}</span>
                    {l.bookings && <span className="text-ink-500"> #{l.bookings.code}</span>}
                  </p>
                  <p className="truncate text-xs text-ink-500">
                    {l.recipient} · {formatDateTime(l.created_at, settings.timezone, settings.locale)}
                    {l.error && ` · ${l.error}`}
                  </p>
                </div>
                {l.status === "sent" ? (
                  <Badge tone="success">Enviado</Badge>
                ) : l.status === "failed" ? (
                  <Badge tone="danger">
                    <CircleX className="h-3 w-3" /> Falló
                  </Badge>
                ) : (
                  <Badge>No configurado</Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
