import { PageHeader } from "@/components/admin/page-header";
import { PaymentsManager } from "@/components/admin/payments-manager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { formatMoney, PAYMENT_LABEL } from "@/lib/format";
import { dayRangeUtc, isValidDateStr, startOfMonth, todayInTz } from "@/lib/time";

export const metadata = { title: "Pagos" };

export type PaymentRow = {
  id: string;
  amount: number;
  method: string;
  notes: string | null;
  paid_at: string;
  booking_id: string | null;
  bookings: { code: string; service_name: string; customer_name: string } | null;
  customers: { full_name: string } | null;
};

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const { supabase, profile } = await requireStaffPage();
  const settings = await getSettings();
  const tz = settings.timezone;
  const today = todayInTz(tz);
  const from = isValidDateStr(sp.from) ? sp.from : startOfMonth(today);
  const to = isValidDateStr(sp.to) ? sp.to : today;

  const { data } = await supabase
    .from("payments")
    .select("id, amount, method, notes, paid_at, booking_id, bookings(code, service_name, customer_name), customers(full_name)")
    .gte("paid_at", dayRangeUtc(from, tz).from)
    .lt("paid_at", dayRangeUtc(to, tz).to)
    .order("paid_at", { ascending: false })
    .limit(500);
  const rows = ((data ?? []) as unknown as PaymentRow[]).map((r) => ({ ...r, amount: Number(r.amount) }));
  const total = rows.reduce((a, r) => a + r.amount, 0);
  const byMethod = Object.keys(PAYMENT_LABEL).map((m) => ({ m, sum: rows.filter((r) => r.method === m).reduce((a, r) => a + r.amount, 0) }));
  const money = (n: number) => formatMoney(n, settings.currency, settings.locale);

  return (
    <>
      <PageHeader title="Pagos" description="Registro de ingresos. Los pagos se crean al marcar una reserva como atendida o manualmente." />
      <form className="mb-5 flex flex-wrap items-end gap-3">
        <Input type="date" name="from" defaultValue={from} className="w-auto" aria-label="Desde" />
        <Input type="date" name="to" defaultValue={to} className="w-auto" aria-label="Hasta" />
        <Button type="submit" className="h-12">
          Filtrar
        </Button>
      </form>
      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <Card className="col-span-2 p-4 md:col-span-1">
          <p className="text-[11px] uppercase tracking-wider text-ink-400">Total del período</p>
          <p className="mt-2 font-display text-2xl text-gold tabular-nums">{money(total)}</p>
          <p className="text-xs text-ink-500">{rows.length} pagos</p>
        </Card>
        {byMethod.map(({ m, sum }) => (
          <Card key={m} className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-ink-400">{PAYMENT_LABEL[m]}</p>
            <p className="mt-2 font-display text-xl tabular-nums text-bone">{money(sum)}</p>
          </Card>
        ))}
      </div>
      <PaymentsManager rows={rows} tz={tz} currency={settings.currency} locale={settings.locale} canDelete={profile?.role === "admin"} />
    </>
  );
}
