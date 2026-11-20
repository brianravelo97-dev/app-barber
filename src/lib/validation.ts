import { z } from "zod";

const uuid = z.guid("Identificador inválido");
const dateStr = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha inválida");
const timeStr = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Hora inválida");
const phone = z
  .string()
  .trim()
  .refine((v) => {
    const d = v.replace(/[^0-9]/g, "");
    return d.length >= 8 && d.length <= 15;
  }, "Ingresa un teléfono válido con código de país");
const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .optional()
  .nullable()
  .transform((v) => (v ? v : null))
  .refine((v) => v === null || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Correo inválido");
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const availabilitySchema = z.object({
  service: uuid,
  date: dateStr,
  barber: uuid.optional().nullable(),
});

export const createBookingSchema = z.object({
  serviceId: uuid,
  barberId: uuid.optional().nullable(),
  startsAt: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(2, "Ingresa tu nombre").max(80),
  phone,
  email: optionalEmail,
  notes: optionalText(500),
  coupon: optionalText(30),
  website: z.string().max(0).optional(), // honeypot anti-bots
});

export const cancelBookingSchema = z.object({ code: z.string().trim().min(4).max(12), phone });

export const waitlistSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone,
  email: optionalEmail,
  serviceId: uuid.optional().nullable(),
  barberId: uuid.optional().nullable(),
  date: dateStr,
  timeFrom: timeStr.optional().nullable(),
  timeTo: timeStr.optional().nullable(),
  notes: optionalText(500),
});

export const reviewSchema = z.object({
  name: z.string().trim().min(2).max(80),
  rating: z.coerce.number().int().min(1).max(5),
  comment: optionalText(1000),
  code: optionalText(12),
});

export const serviceSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(80),
  description: optionalText(600),
  category: optionalText(40),
  price: z.coerce.number().min(0, "Precio inválido").max(100_000_000),
  duration_min: z.coerce.number().int().min(5, "Mínimo 5 minutos").max(480),
  image_url: optionalText(1000),
  is_active: z.boolean(),
  is_featured: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const barberSchema = z.object({
  name: z.string().trim().min(2, "Nombre requerido").max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(60)
    .regex(/^[a-z0-9-]+$/, "Solo minúsculas, números y guiones"),
  role_title: optionalText(60),
  bio: optionalText(800),
  specialties: z.array(z.string().trim().min(1).max(40)).max(12),
  years_experience: z.coerce.number().int().min(0).max(80).nullable(),
  photo_url: optionalText(1000),
  instagram: optionalText(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color inválido"),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const scheduleSchema = z.array(
  z
    .object({ weekday: z.number().int().min(0).max(6), start_time: timeStr, end_time: timeStr })
    .refine((r) => r.end_time > r.start_time, "La hora de término debe ser posterior al inicio"),
);

export const blockSchema = z
  .object({
    barber_id: uuid.nullable(),
    date: dateStr,
    start: timeStr,
    end: timeStr,
    reason: optionalText(120),
    all_day: z.boolean().optional(),
  })
  .refine((b) => b.all_day || b.end > b.start, "La hora de término debe ser posterior al inicio");

export const couponSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{3,30}$/, "3–30 caracteres: letras, números, guiones"),
  description: optionalText(200),
  discount_type: z.enum(["percent", "fixed"]),
  value: z.coerce.number().positive("Debe ser mayor que 0"),
  min_amount: z.coerce.number().min(0).default(0),
  starts_on: dateStr.nullable().optional(),
  ends_on: dateStr.nullable().optional(),
  max_uses: z.coerce.number().int().positive().nullable().optional(),
  is_active: z.boolean(),
});

export const promotionSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: optionalText(300),
  badge: optionalText(24),
  image_url: optionalText(1000),
  coupon_code: optionalText(30),
  service_id: uuid.nullable().optional(),
  starts_on: dateStr.nullable().optional(),
  ends_on: dateStr.nullable().optional(),
  is_active: z.boolean(),
  sort_order: z.coerce.number().int().min(0).max(9999),
});

export const settingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: optionalText(120),
  description: optionalText(1200),
  logo_url: optionalText(1000),
  hero_image_url: optionalText(1000),
  address: optionalText(200),
  city: optionalText(100),
  map_query: optionalText(200),
  phone: optionalText(30),
  whatsapp: optionalText(30),
  email: optionalEmail,
  instagram: optionalText(100),
  timezone: z.string().trim().min(3).max(60),
  currency: z.string().trim().length(3).toUpperCase(),
  locale: z.string().trim().min(2).max(10),
});

export const bookingRulesSchema = z.object({
  slot_interval_min: z.coerce.number().int().min(5).max(120),
  min_notice_min: z.coerce.number().int().min(0).max(10080),
  max_advance_days: z.coerce.number().int().min(1).max(365),
  auto_confirm: z.boolean(),
  cancellation_policy: optionalText(1000),
  cancellation_window_hours: z.coerce.number().int().min(0).max(168),
  reminder_hours_before: z.coerce.number().int().min(1).max(168),
});

export const featuresSchema = z.object({
  features: z.object({
    coupons: z.boolean(),
    promotions: z.boolean(),
    loyalty: z.boolean(),
    waitlist: z.boolean(),
    reviews: z.boolean(),
    qr: z.boolean(),
  }),
  loyalty_points_per_visit: z.coerce.number().int().min(0).max(10000),
  loyalty_reward_threshold: z.coerce.number().int().min(1).max(1_000_000),
  loyalty_reward_description: optionalText(120),
});

export const hoursSchema = z.array(
  z
    .object({ weekday: z.number().int().min(0).max(6), is_open: z.boolean(), open_time: timeStr, close_time: timeStr })
    .refine((h) => h.close_time > h.open_time, "El cierre debe ser posterior a la apertura"),
);

export const paymentSchema = z.object({
  amount: z.coerce.number().min(0).max(100_000_000),
  method: z.enum(["cash", "card", "transfer", "other"]),
  notes: optionalText(200),
});

export function firstIssue(err: z.ZodError) {
  return err.issues[0]?.message ?? "Datos inválidos";
}
