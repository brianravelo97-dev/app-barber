import { CalendarCheck, CalendarDays, ChevronRight, Clock, DollarSign, TrendingUp, UserX, Users } from "lucide-react";
import Link from "next/link";
import { BookingsChart, RankBars, RevenueChart } from "@/components/admin/charts";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, StatusBadge } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { numberRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { capitalize, formatMoney, formatTime } from "@/lib/format";
import { dayRangeUtc, todayInTz } from "@/lib/time";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Dashboard" };

type Stats = {
  today_bookings: number;
  today_pending: number;
  week_bookings: number;
  customers: number;
  new_customers_month: number;
  revenue_today: number;
  revenue_month: number;
  no_show_month: number;
  completed_month: number;
  top_services: { name: string; count: number; revenue: number }[];
  top_barbers: { name: string; color: string; count: number }[];
  daily: { date: string; revenue: number; bookings: number }[];
  status_month: Record<string, number>;
};

export default async function DashboardPage() {
  const { supabase, profile } = await requireStaffPage();
  const settings = await getSettings();
  const tz = settings.timezone;
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale);
  const today = todayInTz(tz);
  const { from, to } = dayRangeUtc(today, tz);

  const [{ data: statsRaw, error }, { data: todayRaw }, { data: barbers }] = await Promise.all([
    supabase.rpc("dashboard_stats"),
    supabase.from("bookings").select("*").gte("starts_at", from).lt("starts_at", to).neq("status", "cancelled").order("starts_at"),
    supabase.from("barbers").select("id, name, color"),
  ]);
  const stats = statsRaw as Stats | null;
  const todayBookings = numberRows(todayRaw as Booking[] | null, ["total"]);
  const daily = (stats?.daily ?? []).map((d) => ({ ...d, revenue: Number(d.revenue), bookings: Number(d.bookings) }));
  const noShowRate =
    stats && stats.completed_month + stats.no_show_month > 0
      ? Math.round((stats.no_show_month / (stats.completed_month + stats.no_show_month)) * 100)
      : 0;

  const kpis = [
    { label: "Reservas hoy", value: String(stats?.today_bookings ?? 0), sub: stats?.today_pending ? `${stats.today_pending} por confirmar` : "Todo confirmado", icon: CalendarCheck },
    { label: "Reservas semana", value: String(stats?.week_bookings ?? 0), sub: "Lunes a domingo", icon: CalendarDays },
    { label: "Ingresos hoy", value: money(Number(stats?.revenue_today ?? 0)), sub: "Pagos registrados", icon: DollarSign },
    { label: "Ingresos del mes", value: money(Number(stats?.revenue_month ?? 0)), sub: `${stats?.completed_month ?? 0} atenciones`, icon: TrendingUp },
    { label: "Clientes", value: String(stats?.customers ?? 0), sub: `+${stats?.new_customers_month ?? 0} este mes`, icon: Users },
    { label: "Inasistencias", value: `${noShowRate}%`, sub: `${stats?.no_show_month ?? 0} en el mes`, icon: UserX },
  ];

  const hello = new Intl.DateTimeFormat(settings.locale, { timeZone: tz, hour: "numeric", hour12: false }).format(new Date());
  const greeting = Number(hello) < 12 ? "Buenos días" : Number(hello) < 20 ? "Buenas tardes" : "Buenas noches";

  return (
    <>
      <PageHeader
        title={`${greeting}${profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}`}
        description={capitalize(new Intl.DateTimeFormat(settings.locale, { timeZone: tz, weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date()))}
        actions={
          <>
            <ButtonLink href="/admin/agenda" variant="outline" size="sm">
              Ver agenda
            </ButtonLink>
            <ButtonLink href="/admin/reservas" size="sm">
              Reservas
            </ButtonLink>
          </>
        }
      />

      {error && (
        <div className="mb-6 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
          No se pudieron cargar las estadísticas: {error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-4 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] uppercase tracking-wider text-ink-400">{k.label}</span>
              <k.icon className="h-4 w-4 text-gold" strokeWidth={1.75} />
            </div>
            <p className="mt-3 font-display text-2xl tabular-nums text-bone md:text-3xl">{k.value}</p>
            <p className="mt-1 text-xs text-ink-500">{k.sub}</p>
          </Card>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-display text-lg uppercase tracking-wide text-bone">Ingresos · últimos 14 días</h2>
            <span className="text-xs text-ink-400">{money(daily.reduce((a, d) => a + d.revenue, 0))}</span>
          </div>
          <RevenueChart data={daily} currency={settings.currency} locale={settings.locale} />
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg uppercase tracking-wide text-bone">Hoy</h2>
            <Link href={`/admin/agenda?date=${today}`} className="text-xs text-gold hover:underline">
              Agenda
            </Link>
          </div>
          {todayBookings.length ? (
            <ul className="max-h-[260px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
              {todayBookings.map((b) => {
                const barber = barbers?.find((x) => x.id === b.barber_id);
                return (
                  <li key={b.id}>
                    <Link href={`/admin/agenda?date=${today}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-white/[0.03]">
                      <span className="w-12 font-display tabular-nums text-bone">{formatTime(b.starts_at, tz)}</span>
                      <span className="h-8 w-0.5 rounded-full" style={{ background: barber?.color }} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-bone">{b.customer_name}</span>
                        <span className="block truncate text-xs text-ink-400">
                          {b.service_name} · {barber?.name}
                        </span>
                      </span>
                      <StatusBadge status={b.status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<Clock className="h-6 w-6" />} title="Sin citas hoy" className="py-8" />
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide text-bone">Reservas por día</h2>
          <BookingsChart data={daily} locale={settings.locale} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 font-display text-lg uppercase tracking-wide text-bone">Servicios más solicitados</h2>
          <p className="mb-5 text-xs text-ink-500">Últimos 30 días</p>
          <RankBars items={(stats?.top_services ?? []).map((s) => ({ name: s.name, count: Number(s.count) }))} unit="reservas" />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 font-display text-lg uppercase tracking-wide text-bone">Barberos con más reservas</h2>
          <p className="mb-5 text-xs text-ink-500">Últimos 30 días</p>
          <RankBars items={(stats?.top_barbers ?? []).map((s) => ({ name: s.name, count: Number(s.count), color: s.color }))} unit="reservas" />
        </Card>
      </div>

      <div className="mt-4 flex justify-end">
        <Link href="/admin/pagos" className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-gold">
          Ver registro de pagos <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
    </>
  );
}
