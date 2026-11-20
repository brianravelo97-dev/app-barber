"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Lock, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { addBlock, deleteBlock } from "@/app/admin/actions/catalog";
import { BookingDetail, type AdminCtx } from "@/components/admin/booking-detail";
import { NewBookingButton, NewBookingModal } from "@/components/admin/new-booking";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { STATUS_STYLE } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { capitalize, STATUS_LABEL, WEEKDAYS_SHORT } from "@/lib/format";
import { addDays, localDate, localTime, minutesToTime, startOfWeek, timeToMinutes, todayInTz, weekdayOf } from "@/lib/time";
import type { BarberSchedule, Booking, BookingStatus, BusinessHour, Holiday, Service, TimeBlock } from "@/lib/types";

type View = "day" | "week" | "month";
const PX_PER_MIN = 1.5;

type Props = {
  view: View;
  date: string;
  rangeStart: string;
  days: number;
  barberFilter: string | null;
  ctx: AdminCtx;
  services: Service[];
  bookings: Booking[];
  blocks: TimeBlock[];
  schedules: BarberSchedule[];
  hours: BusinessHour[];
  holidays: Holiday[];
};

type Positioned<T> = T & { s: number; e: number; lane: number; lanes: number };

function layoutLanes<T extends { s: number; e: number }>(items: T[]): Positioned<T>[] {
  const sorted = [...items].sort((a, b) => a.s - b.s || b.e - a.e);
  const out: Positioned<T>[] = [];
  let cluster: Positioned<T>[] = [];
  let clusterEnd = -1;
  let laneEnds: number[] = [];
  const flush = () => {
    const n = laneEnds.length || 1;
    cluster.forEach((c) => (c.lanes = n));
    out.push(...cluster);
    cluster = [];
    laneEnds = [];
  };
  for (const it of sorted) {
    if (it.s >= clusterEnd && cluster.length) flush();
    let lane = laneEnds.findIndex((end) => end <= it.s);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(it.e);
    } else laneEnds[lane] = it.e;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.e);
  }
  flush();
  return out;
}

export function Agenda(props: Props) {
  const { view, date, rangeStart, days, barberFilter, ctx, services, bookings, blocks, schedules, hours, holidays } = props;
  const router = useRouter();
  const toast = useToast();
  const [selected, setSelected] = useState<Booking | null>(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [newAt, setNewAt] = useState<{ date: string; time: string; barber: string | null } | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);
  const [blockSel, setBlockSel] = useState<TimeBlock | null>(null);
  const [pending, start] = useTransition();
  const tz = ctx.tz;
  const today = todayInTz(tz);

  const nav = (patch: Partial<{ view: View; date: string; barber: string | null }>) => {
    const p = new URLSearchParams();
    p.set("view", patch.view ?? view);
    p.set("date", patch.date ?? date);
    const b = patch.barber === undefined ? barberFilter : patch.barber;
    if (b) p.set("barber", b);
    router.push(`/admin/agenda?${p}`);
  };

  const step = (dir: number) => {
    if (view === "day") nav({ date: addDays(date, dir) });
    else if (view === "week") nav({ date: addDays(date, 7 * dir) });
    else {
      const [y, m] = date.split("-").map(Number);
      const d = new Date(Date.UTC(y, m - 1 + dir, 1));
      nav({ date: d.toISOString().slice(0, 10) });
    }
  };

  const visibleBookings = bookings.filter((b) => showCancelled || b.status !== "cancelled");
  const columnBarbers = barberFilter ? ctx.barbers.filter((b) => b.id === barberFilter) : ctx.barbers;

  // Rango horario visible
  const [minMin, maxMin] = useMemo(() => {
    let lo = 24 * 60;
    let hi = 0;
    for (const h of hours) {
      if (!h.is_open) continue;
      lo = Math.min(lo, timeToMinutes(h.open_time));
      hi = Math.max(hi, timeToMinutes(h.close_time));
    }
    for (const b of bookings) {
      lo = Math.min(lo, timeToMinutes(localTime(b.starts_at, tz)));
      hi = Math.max(hi, timeToMinutes(localTime(b.ends_at, tz)) || 24 * 60);
    }
    if (lo >= hi) return [9 * 60, 21 * 60];
    return [Math.floor(lo / 60) * 60, Math.ceil(hi / 60) * 60];
  }, [hours, bookings, tz]);

  const height = (maxMin - minMin) * PX_PER_MIN;
  const hourMarks = Array.from({ length: (maxMin - minMin) / 60 + 1 }, (_, i) => minMin + i * 60);

  const title =
    view === "month"
      ? capitalize(new Intl.DateTimeFormat(ctx.locale, { timeZone: "UTC", month: "long", year: "numeric" }).format(new Date(`${date}T12:00:00Z`)))
      : view === "week"
        ? `${fmtShort(rangeStart, ctx.locale)} – ${fmtShort(addDays(rangeStart, 6), ctx.locale)}`
        : capitalize(new Intl.DateTimeFormat(ctx.locale, { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`)));

  function availability(day: string, barberId: string | null) {
    const wd = weekdayOf(day);
    const bh = hours.find((h) => h.weekday === wd);
    if (!bh?.is_open || holidays.some((h) => h.date === day)) return [];
    const open = timeToMinutes(bh.open_time);
    const close = timeToMinutes(bh.close_time);
    if (!barberId) return [[open, close]];
    return schedules
      .filter((s) => s.barber_id === barberId && s.weekday === wd)
      .map((s) => [Math.max(open, timeToMinutes(s.start_time)), Math.min(close, timeToMinutes(s.end_time))])
      .filter(([a, b]) => b > a);
  }

  function blocksFor(day: string, barberId: string | null) {
    const res: (TimeBlock & { s: number; e: number })[] = [];
    for (const bl of blocks) {
      if (barberId && bl.barber_id && bl.barber_id !== barberId) continue;
      const sd = localDate(bl.starts_at, tz);
      const ed = localDate(bl.ends_at, tz);
      if (day < sd || day > ed) continue;
      const s = sd === day ? timeToMinutes(localTime(bl.starts_at, tz)) : 0;
      const e = ed === day ? timeToMinutes(localTime(bl.ends_at, tz)) : 24 * 60;
      if (e > s) res.push({ ...bl, s, e });
    }
    return res;
  }

  function bookingsFor(day: string, barberId: string | null) {
    return visibleBookings
      .filter((b) => localDate(b.starts_at, tz) === day && (!barberId || b.barber_id === barberId))
      .map((b) => ({ ...b, s: timeToMinutes(localTime(b.starts_at, tz)), e: timeToMinutes(localTime(b.ends_at, tz)) || 24 * 60 }));
  }

  function onGridClick(e: React.MouseEvent<HTMLDivElement>, day: string, barberId: string | null) {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const min = minMin + Math.floor((e.clientY - rect.top) / PX_PER_MIN / 15) * 15;
    setNewAt({ date: day, time: minutesToTime(min), barber: barberId });
  }

  const columns: { key: string; label: React.ReactNode; day: string; barberId: string | null }[] =
    view === "day"
      ? columnBarbers.map((b) => ({
          key: b.id,
          day: date,
          barberId: b.id,
          label: (
            <span className="flex items-center justify-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
              {b.name.split(" ")[0]}
            </span>
          ),
        }))
      : Array.from({ length: 7 }, (_, i) => {
          const d = addDays(rangeStart, i);
          return {
            key: d,
            day: d,
            barberId: barberFilter,
            label: (
              <button onClick={() => nav({ view: "day", date: d })} className={clsx("flex flex-col items-center leading-tight", d === today && "text-gold")}>
                <span className="text-[10px] uppercase tracking-wider text-ink-400">{WEEKDAYS_SHORT[weekdayOf(d)]}</span>
                <span className="font-display text-lg">{Number(d.slice(8))}</span>
              </button>
            ),
          };
        });

  const [nowMin, setNowMin] = useState(-1);
  useEffect(() => {
    const tick = () => setNowMin(timeToMinutes(localTime(new Date(), tz)));
    tick();
    const t = setInterval(tick, 60_000);
    return () => clearInterval(t);
  }, [tz]);

  return (
    <div>
      {/* Toolbar */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl uppercase tracking-wide text-bone md:text-3xl">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full border border-white/10 p-1">
            {(["day", "week", "month"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => nav({ view: v })}
                className={clsx("rounded-full px-4 py-1.5 text-sm transition-colors", view === v ? "bg-gold text-ink-950" : "text-bone-dim hover:text-bone")}
              >
                {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => step(-1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-gold" aria-label="Anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={() => nav({ date: today })} className="h-9 rounded-full border border-white/10 px-4 text-sm hover:border-gold">
              Hoy
            </button>
            <button onClick={() => step(1)} className="grid h-9 w-9 place-items-center rounded-full border border-white/10 hover:border-gold" aria-label="Siguiente">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <Select value={barberFilter ?? ""} onChange={(e) => nav({ barber: e.target.value || null })} className="h-9 w-auto min-w-40 rounded-full text-sm" aria-label="Barbero">
            <option value="">Todos los barberos</option>
            {ctx.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="outline" icon={<Lock className="h-4 w-4" />} onClick={() => setBlockOpen(true)}>
            Bloquear
          </Button>
          <NewBookingButton ctx={ctx} services={services} defaultDate={date} defaultBarber={barberFilter} label="Reserva" />
        </div>
      </div>

      {/* Leyenda */}
      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-400">
        {(Object.keys(STATUS_LABEL) as BookingStatus[]).map((s) => (
          <span key={s} className="flex items-center gap-1.5">
            <span className={clsx("h-3 w-3 rounded border", STATUS_STYLE[s])} /> {STATUS_LABEL[s]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="hatch h-3 w-3 rounded border border-white/20 bg-white/[0.06]" /> Bloqueo / descanso
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded border border-white/10 bg-ink-850" /> Disponible
        </span>
        <label className="ml-auto flex items-center gap-2">
          <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} className="accent-[#c8a165]" />
          Mostrar canceladas
        </label>
      </div>

      {view === "month" ? (
        <MonthGrid
          date={date}
          rangeStart={rangeStart}
          days={days}
          bookings={visibleBookings}
          holidays={holidays}
          hours={hours}
          tz={tz}
          today={today}
          onPick={(d) => nav({ view: "day", date: d })}
        />
      ) : columns.length === 0 ? (
        <p className="rounded-2xl border border-white/[0.07] p-8 text-center text-ink-400">No hay barberos activos.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
          <div className="overflow-x-auto scrollbar-thin">
            <div style={{ minWidth: Math.max(columns.length * 150 + 56, 600) }}>
              {/* Cabecera */}
              <div className="sticky top-0 z-20 grid border-b border-white/[0.07] bg-ink-900" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0,1fr))` }}>
                <div />
                {columns.map((c) => (
                  <div key={c.key} className="border-l border-white/[0.05] px-2 py-3 text-center text-sm text-bone">
                    {c.label}
                    {view === "week" && holidays.find((h) => h.date === c.day) && (
                      <span className="mt-1 block truncate text-[10px] text-warning">{holidays.find((h) => h.date === c.day)!.name}</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Cuerpo */}
              <div className="grid max-h-[calc(100dvh-280px)] overflow-y-auto scrollbar-thin" style={{ gridTemplateColumns: `56px repeat(${columns.length}, minmax(0,1fr))` }}>
                <div className="relative" style={{ height }}>
                  {hourMarks.slice(0, -1).map((m) => (
                    <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-ink-500" style={{ top: (m - minMin) * PX_PER_MIN }}>
                      {m > minMin ? minutesToTime(m) : ""}
                    </span>
                  ))}
                </div>
                {columns.map((c) => {
                  const avail = availability(c.day, c.barberId);
                  const blks = blocksFor(c.day, c.barberId);
                  const evs = layoutLanes(bookingsFor(c.day, c.barberId));
                  return (
                    <div
                      key={c.key}
                      className="hatch relative cursor-crosshair border-l border-white/[0.05]"
                      style={{ height }}
                      onClick={(e) => onGridClick(e, c.day, c.barberId)}
                    >
                      {avail.map(([a, b], i) => (
                        <div
                          key={i}
                          className="pointer-events-none absolute inset-x-0 bg-ink-850"
                          style={{ top: (a - minMin) * PX_PER_MIN, height: (b - a) * PX_PER_MIN }}
                        />
                      ))}
                      {hourMarks.map((m) => (
                        <div key={m} className="pointer-events-none absolute inset-x-0 border-t border-white/[0.05]" style={{ top: (m - minMin) * PX_PER_MIN }} />
                      ))}
                      {c.day === today && nowMin >= minMin && nowMin <= maxMin && (
                        <div className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-danger" style={{ top: (nowMin - minMin) * PX_PER_MIN }}>
                          <span className="absolute -left-1 -top-1.5 h-2.5 w-2.5 rounded-full bg-danger" />
                        </div>
                      )}
                      {blks.map((bl) => (
                        <button
                          key={bl.id}
                          onClick={() => setBlockSel(bl)}
                          className="hatch absolute inset-x-1 z-[5] overflow-hidden rounded-lg border border-white/20 bg-ink-700/80 px-2 py-1 text-left text-[11px] text-ink-300"
                          style={{ top: (Math.max(bl.s, minMin) - minMin) * PX_PER_MIN, height: Math.max((Math.min(bl.e, maxMin) - Math.max(bl.s, minMin)) * PX_PER_MIN, 18) }}
                        >
                          <Lock className="mr-1 inline h-3 w-3" />
                          {bl.reason || "Bloqueado"}
                          {!bl.barber_id && " (local)"}
                        </button>
                      ))}
                      {evs.map((b) => {
                        const barber = ctx.barbers.find((x) => x.id === b.barber_id);
                        const h = Math.max((b.e - b.s) * PX_PER_MIN - 2, 22);
                        return (
                          <button
                            key={b.id}
                            onClick={() => setSelected(b)}
                            className={clsx(
                              "absolute z-[6] overflow-hidden rounded-lg border-l-[3px] px-2 py-1 text-left text-[11px] leading-tight shadow-lg transition-transform hover:z-10 hover:scale-[1.02]",
                              STATUS_STYLE[b.status],
                            )}
                            style={{
                              top: (b.s - minMin) * PX_PER_MIN + 1,
                              height: h,
                              left: `calc(${(b.lane / b.lanes) * 100}% + 3px)`,
                              width: `calc(${100 / b.lanes}% - 6px)`,
                            }}
                          >
                            <span className="flex items-center gap-1 font-semibold tabular-nums">
                              {view === "week" && !barberFilter && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: barber?.color }} />}
                              {localTime(b.starts_at, tz)}
                            </span>
                            <span className="block truncate text-bone">{b.customer_name}</span>
                            {h > 44 && <span className="block truncate opacity-80">{b.service_name}</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <BookingDetail key={selected?.id ?? "none"} booking={selected} ctx={ctx} onClose={() => setSelected(null)} />

      {newAt && (
        <NewBookingModal
          ctx={ctx}
          services={services}
          defaultDate={newAt.date}
          defaultBarber={newAt.barber}
          defaultTime={newAt.time}
          onClose={() => setNewAt(null)}
        />
      )}

      {blockOpen && <BlockModal ctx={ctx} defaultDate={date} defaultBarber={barberFilter} onClose={() => setBlockOpen(false)} />}

      <Modal open={!!blockSel} onClose={() => setBlockSel(null)} title="Bloqueo de horario" size="sm">
        {blockSel && (
          <div className="flex flex-col gap-4 text-sm">
            <p className="text-bone">{blockSel.reason || "Sin motivo"}</p>
            <p className="text-ink-400">
              {ctx.barbers.find((b) => b.id === blockSel.barber_id)?.name ?? "Toda la barbería"} ·{" "}
              {localDate(blockSel.starts_at, tz)} {localTime(blockSel.starts_at, tz)} → {localDate(blockSel.ends_at, tz)} {localTime(blockSel.ends_at, tz)}
            </p>
            <Button
              variant="danger"
              loading={pending}
              icon={<Trash2 className="h-4 w-4" />}
              onClick={() =>
                start(async () => {
                  const r = await deleteBlock(blockSel.id);
                  if (r.ok) {
                    toast.success("Bloqueo eliminado");
                    setBlockSel(null);
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Eliminar bloqueo
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function fmtShort(d: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));
}

function MonthGrid({
  date,
  rangeStart,
  days,
  bookings,
  holidays,
  hours,
  tz,
  today,
  onPick,
}: {
  date: string;
  rangeStart: string;
  days: number;
  bookings: Booking[];
  holidays: Holiday[];
  hours: BusinessHour[];
  tz: string;
  today: string;
  onPick: (d: string) => void;
}) {
  const gridStart = startOfWeek(rangeStart);
  const cells = Math.ceil((weekdayOf(rangeStart) === 0 ? 6 : weekdayOf(rangeStart) - 1) + days) > 35 ? 42 : 35;
  const byDay = new Map<string, Booking[]>();
  for (const b of bookings) {
    const d = localDate(b.starts_at, tz);
    byDay.set(d, [...(byDay.get(d) ?? []), b]);
  }
  const month = date.slice(0, 7);
  const dot: Record<BookingStatus, string> = {
    pending: "bg-warning",
    confirmed: "bg-info",
    completed: "bg-success",
    cancelled: "bg-ink-500",
    no_show: "bg-danger",
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
      <div className="grid grid-cols-7 border-b border-white/[0.07] text-center text-[11px] uppercase tracking-wider text-ink-500">
        {[1, 2, 3, 4, 5, 6, 0].map((wd) => (
          <div key={wd} className="py-2.5">
            {WEEKDAYS_SHORT[wd]}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {Array.from({ length: cells }, (_, i) => {
          const d = addDays(gridStart, i);
          const inMonth = d.slice(0, 7) === month;
          const list = byDay.get(d) ?? [];
          const holiday = holidays.find((h) => h.date === d);
          const closed = !hours.find((h) => h.weekday === weekdayOf(d))?.is_open;
          const counts = list.reduce<Record<string, number>>((acc, b) => ((acc[b.status] = (acc[b.status] ?? 0) + 1), acc), {});
          return (
            <button
              key={d}
              onClick={() => onPick(d)}
              className={clsx(
                "flex min-h-20 flex-col gap-1 border-b border-r border-white/[0.05] p-2 text-left transition-colors hover:bg-white/[0.03] sm:min-h-28",
                !inMonth && "opacity-35",
                (closed || holiday) && "hatch",
              )}
            >
              <span
                className={clsx(
                  "grid h-7 w-7 place-items-center rounded-full text-sm tabular-nums",
                  d === today ? "bg-gold font-semibold text-ink-950" : "text-bone",
                )}
              >
                {Number(d.slice(8))}
              </span>
              {holiday && <span className="truncate text-[10px] text-warning">{holiday.name}</span>}
              {list.length > 0 && (
                <>
                  <span className="text-xs text-bone-dim">
                    {list.filter((b) => b.status !== "cancelled").length} <span className="hidden sm:inline">reservas</span>
                  </span>
                  <span className="flex flex-wrap gap-1">
                    {(Object.keys(counts) as BookingStatus[]).map((s) => (
                      <span key={s} className="flex items-center gap-0.5 text-[10px] text-ink-400">
                        <span className={clsx("h-1.5 w-1.5 rounded-full", dot[s])} />
                        {counts[s]}
                      </span>
                    ))}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BlockModal({ ctx, defaultDate, defaultBarber, onClose }: { ctx: AdminCtx; defaultDate: string; defaultBarber: string | null; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [barber, setBarber] = useState(defaultBarber ?? "");
  const [date, setDate] = useState(defaultDate);
  const [allDay, setAllDay] = useState(false);
  const [from, setFrom] = useState("13:00");
  const [to, setTo] = useState("14:00");
  const [reason, setReason] = useState("");

  return (
    <Modal
      open
      onClose={onClose}
      title="Bloquear horario"
      description="Descansos, vacaciones, trámites o cierres puntuales. Las horas bloqueadas no se pueden reservar."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              start(async () => {
                const r = await addBlock({ barber_id: barber || null, date, start: allDay ? "00:00" : from, end: allDay ? "23:59" : to, reason, all_day: allDay });
                if (r.ok) {
                  toast.success("Horario bloqueado");
                  router.refresh();
                  onClose();
                } else toast.error(r.error);
              })
            }
          >
            Bloquear
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Barbero" className="sm:col-span-2">
          <Select value={barber} onChange={(e) => setBarber(e.target.value)}>
            <option value="">Toda la barbería</option>
            {ctx.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha" className="sm:col-span-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <div className="sm:col-span-2">
          <Switch checked={allDay} onChange={setAllDay} label="Todo el día" />
        </div>
        {!allDay && (
          <>
            <Field label="Desde">
              <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
          </>
        )}
        <Field label="Motivo" className="sm:col-span-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Colación, vacaciones, trámite…" maxLength={120} />
        </Field>
      </div>
    </Modal>
  );
}
