export const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
export const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

const ZERO_DECIMAL = ["CLP", "COP", "PYG", "JPY", "ARS"];

export function formatMoney(amount: number | string | null | undefined, currency = "CLP", locale = "es-CL") {
  const n = Number(amount ?? 0);
  const zero = ZERO_DECIMAL.includes(currency);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: zero ? 0 : 2,
      minimumFractionDigits: zero ? 0 : 2,
    }).format(n);
  } catch {
    return `$${n.toLocaleString()}`;
  }
}

export function formatDuration(min: number) {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

/** Fecha larga en la zona horaria del negocio: "jueves, 26 de noviembre" */
export function formatLongDate(iso: string | Date, tz: string, locale = "es-CL", withYear = false) {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(withYear ? { year: "numeric" } : {}),
  }).format(new Date(iso));
}

/** Para fechas yyyy-MM-dd (sin hora) */
export function formatDateStr(
  date: string,
  locale = "es-CL",
  opts: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
) {
  return new Intl.DateTimeFormat(locale, { timeZone: "UTC", ...opts }).format(new Date(`${date}T12:00:00Z`));
}

export function formatTime(iso: string | Date, tz: string, locale = "es-CL") {
  return new Intl.DateTimeFormat(locale, { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).format(
    new Date(iso),
  );
}

export function formatDateTime(iso: string | Date, tz: string, locale = "es-CL") {
  return new Intl.DateTimeFormat(locale, {
    timeZone: tz,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function onlyDigits(s: string | null | undefined) {
  return (s ?? "").replace(/[^0-9]/g, "");
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  const digits = onlyDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function instagramLink(handle: string | null | undefined) {
  if (!handle) return null;
  if (handle.startsWith("http")) return handle;
  return `https://instagram.com/${handle.replace(/^@/, "")}`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function slugify(s: string) {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmada",
  completed: "Atendido",
  cancelled: "Cancelada",
  no_show: "No asistió",
};

export const PAYMENT_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};
