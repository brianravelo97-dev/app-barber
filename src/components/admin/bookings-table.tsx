"use client";

import { Check, ChevronRight, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setBookingStatus } from "@/app/admin/actions/bookings";
import { BookingDetail, type AdminCtx } from "@/components/admin/booking-detail";
import { EmptyState, StatusBadge } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { capitalize, formatMoney, formatTime } from "@/lib/format";
import type { Booking } from "@/lib/types";

export function BookingsTable({ bookings, ctx }: { bookings: Booking[]; ctx: AdminCtx }) {
  const [selected, setSelected] = useState<Booking | null>(null);
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const money = (n: number) => formatMoney(n, ctx.currency, ctx.locale);
  const barberOf = (id: string) => ctx.barbers.find((b) => b.id === id);
  const dateLabel = (iso: string) =>
    capitalize(new Intl.DateTimeFormat(ctx.locale, { timeZone: ctx.tz, weekday: "short", day: "2-digit", month: "short" }).format(new Date(iso)));

  function quickConfirm(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    start(async () => {
      const r = await setBookingStatus(id, "confirmed");
      if (r.ok) {
        toast.success("Reserva confirmada");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  if (!bookings.length) {
    return (
      <div className="rounded-2xl border border-white/[0.07] bg-ink-850">
        <EmptyState icon={<ClipboardList className="h-6 w-6" />} title="Sin reservas" description="No hay reservas con estos filtros." />
      </div>
    );
  }

  return (
    <>
      {/* Escritorio */}
      <div className="hidden overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850 md:block">
        <table className="w-full text-sm">
          <thead className="border-b border-white/[0.07] text-left text-[11px] uppercase tracking-wider text-ink-500">
            <tr>
              <th className="px-4 py-3 font-medium">Fecha</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Servicio</th>
              <th className="px-4 py-3 font-medium">Barbero</th>
              <th className="px-4 py-3 font-medium">Estado</th>
              <th className="px-4 py-3 text-right font-medium">Total</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.05]">
            {bookings.map((b) => {
              const barber = barberOf(b.barber_id);
              return (
                <tr key={b.id} onClick={() => setSelected(b)} className="cursor-pointer transition-colors hover:bg-white/[0.02]">
                  <td className="whitespace-nowrap px-4 py-3">
                    <span className="block text-bone">{dateLabel(b.starts_at)}</span>
                    <span className="text-ink-400 tabular-nums">{formatTime(b.starts_at, ctx.tz)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="block text-bone">{b.customer_name}</span>
                    <span className="text-xs text-ink-400">{b.customer_phone}</span>
                  </td>
                  <td className="px-4 py-3 text-bone-dim">
                    {b.service_name}
                    <span className="block text-[11px] text-ink-500">#{b.code}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2 text-bone-dim">
                      <span className="h-2 w-2 rounded-full" style={{ background: barber?.color }} />
                      {barber?.name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-bone">{money(b.total)}</td>
                  <td className="px-4 py-3 text-right">
                    {b.status === "pending" ? (
                      <button
                        onClick={(e) => quickConfirm(e, b.id)}
                        disabled={pending}
                        className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-3 py-1 text-xs text-gold-light hover:bg-gold/25"
                      >
                        <Check className="h-3 w-3" /> Confirmar
                      </button>
                    ) : (
                      <ChevronRight className="ml-auto h-4 w-4 text-ink-500" />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Móvil */}
      <ul className="space-y-2 md:hidden">
        {bookings.map((b) => {
          const barber = barberOf(b.barber_id);
          return (
            <li key={b.id}>
              <button onClick={() => setSelected(b)} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.07] bg-ink-850 p-4 text-left">
                <span className="w-14 shrink-0 text-center">
                  <span className="block font-display text-lg tabular-nums text-bone">{formatTime(b.starts_at, ctx.tz)}</span>
                  <span className="text-[10px] uppercase text-ink-500">{dateLabel(b.starts_at)}</span>
                </span>
                <span className="h-10 w-0.5 rounded-full" style={{ background: barber?.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-bone">{b.customer_name}</span>
                  <span className="block truncate text-xs text-ink-400">
                    {b.service_name} · {barber?.name}
                  </span>
                </span>
                <StatusBadge status={b.status} />
              </button>
            </li>
          );
        })}
      </ul>

      <BookingDetail key={selected?.id ?? "none"} booking={selected} ctx={ctx} onClose={() => setSelected(null)} />
    </>
  );
}
