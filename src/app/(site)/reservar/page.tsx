import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/booking-wizard";
import {
  getBarberServices,
  getBarbers,
  getBusinessHours,
  getSchedules,
  getServices,
  getSettings,
  getUpcomingHolidays,
} from "@/lib/data";

export const revalidate = 60;
export const metadata: Metadata = { title: "Reservar hora", description: "Reserva tu hora online en menos de un minuto." };

export default async function BookPage() {
  const [settings, services, barbers, links, schedules, hours, holidays] = await Promise.all([
    getSettings(),
    getServices(),
    getBarbers(),
    getBarberServices(),
    getSchedules(),
    getBusinessHours(),
    getUpcomingHolidays(),
  ]);

  return (
    <div className="pb-32 pt-24 md:pb-24 md:pt-32">
      <div className="mx-auto max-w-6xl px-4 md:px-8">
        <BookingWizard
          settings={{
            name: settings.name,
            timezone: settings.timezone,
            currency: settings.currency,
            locale: settings.locale,
            maxAdvanceDays: settings.max_advance_days,
            cancellationPolicy: settings.cancellation_policy,
            autoConfirm: settings.auto_confirm,
            features: settings.features,
            whatsapp: settings.whatsapp,
          }}
          services={services}
          barbers={barbers}
          links={links}
          schedules={schedules.map((s) => ({ barber_id: s.barber_id, weekday: s.weekday }))}
          hours={hours}
          holidays={holidays.map((h) => h.date)}
        />
      </div>
    </div>
  );
}
