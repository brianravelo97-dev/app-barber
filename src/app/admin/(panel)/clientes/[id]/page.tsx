import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerPanel } from "@/components/admin/customer-panel";
import { BookingsTable } from "@/components/admin/bookings-table";
import { Card } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs, numberRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { formatMoney } from "@/lib/format";
import type { Booking, CustomerOverview } from "@/lib/types";

export const metadata = { title: "Cliente" };

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireStaffPage();
  const [settings, refs, { data: c }, { data: bk }] = await Promise.all([
    getSettings(),
    getAdminRefs(supabase),
    supabase.from("customer_overview").select("*").eq("id", id).maybeSingle(),
    supabase.from("bookings").select("*").eq("customer_id", id).order("starts_at", { ascending: false }).limit(200),
  ]);
  if (!c) notFound();
  const customer = c as CustomerOverview;
  const bookings = numberRows(bk as Booking[] | null, ["price", "discount", "total"]);
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale);

  const usage = Object.entries(
    bookings
      .filter((b) => b.status === "completed")
      .reduce<Record<string, number>>((acc, b) => ((acc[b.service_name] = (acc[b.service_name] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div>
      <Link href="/admin/clientes" className="mb-5 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-bone">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>
      <h1 className="mb-6 font-display text-3xl uppercase tracking-wide text-bone">{customer.full_name}</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Visitas", String(customer.total_visits)],
          ["Reservas", String(customer.bookings_count)],
          ["Inasistencias", String(customer.no_show_count)],
          ["Total gastado", money(Number(customer.total_spent))],
        ].map(([k, v]) => (
          <Card key={k} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-ink-400">{k}</p>
            <p className="mt-2 font-display text-2xl tabular-nums text-bone">{v}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="flex flex-col gap-4">
          <CustomerPanel
            customer={customer}
            loyalty={settings.features.loyalty ? { threshold: settings.loyalty_reward_threshold, reward: settings.loyalty_reward_description } : null}
            tz={settings.timezone}
            locale={settings.locale}
          />
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg uppercase tracking-wide">Servicios utilizados</h2>
            {usage.length ? (
              <ul className="space-y-2 text-sm">
                {usage.map(([name, n]) => (
                  <li key={name} className="flex justify-between">
                    <span className="text-bone-dim">{name}</span>
                    <span className="tabular-nums text-ink-300">×{n}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-500">Sin atenciones completadas.</p>
            )}
          </Card>
        </div>
        <div className="lg:col-span-2">
          <h2 className="mb-3 font-display text-lg uppercase tracking-wide">Historial de reservas</h2>
          <BookingsTable bookings={bookings} ctx={{ tz: settings.timezone, currency: settings.currency, locale: settings.locale, barbers: refs.barbers }} />
        </div>
      </div>
    </div>
  );
}
