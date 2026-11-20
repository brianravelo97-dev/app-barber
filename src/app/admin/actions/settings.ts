"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { check, UserError, withStaff } from "@/lib/actions";
import { createServiceClient } from "@/lib/supabase/service";
import { bookingRulesSchema, featuresSchema, hoursSchema, settingsSchema } from "@/lib/validation";

const uuid = z.guid();
const ADMIN = { admin: true } as const;

function refreshAll() {
  revalidatePath("/", "layout");
}

function validTimezone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export async function saveBusiness(input: z.input<typeof settingsSchema>) {
  return withStaff(async ({ supabase }) => {
    const d = settingsSchema.parse(input);
    if (!validTimezone(d.timezone)) throw new UserError("Zona horaria inválida (ej: America/Santiago).");
    check(await supabase.from("business_settings").update({ ...d, setup_completed: true }).eq("id", 1));
    refreshAll();
  }, ADMIN);
}

export async function saveBookingRules(input: z.input<typeof bookingRulesSchema>) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("business_settings").update(bookingRulesSchema.parse(input)).eq("id", 1));
    refreshAll();
  }, ADMIN);
}

export async function saveFeatures(input: z.input<typeof featuresSchema>) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("business_settings").update(featuresSchema.parse(input)).eq("id", 1));
    refreshAll();
  }, ADMIN);
}

export async function saveHours(input: z.input<typeof hoursSchema>) {
  return withStaff(async ({ supabase }) => {
    const rows = hoursSchema.parse(input);
    check(await supabase.from("business_hours").upsert(rows, { onConflict: "weekday" }));
    refreshAll();
  }, ADMIN);
}

export async function addHoliday(date: string, name: string) {
  return withStaff(async ({ supabase }) => {
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(date);
    const n = z.string().trim().min(2).max(80).parse(name);
    check(await supabase.from("holidays").insert({ date, name: n }));
    refreshAll();
  }, ADMIN);
}

export async function deleteHoliday(id: string) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("holidays").delete().eq("id", uuid.parse(id)));
    refreshAll();
  }, ADMIN);
}

export async function addGalleryImage(url: string, caption: string) {
  return withStaff(async ({ supabase }) => {
    const u = z.url().max(1000).parse(url);
    const { count } = await supabase.from("gallery_images").select("id", { count: "exact", head: true });
    check(await supabase.from("gallery_images").insert({ image_url: u, caption: caption.trim().slice(0, 80) || null, sort_order: (count ?? 0) + 1 }));
    refreshAll();
  }, ADMIN);
}

export async function updateGalleryImage(id: string, caption: string, sort_order: number) {
  return withStaff(async ({ supabase }) => {
    check(
      await supabase
        .from("gallery_images")
        .update({ caption: caption.trim().slice(0, 80) || null, sort_order: z.number().int().min(0).max(999).parse(sort_order) })
        .eq("id", uuid.parse(id)),
    );
    refreshAll();
  }, ADMIN);
}

export async function deleteGalleryImage(id: string) {
  return withStaff(async ({ supabase }) => {
    check(await supabase.from("gallery_images").delete().eq("id", uuid.parse(id)));
    refreshAll();
  }, ADMIN);
}

// ─── Usuarios del panel ─────────────────────────────────────────────────
export async function setUserRole(id: string, role: "admin" | "staff" | "none") {
  return withStaff(async ({ supabase, user }) => {
    uuid.parse(id);
    z.enum(["admin", "staff", "none"]).parse(role);
    if (id === user.id && role !== "admin") throw new UserError("No puedes quitarte tu propio rol de administrador.");
    check(await supabase.rpc("set_user_role", { p_user_id: id, p_role: role }));
    revalidatePath("/admin/configuracion");
  }, ADMIN);
}

export async function createPanelUser(input: { email: string; password: string; full_name: string; role: "admin" | "staff" }) {
  return withStaff(async () => {
    const d = z
      .object({
        email: z.email("Correo inválido"),
        password: z.string().min(10, "La contraseña debe tener al menos 10 caracteres"),
        full_name: z.string().trim().min(2).max(80),
        role: z.enum(["admin", "staff"]),
      })
      .parse(input);
    const sb = createServiceClient();
    if (!sb) throw new UserError("Falta SUPABASE_SERVICE_ROLE_KEY para crear usuarios. También puedes invitarlos desde el panel de Supabase.");
    const { data, error } = await sb.auth.admin.createUser({
      email: d.email,
      password: d.password,
      email_confirm: true,
      user_metadata: { full_name: d.full_name },
    });
    if (error) throw new UserError(error.message);
    // El trigger crea el perfil; se asegura el rol.
    check(await sb.from("profiles").upsert({ id: data.user.id, email: d.email, full_name: d.full_name, role: d.role }));
    revalidatePath("/admin/configuracion");
  }, ADMIN);
}
