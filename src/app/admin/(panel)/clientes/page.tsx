import { Search, Users } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { formatMoney, initials } from "@/lib/format";
import type { CustomerOverview } from "@/lib/types";

export const metadata = { title: "Clientes" };
const PAGE = 40;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string; page?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaffPage();
  const settings = await getSettings();
  const q = (sp.q ?? "").trim().slice(0, 60);
  const page = Math.max(1, Number(sp.page) || 1);
  const sorts: Record<string, [string, boolean]> = {
    recent: ["created_at", false],
    name: ["full_name", true],
    visits: ["total_visits", false],
    points: ["loyalty_points", false],
    last: ["last_visit_at", false],
  };
  const [col, asc] = sorts[sp.sort ?? "recent"] ?? sorts.recent;

  let query = supabase
    .from("customer_overview")
    .select("*", { count: "exact" })
    .order(col, { ascending: asc, nullsFirst: false })
    .range((page - 1) * PAGE, page * PAGE - 1);
  if (q) {
    const safe = q.replace(/[%,()]/g, " ");
    const digits = q.replace(/[^0-9]/g, "");
    query = query.or([`full_name.ilike.%${safe}%`, `email.ilike.%${safe}%`, digits.length >= 3 ? `phone.ilike.%${digits}%` : null].filter(Boolean).join(","));
  }
  const { data, count } = await query;
  const customers = (data ?? []) as CustomerOverview[];
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const tz = settings.timezone;

  return (
    <>
      <PageHeader title="Clientes" description={`${count ?? 0} clientes registrados`} />
      <form className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" />
          <Input name="q" defaultValue={q} placeholder="Buscar por nombre, teléfono o correo" className="pl-10" />
        </div>
        <Select name="sort" defaultValue={sp.sort ?? "recent"} className="sm:w-56" aria-label="Orden">
          <option value="recent">Más recientes</option>
          <option value="last">Última visita</option>
          <option value="visits">Más visitas</option>
          <option value="points">Más puntos</option>
          <option value="name">Nombre A-Z</option>
        </Select>
        <Button type="submit" className="h-12">
          Buscar
        </Button>
      </form>

      {customers.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-ink-850">
          <EmptyState icon={<Users className="h-6 w-6" />} title="Sin clientes" description="Los clientes se registran automáticamente al reservar." />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
          <table className="w-full text-sm">
            <thead className="hidden border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-ink-500 md:table-header-group">
              <tr>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
                <th className="px-4 py-3 text-right font-medium">Visitas</th>
                <th className="px-4 py-3 font-medium">Última visita</th>
                {settings.features.loyalty && <th className="px-4 py-3 text-right font-medium">Puntos</th>}
                <th className="px-4 py-3 text-right font-medium">Total gastado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link href={`/admin/clientes/${c.id}`} className="flex items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-semibold text-gold-light">{initials(c.full_name)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-bone hover:text-gold">{c.full_name}</span>
                        <span className="block text-xs text-ink-400 md:hidden">
                          {c.phone} · {c.total_visits} visitas
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-300 md:table-cell">
                    {c.phone}
                    {c.email && <span className="block text-xs text-ink-500">{c.email}</span>}
                  </td>
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{c.total_visits}</td>
                  <td className="hidden px-4 py-3 text-ink-300 md:table-cell">
                    {c.last_visit_at ? new Intl.DateTimeFormat(settings.locale, { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(new Date(c.last_visit_at)) : "—"}
                  </td>
                  {settings.features.loyalty && <td className="hidden px-4 py-3 text-right tabular-nums text-gold md:table-cell">{c.loyalty_points}</td>}
                  <td className="hidden px-4 py-3 text-right tabular-nums md:table-cell">{formatMoney(Number(c.total_spent), settings.currency, settings.locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2 text-sm">
          {page > 1 && <ButtonLink href={`/admin/clientes?q=${encodeURIComponent(q)}&sort=${sp.sort ?? ""}&page=${page - 1}`} variant="outline" size="sm">Anterior</ButtonLink>}
          <span className="px-3 text-ink-400">Página {page} de {pages}</span>
          {page < pages && <ButtonLink href={`/admin/clientes?q=${encodeURIComponent(q)}&sort=${sp.sort ?? ""}&page=${page + 1}`} variant="outline" size="sm">Siguiente</ButtonLink>}
        </div>
      )}
    </>
  );
}
