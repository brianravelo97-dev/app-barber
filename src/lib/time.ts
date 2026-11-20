import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

/** Fecha local (yyyy-MM-dd) del negocio para un instante dado. */
export function localDate(iso: string | Date, tz: string) {
  return formatInTimeZone(iso, tz, "yyyy-MM-dd");
}

/** Hora local (HH:mm) del negocio para un instante dado. */
export function localTime(iso: string | Date, tz: string) {
  return formatInTimeZone(iso, tz, "HH:mm");
}

export function todayInTz(tz: string) {
  return localDate(new Date(), tz);
}

/** Convierte fecha + hora locales del negocio a ISO UTC. */
export function zonedToUtcISO(date: string, time: string, tz: string) {
  const t = time.length === 5 ? `${time}:00` : time;
  return fromZonedTime(`${date}T${t}`, tz).toISOString();
}

/** Rango [inicio, fin) en UTC para uno o varios días locales. */
export function dayRangeUtc(date: string, tz: string, days = 1) {
  return { from: zonedToUtcISO(date, "00:00", tz), to: zonedToUtcISO(addDays(date, days), "00:00", tz) };
}

/** Suma días a una fecha yyyy-MM-dd (aritmética de calendario, sin zona horaria). */
export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

/** 0 = domingo … 6 = sábado */
export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Lunes de la semana de la fecha dada. */
export function startOfWeek(date: string) {
  const wd = weekdayOf(date);
  return addDays(date, wd === 0 ? -6 : 1 - wd);
}

export function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function daysInMonth(date: string) {
  const [y, m] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isValidDateStr(s: string | null | undefined): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
}

/** "HH:mm:ss" | "HH:mm" -> minutos desde medianoche */
export function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
