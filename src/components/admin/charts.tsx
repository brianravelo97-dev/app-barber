"use client";

import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/format";

/** Tono de marca validado para marcas de datos sobre superficie oscura (contraste ≥ 3:1). */
const MARK = "#c08532";
const GRID = "rgba(255,255,255,0.06)";
const AXIS = { fill: "#8a8784", fontSize: 11 };

type Daily = { date: string; revenue: number; bookings: number };

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-ink-800/95 px-3 py-2 text-xs shadow-xl backdrop-blur">
      <p className="text-ink-400">{title}</p>
      <p className="mt-0.5 font-semibold text-bone tabular-nums">{value}</p>
    </div>
  );
}

const dayLabel = (d: string, locale: string) =>
  new Intl.DateTimeFormat(locale, { timeZone: "UTC", day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00Z`));

export function RevenueChart({ data, currency, locale }: { data: Daily[]; currency: string; locale: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={MARK} stopOpacity={0.35} />
            <stop offset="100%" stopColor={MARK} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => dayLabel(d, locale)} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis
          tick={AXIS}
          axisLine={false}
          tickLine={false}
          width={64}
          tickFormatter={(v) => new Intl.NumberFormat(locale, { notation: "compact" }).format(v)}
        />
        <Tooltip
          cursor={{ stroke: "rgba(255,255,255,0.25)", strokeWidth: 1 }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox title={dayLabel(String(payload[0].payload.date), locale)} value={formatMoney(Number(payload[0].value), currency, locale)} />
            ) : null
          }
        />
        <Area type="monotone" dataKey="revenue" stroke={MARK} strokeWidth={2} fill="url(#rev)" activeDot={{ r: 5, stroke: "#141414", strokeWidth: 2 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function BookingsChart({ data, locale }: { data: Daily[]; locale: string }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={(d) => dayLabel(d, locale)} tick={AXIS} axisLine={false} tickLine={false} minTickGap={24} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={32} allowDecimals={false} />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <TooltipBox title={dayLabel(String(payload[0].payload.date), locale)} value={`${payload[0].value} reservas`} />
            ) : null
          }
        />
        <Bar dataKey="bookings" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Ranking horizontal (servicios / barberos) en HTML: etiquetas legibles y barra proporcional. */
export function RankBars({ items, unit }: { items: { name: string; count: number; color?: string }[]; unit: string }) {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (!items.length) return <p className="py-6 text-center text-sm text-ink-400">Aún no hay datos suficientes.</p>;
  return (
    <ul className="space-y-3.5">
      {items.map((i) => (
        <li key={i.name} title={`${i.name}: ${i.count} ${unit}`}>
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 truncate text-bone">
              {i.color && <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: i.color }} />}
              {i.name}
            </span>
            <span className="tabular-nums text-ink-300">
              {i.count} <span className="text-ink-500">{unit}</span>
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
            <div className="h-full rounded-full" style={{ width: `${(i.count / max) * 100}%`, background: MARK }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
