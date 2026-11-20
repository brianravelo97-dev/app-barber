import { Search } from "lucide-react";
import { BookingsTable } from "@/components/admin/bookings-table";
import { NewBookingButton } from "@/components/admin/new-booking";
import { PageHeader } from "@/components/admin/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs, numberRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { STATUS_LABEL } from "@/lib/format";
import { addDays, dayRangeUtc, isValidDateStr, todayInTz } from "@/lib/time";
import type { Booking } from "@/lib/types";

export const metadata = { title: "Reservas" };
const PAGE_SIZE = 50;

type SP = { from?: string; to?: string; barber?: string; status?: string; q?: string; page?: string };

export default async function BookingsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaffPage();
  const [settings, refs] = await Promise.all([getSettings(), getAdminRefs(supabase)]);
  const tz = settings.timezone;
  const today = todayInTz(tz);

  const from = isValidDateStr(sp.from) ? sp.from : today;
  const to = isValidDateStr(sp.to) ? sp.to : addDays(from, 30);
  const page = Math.max(1, Number(sp.page) || 1);
  const q = (sp.q ?? "").trim().slice(0, 60);

  let query = supabase
    .from("bookings")
    .select("*", { count: "exact" })
    .gte("starts_at", dayRangeUtc(from, tz).from)
    .lt("starts_at", dayRangeUtc(to, tz).to)
    .order("starts_at", { ascending: true })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (sp.barber && /^[0-9a-f-]{36}$/i.test(sp.barber)) query = query.eq("barber_id", sp.barber);
  if (sp.status && sp.status in STATUS_LABEL) query = query.eq("status", sp.status);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    const digits = q.replace(/[^0-9]/g, "");
    query = query.or(
      [`customer_name.ilike.%${safe}%`, `code.ilike.%${safe}%`, digits.length >= 3 ? `customer_phone.ilike.%${digits}%` : null]
        .filter(Boolean)
        .join(","),
    );
  }
  const { data, count, error } = await query;
  const bookings = numberRows(data as Booking[] | null, ["price", "discount", "total"]);
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/admin/reservas?${u}`;
  };

  return (
    <>
      <PageHeader
        title="Reservas"
        description={`${count ?? 0} reservas entre las fechas seleccionadas`}
        actions={
          <NewBookingButton
            ctx={{ tz, currency: settings.currency, locale: settings.locale, barbers: refs.barbers }}
            services={refs.services}
          />
        }
      />

      <form className="mb-5 grid gap-3 rounded-2xl border border-white/[0.07] bg-ink-850 p-4 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <Input name="q" defaultValue={q} placeholder="Nombre, teléfono o código" className="pl-10" />
        </div>
        <Input type="date" name="from" defaultValue={from} aria-label="Desde" />
        <Input type="date" name="to" defaultValue={to} aria-label="Hasta" />
        <Select name="barber" defaultValue={sp.barber ?? ""} aria-label="Barbero">
          <option value="">Todos los barberos</option>
          {refs.barbers.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </Select>
        <Select name="status" defaultValue={sp.status ?? ""} aria-label="Estado">
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit" className="h-12 flex-1">
            Filtrar
          </Button>
          <ButtonLink href="/admin/reservas" variant="ghost" className="h-12">
            Limpiar
          </ButtonLink>
        </div>
        <div className="flex flex-wrap gap-2 text-xs sm:col-span-2 lg:col-span-6">
          {[
            ["Hoy", today, today],
            ["Mañana", addDays(today, 1), addDays(today, 1)],
            ["Próx. 7 días", today, addDays(today, 7)],
            ["Últimos 30 días", addDays(today, -30), today],
          ].map(([label, f, t]) => (
            <a key={label} href={`/admin/reservas?from=${f}&to=${t}`} className="rounded-full border border-white/10 px-3 py-1 text-ink-300 hover:border-gold hover:text-gold">
              {label}
            </a>
          ))}
        </div>
      </form>

      {error && <p className="mb-4 text-sm text-danger">Error al cargar: {error.message}</p>}

      <BookingsTable
        bookings={bookings}
        ctx={{ tz, currency: settings.currency, locale: settings.locale, barbers: refs.barbers }}
      />

      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <ButtonLink href={qs(page - 1)} variant="outline" size="sm">Anterior</ButtonLink>}
          <span className="px-3 text-ink-400">
            Página {page} de {pages}
          </span>
          {page < pages && <ButtonLink href={qs(page + 1)} variant="outline" size="sm">Siguiente</ButtonLink>}
        </div>
      )}
    </>
  );
}
