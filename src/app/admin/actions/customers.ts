"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, UserError, withStaff } from "@/lib/actions";
import { getSettings } from "@/lib/data";
import { paymentSchema } from "@/lib/validation";

const uuid = z.guid();

const customerSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  email: z
    .string()
    .trim()
    .max(120)
    .transform((v) => v || null)
    .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Correo inválido"),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => v || null),
});

export async function updateCustomer(id: string, input: z.input<typeof customerSchema>) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    check(await supabase.from("customers").update(customerSchema.parse(input)).eq("id", id));
    revalidatePath(`/admin/clientes/${id}`);
  });
}

/** Canjea la recompensa de fidelización (descuenta los puntos del umbral). */
export async function redeemReward(id: string) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    const s = await getSettings();
    if (!s.features.loyalty) throw new UserError("El programa de fidelización está desactivado.");
    const c = check(await supabase.from("customers").select("loyalty_points").eq("id", id).single());
    if (c.loyalty_points < s.loyalty_reward_threshold) throw new UserError("El cliente aún no tiene puntos suficientes.");
    check(await supabase.from("customers").update({ loyalty_points: c.loyalty_points - s.loyalty_reward_threshold }).eq("id", id));
    revalidatePath(`/admin/clientes/${id}`);
  });
}

export async function adjustPoints(id: string, delta: number) {
  return withStaff(async ({ supabase }) => {
    uuid.parse(id);
    const d = z.number().int().min(-100000).max(100000).parse(delta);
    const c = check(await supabase.from("customers").select("loyalty_points").eq("id", id).single());
    check(await supabase.from("customers").update({ loyalty_points: Math.max(0, c.loyalty_points + d) }).eq("id", id));
    revalidatePath(`/admin/clientes/${id}`);
  });
}

// ─── Pagos ──────────────────────────────────────────────────────────────
export async function addPayment(input: { amount: number; method: string; notes?: string | null; customer_id?: string | null }) {
  return withStaff(async ({ supabase, user }) => {
    const p = paymentSchema.parse(input);
    if (p.amount <= 0) throw new UserError("El monto debe ser mayor que 0.");
    const customer_id = input.customer_id ? uuid.parse(input.customer_id) : null;
    check(await supabase.from("payments").insert({ ...p, customer_id, created_by: user.id }));
    revalidatePath("/admin", "layout");
  });
}

export async function deletePayment(id: string) {
  return withStaff(
    async ({ supabase }) => {
      uuid.parse(id);
      check(await supabase.from("payments").delete().eq("id", id));
      revalidatePath("/admin", "layout");
    },
    { admin: true },
  );
}
