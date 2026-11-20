"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { WEEKDAYS } from "@/lib/format";
import type { BusinessHour, Holiday } from "@/lib/types";

function nowInTz(tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}`, weekday: wd };
}

export function OpeningHours({ hours, holidays, timezone }: { hours: BusinessHour[]; holidays: Holiday[]; timezone: string }) {
  const [now, setNow] = useState<{ date: string; time: string; weekday: number } | null>(null);

  useEffect(() => {
    setNow(nowInTz(timezone));
    const t = setInterval(() => setNow(nowInTz(timezone)), 60_000);
    return () => clearInterval(t);
  }, [timezone]);

  const ordered = [1, 2, 3, 4, 5, 6, 0].map((wd) => hours.find((h) => h.weekday === wd)).filter(Boolean) as BusinessHour[];
  const todayHoliday = now ? holidays.find((h) => h.date === now.date) : undefined;
  const today = now ? hours.find((h) => h.weekday === now.weekday) : undefined;
  const isOpen =
    !!now && !!today && today.is_open && !todayHoliday && now.time >= today.open_time.slice(0, 5) && now.time < today.close_time.slice(0, 5);

  return (
    <div>
      <div className="mb-5 flex items-center gap-2">
        <span className={clsx("h-2.5 w-2.5 rounded-full", now ? (isOpen ? "bg-success shadow-[0_0_12px] shadow-success" : "bg-danger") : "bg-ink-500")} />
        <span className="text-sm text-bone-dim">
          {!now ? "Horario de atención" : isOpen ? "Abierto ahora" : todayHoliday ? `Cerrado hoy · ${todayHoliday.name}` : "Cerrado ahora"}
        </span>
      </div>
      <ul className="divide-y divide-white/[0.06]">
        {ordered.map((h) => (
          <li
            key={h.weekday}
            className={clsx("flex items-center justify-between py-3 text-[15px]", now?.weekday === h.weekday ? "text-gold-light" : "text-bone-dim")}
          >
            <span className="font-display uppercase tracking-wider">{WEEKDAYS[h.weekday]}</span>
            <span className={clsx(!h.is_open && "text-ink-500")}>
              {h.is_open ? `${h.open_time.slice(0, 5)} – ${h.close_time.slice(0, 5)}` : "Cerrado"}
            </span>
          </li>
        ))}
      </ul>
      {holidays.length > 0 && (
        <p className="mt-4 text-xs text-ink-400">
          Próximos días cerrados: {holidays.slice(0, 3).map((h) => `${h.date.slice(8, 10)}/${h.date.slice(5, 7)} (${h.name})`).join(", ")}
        </p>
      )}
    </div>
  );
}
