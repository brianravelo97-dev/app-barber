import { Agenda } from "@/components/admin/agenda";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs, numberRows } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import { addDays, dayRangeUtc, daysInMonth, isValidDateStr, startOfMonth, startOfWeek, todayInTz } from "@/lib/time";
import type { BarberSchedule, Booking, BusinessHour, Holiday, TimeBlock } from "@/lib/types";

export const metadata = { title: "Agenda" };

type View = "day" | "week" | "month";

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ view?: string; date?: string; barber?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireStaffPage();
  const [settings, refs] = await Promise.all([getSettings(), getAdminRefs(supabase)]);
  const tz = settings.timezone;

  const view: View = sp.view === "week" || sp.view === "month" ? sp.view : "day";
  const date = isValidDateStr(sp.date) ? sp.date : todayInTz(tz);
  const barber = sp.barber && refs.barbers.some((b) => b.id === sp.barber) ? sp.barber : null;

  let rangeStart = date;
  let days = 1;
  if (view === "week") {
    rangeStart = startOfWeek(date);
    days = 7;
  } else if (view === "month") {
    rangeStart = startOfMonth(date);
    days = daysInMonth(date);
  }
  const { from, to } = dayRangeUtc(rangeStart, tz, days);
  const rangeEnd = addDays(rangeStart, days - 1);

  let bq = supabase.from("bookings").select("*").gte("starts_at", from).lt("starts_at", to).order("starts_at");
  if (barber) bq = bq.eq("barber_id", barber);
  let blq = supabase.from("time_blocks").select("*").lt("starts_at", to).gt("ends_at", from);
  if (barber) blq = blq.or(`barber_id.is.null,barber_id.eq.${barber}`);

  const [{ data: bookings }, { data: blocks }, { data: schedules }, { data: hours }, { data: holidays }] = await Promise.all([
    bq,
    blq,
    supabase.from("barber_schedules").select("*"),
    supabase.from("business_hours").select("*").order("weekday"),
    supabase.from("holidays").select("*").gte("date", rangeStart).lte("date", rangeEnd),
  ]);

  return (
    <Agenda
      view={view}
      date={date}
      rangeStart={rangeStart}
      days={days}
      barberFilter={barber}
      ctx={{ tz, currency: settings.currency, locale: settings.locale, barbers: refs.barbers.filter((b) => b.is_active) }}
      services={refs.services.filter((s) => s.is_active)}
      bookings={numberRows(bookings as Booking[] | null, ["price", "discount", "total"])}
      blocks={(blocks ?? []) as TimeBlock[]}
      schedules={(schedules ?? []) as BarberSchedule[]}
      hours={(hours ?? []) as BusinessHour[]}
      holidays={(holidays ?? []) as Holiday[]}
    />
  );
}
