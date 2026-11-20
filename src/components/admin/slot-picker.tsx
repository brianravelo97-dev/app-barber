"use client";

import { clsx } from "clsx";
import { useEffect, useState } from "react";
import { getAdminSlots } from "@/app/admin/actions/bookings";
import { Skeleton } from "@/components/ui/misc";
import { localTime } from "@/lib/time";

/** Grilla de horas disponibles para el panel (usa la misma función de disponibilidad que el sitio). */
export function SlotPicker({
  serviceId,
  date,
  barberId,
  ignoreBookingId,
  value,
  onChange,
  tz,
}: {
  serviceId: string | null;
  date: string;
  barberId: string | null;
  ignoreBookingId?: string | null;
  value: { start: string; barbers: string[] } | null;
  onChange: (s: { start: string; barbers: string[] }) => void;
  tz: string;
}) {
  const [slots, setSlots] = useState<{ start: string; barbers: string[] }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    if (!serviceId || !date) return;
    setSlots(null);
    setError(null);
    getAdminSlots(serviceId, date, barberId, ignoreBookingId).then((r) => {
      if (!alive) return;
      if (r.ok) setSlots(r.data ?? []);
      else {
        setError(r.error);
        setSlots([]);
      }
    });
    return () => {
      alive = false;
    };
  }, [serviceId, date, barberId, ignoreBookingId]);

  if (!serviceId) return <p className="text-sm text-ink-400">Selecciona un servicio.</p>;
  if (slots === null)
    return (
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    );
  if (error) return <p className="text-sm text-danger">{error}</p>;
  if (!slots.length) return <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-ink-400">Sin horas libres para esa combinación. Puedes forzar una hora manual.</p>;

  return (
    <div className="grid max-h-56 grid-cols-4 gap-2 overflow-y-auto pr-1 scrollbar-thin sm:grid-cols-6">
      {slots.map((s) => (
        <button
          key={s.start}
          type="button"
          onClick={() => onChange(s)}
          className={clsx(
            "h-10 rounded-lg border text-sm tabular-nums transition-colors",
            value?.start === s.start ? "border-gold bg-gold text-ink-950" : "border-white/10 hover:border-gold/60",
          )}
        >
          {localTime(s.start, tz)}
        </button>
      ))}
    </div>
  );
}
