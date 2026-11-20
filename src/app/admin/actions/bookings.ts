"use server";

import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, UserError, withStaff } from "@/lib/actions";
import { notifyBooking } from "@/lib/notifications";
import type { BookingStatus, PaymentMethod } from "@/lib/types";
import { paymentSchema } from "@/lib/validation";

const uuid = z.guid();

function refresh() {
  revalidatePath("/admin", "layout");
}

export async function setBookingStatus(id: string, status: BookingStatus, reason?: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    if (!["pending", "confirmed", "cancelled", "no_show"].includes(status)) throw new UserError("Estado inválido");
    const { data: prev } = await supabase.from("bookings").select("status").eq("id", id).single();
    check(
      await supabase
        .from("bookings")
        .update({ status, ...(status === "cancelled" ? { cancel_reason: reason?.slice(0, 200) || "Cancelada por el local" } : {}) })
        .eq("id", id),
    );
    if (status === "cancelled" && prev?.status !== "cancelled") after(() => notifyBooking(id, "cancellation"));
    if (status === "confirmed" && prev?.status === "pending") after(() => notifyBooking(id, "confirmation"));
    refresh();
  });
}

/** Marca como atendido y registra el pago en una sola operación. */
export async function completeBooking(id: string, payment: { amount: number; method: PaymentMethod; notes?: string | null }) {
  return withStaff(async ({ supabase, user }) => {
    uuid.parse(id);
    const p = paymentSchema.parse(payment);
    const booking = check(await supabase.from("bookings").select("id, status, customer_id").eq("id", id).single());
    if (booking.status === "cancelled") throw new UserError("La reserva está cancelada.");
    if (booking.status !== "completed") {
      check(await supabase.from("bookings").update({ status: "completed" }).eq("id", id));
    }
    const { count } = await supabase.from("payments").select("id", { count: "exact", head: true }).eq("booking_id", id);
    if (!count && p.amount > 0) {
      check(
        await supabase.from("payments").insert({
          booking_id: id,
          customer_id: booking.customer_id,
          amount: p.amount,
          method: p.method,
          notes: p.notes,
          created_by: user.id,
        }),
      );
    }
    refresh();
  });
}

/** Revierte "atendido" (p. ej. marcado por error): elimina el pago asociado. */
export async function revertCompleted(id: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    check(await supabase.from("payments").delete().eq("booking_id", id));
    check(await supabase.from("bookings").update({ status: "confirmed" }).eq("id", id));
    refresh();
  });
}

export async function rescheduleBooking(id: string, startsAt: string, barberId: string | null, force = false) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    z.iso.datetime({ offset: true }).parse(startsAt);
    if (barberId) uuid.parse(barberId);
    check(
      await supabase.rpc("reschedule_booking", {
        p_booking_id: id,
        p_starts_at: startsAt,
        p_barber_id: barberId,
        p_force: force,
      }),
    );
    after(() => notifyBooking(id, "reschedule"));
    refresh();
  });
}

/** Horas libres para reprogramar (ignora la propia reserva) o crear una reserva desde el panel. */
export async function getAdminSlots(serviceId: string, date: string, barberId: string | null, ignoreBookingId?: string | null) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(serviceId);
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date);
    const rows = check(
      await supabase.rpc("get_available_slots", {
        p_service_id: serviceId,
        p_date: date,
        p_barber_id: barberId,
        p_ignore_booking: ignoreBookingId ?? null,
      }),
    ) as { barber_id: string; slot_start: string }[];
    const map = new Map<string, string[]>();
    for (const r of rows ?? []) {
      const k = new Date(r.slot_start).toISOString();
      map.set(k, [...(map.get(k) ?? []), r.barber_id]);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([start, barbers]) => ({ start, barbers }));
  });
}

const adminBookingSchema = z.object({
  serviceId: uuid,
  barberId: uuid.nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2).max(80),
  phone: z.string().trim().min(8).max(25),
  email: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  force: z.boolean().default(false),
  walkIn: z.boolean().default(false),
});

export async function createAdminBooking(input: z.input<typeof adminBookingSchema>) {
  return withStaff(async ({ supabase }) => {
    const d = adminBookingSchema.parse(input);
    const res = check(
      await supabase.rpc("create_booking", {
        p_service_id: d.serviceId,
        p_starts_at: d.startsAt,
        p_customer_name: d.name,
        p_customer_phone: d.phone,
        p_customer_email: d.email || null,
        p_barber_id: d.barberId,
        p_notes: d.notes || null,
        p_coupon_code: null,
        p_force: d.force,
        p_source: d.walkIn ? "walk_in" : "admin",
      }),
    ) as { id: string; code: string };
    if (!d.walkIn) after(() => notifyBooking(res.id, "confirmation"));
    refresh();
    return res;
  });
}

export async function updateBookingNotes(id: string, notes: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    check(await supabase.from("bookings").update({ notes: notes.trim().slice(0, 500) || null }).eq("id", id));
    refresh();
  });
}

/** Reenvía manualmente un recordatorio (útil si el cron no está configurado). */
export async function sendReminderNow(id: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    await notifyBooking(id, "reminder");
    await supabase.from("bookings").update({ reminder_sent_at: new Date().toISOString() }).eq("id", id);
    refresh();
  });
}
