export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
export type PaymentMethod = "cash" | "card" | "transfer" | "other";
export type Role = "admin" | "staff" | "none";

export type Features = {
  coupons: boolean;
  promotions: boolean;
  loyalty: boolean;
  waitlist: boolean;
  reviews: boolean;
  qr: boolean;
};

export type BusinessSettings = {
  id: number;
  name: string;
  tagline: string | null;
  description: string | null;
  logo_url: string | null;
  hero_image_url: string | null;
  address: string | null;
  city: string | null;
  map_query: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  timezone: string;
  currency: string;
  locale: string;
  slot_interval_min: number;
  min_notice_min: number;
  max_advance_days: number;
  auto_confirm: boolean;
  cancellation_policy: string | null;
  cancellation_window_hours: number;
  reminder_hours_before: number;
  features: Features;
  loyalty_points_per_visit: number;
  loyalty_reward_threshold: number;
  loyalty_reward_description: string | null;
  setup_completed: boolean;
  updated_at: string;
};

export type BusinessHour = {
  weekday: number;
  is_open: boolean;
  open_time: string;
  close_time: string;
};

export type Holiday = { id: string; date: string; name: string };

export type Service = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  duration_min: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
};

export type Barber = {
  id: string;
  name: string;
  slug: string;
  role_title: string | null;
  bio: string | null;
  specialties: string[];
  years_experience: number | null;
  photo_url: string | null;
  instagram: string | null;
  color: string;
  is_active: boolean;
  sort_order: number;
};

export type BarberSchedule = {
  id: string;
  barber_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
};

export type TimeBlock = {
  id: string;
  barber_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
};

export type Customer = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  notes: string | null;
  loyalty_points: number;
  total_visits: number;
  created_at: string;
};

export type CustomerOverview = Customer & {
  last_visit_at: string | null;
  bookings_count: number;
  no_show_count: number;
  total_spent: number;
};

export type Booking = {
  id: string;
  code: string;
  customer_id: string;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: BookingStatus;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_name: string;
  price: number;
  discount: number;
  total: number;
  coupon_id: string | null;
  notes: string | null;
  source: "web" | "admin" | "walk_in";
  cancel_reason: string | null;
  reminder_sent_at: string | null;
  created_at: string;
};

export type Payment = {
  id: string;
  booking_id: string | null;
  customer_id: string | null;
  amount: number;
  method: PaymentMethod;
  notes: string | null;
  paid_at: string;
};

export type Coupon = {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percent" | "fixed";
  value: number;
  min_amount: number;
  starts_on: string | null;
  ends_on: string | null;
  max_uses: number | null;
  used_count: number;
  is_active: boolean;
};

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  badge: string | null;
  image_url: string | null;
  coupon_code: string | null;
  service_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Review = {
  id: string;
  booking_id: string | null;
  barber_id: string | null;
  customer_name: string;
  rating: number;
  comment: string | null;
  is_approved: boolean;
  is_verified: boolean;
  created_at: string;
};

export type WaitlistEntry = {
  id: string;
  customer_name: string;
  phone: string;
  email: string | null;
  service_id: string | null;
  barber_id: string | null;
  desired_date: string;
  time_from: string | null;
  time_to: string | null;
  notes: string | null;
  status: "waiting" | "contacted" | "booked" | "discarded";
  created_at: string;
};

export type GalleryImage = { id: string; image_url: string; caption: string | null; sort_order: number };

export type NotificationLog = {
  id: string;
  booking_id: string | null;
  channel: "email" | "whatsapp";
  type: "confirmation" | "reminder" | "cancellation" | "reschedule" | "waitlist";
  recipient: string;
  status: "sent" | "failed" | "not_configured";
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
};

export type Profile = { id: string; email: string | null; full_name: string | null; role: Role; created_at: string };

export type PublicBooking = {
  code: string;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  customer_name: string;
  service_name: string;
  barber_name: string;
  barber_photo: string | null;
  price: number;
  discount: number;
  total: number;
};

export type ActionResult<T = undefined> = { ok: true; data?: T; message?: string } | { ok: false; error: string };

export const DEFAULT_FEATURES: Features = {
  coupons: true,
  promotions: true,
  loyalty: true,
  waitlist: true,
  reviews: true,
  qr: true,
};
