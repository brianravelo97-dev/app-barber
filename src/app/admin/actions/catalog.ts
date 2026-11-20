"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, UserError, withStaff } from "@/lib/actions";
import { getSettings } from "@/lib/data";
import { zonedToUtcISO, addDays } from "@/lib/time";
import { barberSchema, blockSchema, scheduleSchema, serviceSchema } from "@/lib/validation";

const uuid = z.guid();

function refreshAll() {
  revalidatePath("/", "layout");
}

// ─── Servicios ──────────────────────────────────────────────────────────
export async function saveService(id: string | null, input: z.input<typeof serviceSchema>) {
  return withStaff(
    async ({ supabase }) => {
      const d = serviceSchema.parse(input);
      if (id) {
        uuid.parse(id);
        check(await supabase.from("services").update(d).eq("id", id));
      } else {
        const created = check(await supabase.from("services").insert(d).select("id").single()) as { id: string };
        // Por defecto, todos los barberos activos realizan el nuevo servicio.
        const { data: barbers } = await supabase.from("barbers").select("id");
        if (barbers?.length) {
          await supabase.from("barber_services").insert(barbers.map((b) => ({ barber_id: b.id, service_id: created.id })));
        }
      }
      refreshAll();
    },
    { admin: true },
  );
}

export async function toggleService(id: string, field: "is_active" | "is_featured", value: boolean) {
  return withStaff(
    async ({ supabase }) => {
      uuid.parse(id);
      check(await supabase.from("services").update({ [field]: value }).eq("id", id));
      refreshAll();
    },
    { admin: true },
  );
}

export async function deleteService(id: string) {
  return withStaff(
    async ({ supabase }) => {
      uuid.parse(id);
      const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("service_id", id);
      if (count) throw new UserError("Este servicio tiene reservas registradas. Desactívalo en lugar de eliminarlo para conservar el historial.");
      check(await supabase.from("services").delete().eq("id", id));
      refreshAll();
    },
    { admin: true },
  );
}

// ─── Barberos ───────────────────────────────────────────────────────────
export async function saveBarber(id: string | null, input: z.input<typeof barberSchema>, serviceIds: string[]) {
  return withStaff(
    async ({ supabase }) => {
      const d = barberSchema.parse(input);
      const services = z.array(uuid).parse(serviceIds);
      let barberId = id;
      if (id) {
        uuid.parse(id);
        check(await supabase.from("barbers").update(d).eq("id", id));
      } else {
        const created = check(await supabase.from("barbers").insert(d).select("id").single()) as { id: string };
        barberId = created.id;
      }
      check(await supabase.from("barber_services").delete().eq("barber_id", barberId!));
      if (services.length) {
        check(await supabase.from("barber_services").insert(services.map((s) => ({ barber_id: barberId!, service_id: s }))));
      }
      refreshAll();
      return { id: barberId! };
    },
    { admin: true },
  );
}

export async function deleteBarber(id: string) {
  return withStaff(
    async ({ supabase }) => {
      uuid.parse(id);
      const { count } = await supabase.from("bookings").select("id", { count: "exact", head: true }).eq("barber_id", id);
      if (count) throw new UserError("Este barbero tiene reservas en su historial. Desactívalo para ocultarlo del sitio.");
      check(await supabase.from("barbers").delete().eq("id", id));
      refreshAll();
    },
    { admin: true },
  );
}

/** Reemplaza el horario semanal completo del barbero. */
export async function saveSchedule(barberId: string, ranges: { weekday: number; start_time: string; end_time: string }[]) {
  return withStaff(
    async ({ supabase }) => {
      uuid.parse(barberId);
      const rows = scheduleSchema.parse(ranges);
      // Validar solapamientos dentro del mismo día
      for (let wd = 0; wd < 7; wd++) {
        const day = rows.filter((r) => r.weekday === wd).sort((a, b) => a.start_time.localeCompare(b.start_time));
        for (let i = 1; i < day.length; i++) {
          if (day[i].start_time < day[i - 1].end_time) throw new UserError("Hay franjas que se solapan en un mismo día.");
        }
      }
      check(await supabase.from("barber_schedules").delete().eq("barber_id", barberId));
      if (rows.length) check(await supabase.from("barber_schedules").insert(rows.map((r) => ({ ...r, barber_id: barberId }))));
      refreshAll();
    },
    { admin: true },
  );
}

// ─── Bloqueos ───────────────────────────────────────────────────────────
export async function addBlock(input: z.input<typeof blockSchema>) {
  return withStaff(async ({ supabase, user }) => {
    const d = blockSchema.parse(input);
    const { timezone } = await getSettings();
    const starts_at = d.all_day ? zonedToUtcISO(d.date, "00:00", timezone) : zonedToUtcISO(d.date, d.start, timezone);
    const ends_at = d.all_day ? zonedToUtcISO(addDays(d.date, 1), "00:00", timezone) : zonedToUtcISO(d.date, d.end, timezone);
    check(
      await supabase.from("time_blocks").insert({ barber_id: d.barber_id, starts_at, ends_at, reason: d.reason, created_by: user.id }),
    );
    revalidatePath("/admin", "layout");
  });
}

export async function deleteBlock(id: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    check(await supabase.from("time_blocks").delete().eq("id", id));
    revalidatePath("/admin", "layout");
  });
}
