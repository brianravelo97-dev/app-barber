"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, withStaff } from "@/lib/actions";
import { couponSchema, promotionSchema } from "@/lib/validation";

const uuid = z.guid();

export async function saveCoupon(id: string | null, input: z.input<typeof couponSchema>) {
  return withStaff(
    async ({ supabase }) => {
      const d = couponSchema.parse(input);
      if (id) check(await supabase.from("coupons").update(d).eq("id", uuid.parse(id)));
      else check(await supabase.from("coupons").insert(d));
      revalidatePath("/admin/cupones");
    },
    { admin: true },
  );
}

export async function deleteCoupon(id: string) {
  return withStaff(
    async ({ supabase }) => {
      check(await supabase.from("coupons").delete().eq("id", uuid.parse(id)));
      revalidatePath("/admin/cupones");
    },
    { admin: true },
  );
}

export async function savePromotion(id: string | null, input: z.input<typeof promotionSchema>) {
  return withStaff(
    async ({ supabase }) => {
      const d = promotionSchema.parse(input);
      if (id) check(await supabase.from("promotions").update(d).eq("id", uuid.parse(id)));
      else check(await supabase.from("promotions").insert(d));
      revalidatePath("/", "layout");
    },
    { admin: true },
  );
}

export async function deletePromotion(id: string) {
  return withStaff(
    async ({ supabase }) => {
      check(await supabase.from("promotions").delete().eq("id", uuid.parse(id)));
      revalidatePath("/", "layout");
    },
    { admin: true },
  );
}

export async function moderateReview(id: string, approved: boolean) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("reviews").update({ is_approved: approved }).eq("id", uuid.parse(id)));
    revalidatePath("/", "layout");
  });
}

export async function deleteReview(id: string) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("reviews").delete().eq("id", uuid.parse(id)));
    revalidatePath("/", "layout");
  });
}

export async function setWaitlistStatus(id: string, status: "waiting" | "contacted" | "booked" | "discarded") {
  return withStaff(async ({ supabase }) => {
    z.enum(["waiting", "contacted", "booked", "discarded"]).parse(status);
    check(await supabase.from("waitlist").update({ status }).eq("id", uuid.parse(id)));
    revalidatePath("/admin/lista-espera");
  });
}
