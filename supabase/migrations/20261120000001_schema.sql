-- =====================================================================
--  ONYX BARBER STUDIO — Esquema principal
--  Base de datos: PostgreSQL (Supabase)
--
--  Garantías clave:
--   * Ninguna reserva activa puede solaparse con otra del mismo barbero
--     (EXCLUDE constraint con btree_gist + rangos tstzrange).
--   * Toda reserva pública pasa por la función create_booking(), que
--     valida horario laboral, festivos, bloqueos, antelación mínima y
--     disponibilidad dentro de una transacción con advisory lock.
--   * Row Level Security en todas las tablas.
-- =====================================================================

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
do $$ begin
  create type public.booking_status as enum ('pending','confirmed','completed','cancelled','no_show');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('percent','fixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('cash','card','transfer','other');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- Usuarios del panel (perfil asociado a auth.users)
-- role: 'admin' (todo), 'staff' (reservas/clientes), 'none' (sin acceso)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'none' check (role in ('admin','staff','none')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','staff'));
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------
-- Configuración del negocio (fila única id = 1)
-- ---------------------------------------------------------------------
create table if not exists public.business_settings (
  id smallint primary key default 1 check (id = 1),
  name text not null default 'Mi Barbería',
  tagline text,
  description text,
  logo_url text,
  hero_image_url text,
  address text,
  city text,
  map_query text,
  phone text,
  whatsapp text,
  email text,
  instagram text,
  timezone text not null default 'America/Santiago',
  currency text not null default 'CLP',
  locale text not null default 'es-CL',
  slot_interval_min int not null default 15 check (slot_interval_min between 5 and 120),
  min_notice_min int not null default 60 check (min_notice_min >= 0),
  max_advance_days int not null default 60 check (max_advance_days between 1 and 365),
  auto_confirm boolean not null default false,
  cancellation_policy text,
  cancellation_window_hours int not null default 3 check (cancellation_window_hours >= 0),
  reminder_hours_before int not null default 24 check (reminder_hours_before between 1 and 168),
  features jsonb not null default '{"coupons":true,"promotions":true,"loyalty":true,"waitlist":true,"reviews":true,"qr":true}'::jsonb,
  loyalty_points_per_visit int not null default 10 check (loyalty_points_per_visit >= 0),
  loyalty_reward_threshold int not null default 100 check (loyalty_reward_threshold > 0),
  loyalty_reward_description text default 'Corte gratis',
  setup_completed boolean not null default false,
  updated_at timestamptz not null default now()
);

-- Horario general de atención (0 = domingo … 6 = sábado)
create table if not exists public.business_hours (
  weekday smallint primary key check (weekday between 0 and 6),
  is_open boolean not null default true,
  open_time time not null default '10:00',
  close_time time not null default '20:00',
  check (close_time > open_time)
);

create table if not exists public.holidays (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Catálogo
-- ---------------------------------------------------------------------
create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  description text,
  category text,
  price numeric(12,2) not null check (price >= 0),
  duration_min int not null check (duration_min between 5 and 480),
  image_url text,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barbers (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  role_title text,
  bio text,
  specialties text[] not null default '{}',
  years_experience int check (years_experience is null or years_experience between 0 and 80),
  photo_url text,
  instagram text,
  color text not null default '#C8A165',
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.barber_services (
  barber_id uuid not null references public.barbers(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  primary key (barber_id, service_id)
);

-- Turnos semanales del barbero. Varias franjas por día (p. ej. turno partido).
-- Un día sin franjas = día de descanso.
create table if not exists public.barber_schedules (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);
create index if not exists barber_schedules_barber_idx on public.barber_schedules (barber_id, weekday);

-- Bloqueos puntuales (descansos, vacaciones, trámites). barber_id NULL = toda la barbería.
create table if not exists public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid references public.barbers(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists time_blocks_range_idx on public.time_blocks using gist (tstzrange(starts_at, ends_at, '[)'));

-- ---------------------------------------------------------------------
-- Clientes
-- ---------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text not null unique,
  email text,
  notes text,
  loyalty_points int not null default 0 check (loyalty_points >= 0),
  total_visits int not null default 0 check (total_visits >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Cupones y promociones
-- ---------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  description text,
  discount_type public.discount_type not null,
  value numeric(12,2) not null check (value > 0),
  min_amount numeric(12,2) not null default 0,
  starts_on date,
  ends_on date,
  max_uses int check (max_uses is null or max_uses > 0),
  used_count int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check (discount_type <> 'percent' or value <= 100)
);

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  badge text,
  image_url text,
  coupon_code text,
  service_id uuid references public.services(id) on delete set null,
  starts_on date,
  ends_on date,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Reservas
-- ---------------------------------------------------------------------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  barber_id uuid not null references public.barbers(id) on delete restrict,
  service_id uuid not null references public.services(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.booking_status not null default 'pending',
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  service_name text not null,
  price numeric(12,2) not null,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  coupon_id uuid references public.coupons(id) on delete set null,
  notes text,
  source text not null default 'web' check (source in ('web','admin','walk_in')),
  cancel_reason text,
  loyalty_points_awarded int not null default 0,
  reminder_sent_at timestamptz,
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  -- Garantía a nivel de base de datos: un barbero no puede tener dos reservas activas solapadas.
  constraint bookings_no_overlap exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('pending','confirmed','completed'))
);
create index if not exists bookings_starts_idx on public.bookings (starts_at);
create index if not exists bookings_customer_idx on public.bookings (customer_id);
create index if not exists bookings_barber_idx on public.bookings (barber_id, starts_at);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  method public.payment_method not null default 'cash',
  notes text,
  paid_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists payments_paid_idx on public.payments (paid_at);

-- ---------------------------------------------------------------------
-- Lista de espera, reseñas, galería, notificaciones
-- ---------------------------------------------------------------------
create table if not exists public.waitlist (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  phone text not null,
  email text,
  service_id uuid references public.services(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  desired_date date not null,
  time_from time,
  time_to time,
  notes text,
  status text not null default 'waiting' check (status in ('waiting','contacted','booked','discarded')),
  created_at timestamptz not null default now()
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete set null,
  barber_id uuid references public.barbers(id) on delete set null,
  customer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  is_approved boolean not null default false,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  caption text,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.bookings(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  type text not null check (type in ('confirmation','reminder','cancellation','reschedule','waitlist')),
  recipient text not null,
  status text not null check (status in ('sent','failed','not_configured')),
  provider_message_id text,
  error text,
  created_at timestamptz not null default now()
);
create index if not exists notifications_booking_idx on public.notifications (booking_id);

-- ---------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------
create or replace function public.normalize_phone(p text)
returns text language plpgsql immutable as $$
declare d text;
begin
  if p is null then return null; end if;
  d := regexp_replace(p, '[^0-9]', '', 'g');
  if char_length(d) < 8 or char_length(d) > 15 then return null; end if;
  return '+' || d;
end $$;

create or replace function public.gen_booking_code()
returns text language plpgsql volatile set search_path = public as $$
declare
  chars constant text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  bytes bytea;
  r text;
  i int;
begin
  loop
    bytes := gen_random_bytes(6);
    r := '';
    for i in 0..5 loop
      r := r || substr(chars, 1 + (get_byte(bytes, i) % length(chars)), 1);
    end loop;
    exit when not exists (select 1 from public.bookings where code = r);
  end loop;
  return r;
end $$;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists services_touch on public.services;
create trigger services_touch before update on public.services for each row execute function public.touch_updated_at();
drop trigger if exists barbers_touch on public.barbers;
create trigger barbers_touch before update on public.barbers for each row execute function public.touch_updated_at();
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers for each row execute function public.touch_updated_at();
drop trigger if exists settings_touch on public.business_settings;
create trigger settings_touch before update on public.business_settings for each row execute function public.touch_updated_at();

-- Cambios de estado: marcas de tiempo, puntos de fidelización y cupones.
create or replace function public.booking_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  v_points int := 0;
begin
  new.updated_at := now();
  if new.status is distinct from old.status then
    select * into s from public.business_settings where id = 1;

    if new.status = 'confirmed' and new.confirmed_at is null then
      new.confirmed_at := now();
    end if;

    if new.status = 'cancelled' then
      new.cancelled_at := now();
      if new.coupon_id is not null and old.status <> 'cancelled' then
        update public.coupons set used_count = greatest(used_count - 1, 0) where id = new.coupon_id;
      end if;
    end if;

    if new.status = 'completed' then
      new.completed_at := now();
      if coalesce((s.features->>'loyalty')::boolean, false) then
        v_points := s.loyalty_points_per_visit;
      end if;
      new.loyalty_points_awarded := v_points;
      update public.customers
        set total_visits = total_visits + 1,
            loyalty_points = loyalty_points + v_points
        where id = new.customer_id;
    elsif old.status = 'completed' then
      update public.customers
        set total_visits = greatest(total_visits - 1, 0),
            loyalty_points = greatest(loyalty_points - old.loyalty_points_awarded, 0)
        where id = new.customer_id;
      new.loyalty_points_awarded := 0;
      new.completed_at := null;
    end if;
  end if;
  return new;
end $$;

drop trigger if exists bookings_status_change on public.bookings;
create trigger bookings_status_change before update on public.bookings
  for each row execute function public.booking_status_change();

-- ---------------------------------------------------------------------
-- Disponibilidad
-- Devuelve los inicios de franja libres para un servicio en una fecha
-- (fecha local del negocio). Considera: servicio activo, barberos que lo
-- realizan, horario del barbero ∩ horario del local, festivos, bloqueos,
-- reservas activas, antelación mínima y máxima.
-- ---------------------------------------------------------------------
create or replace function public.get_available_slots(
  p_service_id uuid,
  p_date date,
  p_barber_id uuid default null,
  p_ignore_booking uuid default null
)
returns table (barber_id uuid, slot_start timestamptz, slot_end timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  s public.business_settings%rowtype;
  bh public.business_hours%rowtype;
  v_duration int;
  v_weekday int;
  v_today date;
  v_dur interval;
begin
  select * into s from public.business_settings where id = 1;
  if not found then return; end if;

  select sv.duration_min into v_duration from public.services sv where sv.id = p_service_id and sv.is_active;
  if v_duration is null then return; end if;
  v_dur := make_interval(mins => v_duration);

  v_today := (now() at time zone s.timezone)::date;
  if p_date < v_today or p_date > v_today + s.max_advance_days then return; end if;
  if exists (select 1 from public.holidays h where h.date = p_date) then return; end if;

  v_weekday := extract(dow from p_date)::int;
  select * into bh from public.business_hours where weekday = v_weekday;
  if not found or not bh.is_open then return; end if;

  return query
  with ranges as (
    select b.id as bid,
           greatest(sc.start_time, bh.open_time) as rs,
           least(sc.end_time, bh.close_time) as re
    from public.barbers b
    join public.barber_schedules sc on sc.barber_id = b.id and sc.weekday = v_weekday
    where b.is_active
      and (p_barber_id is null or b.id = p_barber_id)
      and exists (select 1 from public.barber_services bs where bs.barber_id = b.id and bs.service_id = p_service_id)
  ),
  candidates as (
    select r.bid, (gs at time zone s.timezone) as st
    from ranges r
    cross join lateral generate_series(
      (p_date + r.rs)::timestamp,
      (p_date + r.re)::timestamp - v_dur,
      make_interval(mins => s.slot_interval_min)
    ) gs
    where r.re > r.rs
  )
  select distinct c.bid, c.st, c.st + v_dur
  from candidates c
  where c.st >= now() + make_interval(mins => s.min_notice_min)
    and not exists (
      select 1 from public.bookings bk
      where bk.barber_id = c.bid
        and bk.status in ('pending','confirmed','completed')
        and (p_ignore_booking is null or bk.id <> p_ignore_booking)
        and tstzrange(bk.starts_at, bk.ends_at, '[)') && tstzrange(c.st, c.st + v_dur, '[)')
    )
    and not exists (
      select 1 from public.time_blocks tb
      where (tb.barber_id is null or tb.barber_id = c.bid)
        and tstzrange(tb.starts_at, tb.ends_at, '[)') && tstzrange(c.st, c.st + v_dur, '[)')
    )
  order by 2, 1;
end $$;

-- Próximas horas libres de un barbero (para su perfil público).
create or replace function public.barber_next_slots(p_barber_id uuid, p_limit int default 6)
returns table (slot_start timestamptz)
language plpgsql stable security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  v_service uuid;
  v_day date;
  v_found int := 0;
  r record;
begin
  select * into s from public.business_settings where id = 1;
  select sv.id into v_service
    from public.services sv
    join public.barber_services bs on bs.service_id = sv.id and bs.barber_id = p_barber_id
    where sv.is_active order by sv.duration_min asc limit 1;
  if v_service is null then return; end if;

  v_day := (now() at time zone s.timezone)::date;
  for i in 0..least(s.max_advance_days, 21) loop
    for r in select a.slot_start from public.get_available_slots(v_service, v_day + i, p_barber_id) a loop
      slot_start := r.slot_start;
      return next;
      v_found := v_found + 1;
      exit when v_found >= p_limit;
    end loop;
    exit when v_found >= p_limit;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Creación de reservas (transaccional)
-- ---------------------------------------------------------------------
create or replace function public.create_booking(
  p_service_id uuid,
  p_starts_at timestamptz,
  p_customer_name text,
  p_customer_phone text,
  p_customer_email text default null,
  p_barber_id uuid default null,
  p_notes text default null,
  p_coupon_code text default null,
  p_force boolean default false,
  p_source text default 'web'
)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  v_service public.services%rowtype;
  v_coupon public.coupons%rowtype;
  v_booking public.bookings%rowtype;
  v_name text;
  v_phone text;
  v_email text;
  v_notes text;
  v_date date;
  v_barber uuid;
  v_customer uuid;
  v_discount numeric(12,2) := 0;
  v_staff boolean := public.is_staff();
  v_status public.booking_status;
  v_barber_name text;
begin
  if (p_force or p_source <> 'web') and not v_staff then
    raise exception 'FORBIDDEN';
  end if;

  v_name := btrim(coalesce(p_customer_name, ''));
  if char_length(v_name) < 2 or char_length(v_name) > 80 then raise exception 'INVALID_NAME'; end if;

  v_phone := public.normalize_phone(p_customer_phone);
  if v_phone is null then raise exception 'INVALID_PHONE'; end if;

  v_email := nullif(lower(btrim(coalesce(p_customer_email, ''))), '');
  if v_email is not null and (v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(v_email) > 120) then
    raise exception 'INVALID_EMAIL';
  end if;

  v_notes := nullif(btrim(coalesce(p_notes, '')), '');
  if v_notes is not null and char_length(v_notes) > 500 then raise exception 'INVALID_NOTES'; end if;

  select * into s from public.business_settings where id = 1;
  select * into v_service from public.services where id = p_service_id and is_active;
  if not found then raise exception 'INVALID_SERVICE'; end if;

  v_date := (p_starts_at at time zone s.timezone)::date;

  -- Serializa las reservas del mismo día: evita condiciones de carrera
  -- entre "comprobar disponibilidad" e "insertar".
  perform pg_advisory_xact_lock(hashtextextended('booking:' || v_date::text, 0));

  if not v_staff then
    if (select count(*) from public.bookings b
        where b.customer_phone = v_phone and b.status in ('pending','confirmed') and b.starts_at > now()) >= 3 then
      raise exception 'TOO_MANY_BOOKINGS';
    end if;
  end if;

  if p_force then
    if p_barber_id is null then raise exception 'BARBER_REQUIRED'; end if;
    v_barber := p_barber_id;
  else
    select a.barber_id into v_barber
    from public.get_available_slots(p_service_id, v_date, p_barber_id) a
    where a.slot_start = p_starts_at
    order by (
      select count(*) from public.bookings b2
      where b2.barber_id = a.barber_id
        and b2.status in ('pending','confirmed','completed')
        and (b2.starts_at at time zone s.timezone)::date = v_date
    ), random()
    limit 1;
    if v_barber is null then raise exception 'SLOT_UNAVAILABLE'; end if;
  end if;

  insert into public.customers (full_name, phone, email)
  values (v_name, v_phone, v_email)
  on conflict (phone) do update
    set full_name = excluded.full_name,
        email = coalesce(excluded.email, public.customers.email)
  returning id into v_customer;

  if nullif(btrim(coalesce(p_coupon_code, '')), '') is not null then
    if not coalesce((s.features->>'coupons')::boolean, false) then raise exception 'INVALID_COUPON'; end if;
    select * into v_coupon from public.coupons
      where code = upper(btrim(p_coupon_code)) for update;
    if not found
       or not v_coupon.is_active
       or (v_coupon.starts_on is not null and v_date < v_coupon.starts_on)
       or (v_coupon.ends_on is not null and v_date > v_coupon.ends_on)
       or (v_coupon.max_uses is not null and v_coupon.used_count >= v_coupon.max_uses)
       or v_service.price < v_coupon.min_amount then
      raise exception 'INVALID_COUPON';
    end if;
    if v_coupon.discount_type = 'percent' then
      v_discount := round(v_service.price * v_coupon.value / 100, 0);
    else
      v_discount := v_coupon.value;
    end if;
    v_discount := least(v_discount, v_service.price);
    update public.coupons set used_count = used_count + 1 where id = v_coupon.id;
  end if;

  v_status := case when s.auto_confirm or v_staff then 'confirmed'::public.booking_status else 'pending'::public.booking_status end;

  insert into public.bookings (
    code, customer_id, barber_id, service_id, starts_at, ends_at, status,
    customer_name, customer_phone, customer_email, service_name,
    price, discount, total, coupon_id, notes, source, confirmed_at
  ) values (
    public.gen_booking_code(), v_customer, v_barber, v_service.id,
    p_starts_at, p_starts_at + make_interval(mins => v_service.duration_min), v_status,
    v_name, v_phone, v_email, v_service.name,
    v_service.price, v_discount, v_service.price - v_discount, v_coupon.id, v_notes,
    case when p_source in ('web','admin','walk_in') then p_source else 'web' end,
    case when v_status = 'confirmed' then now() end
  ) returning * into v_booking;

  select name into v_barber_name from public.barbers where id = v_barber;

  return jsonb_build_object(
    'id', v_booking.id,
    'code', v_booking.code,
    'status', v_booking.status,
    'starts_at', v_booking.starts_at,
    'ends_at', v_booking.ends_at,
    'customer_name', v_booking.customer_name,
    'customer_phone', v_booking.customer_phone,
    'customer_email', v_booking.customer_email,
    'service_name', v_booking.service_name,
    'barber_id', v_barber,
    'barber_name', v_barber_name,
    'price', v_booking.price,
    'discount', v_booking.discount,
    'total', v_booking.total
  );
exception
  when exclusion_violation then raise exception 'SLOT_UNAVAILABLE';
end $$;

-- Reprogramación (solo personal del panel)
create or replace function public.reschedule_booking(
  p_booking_id uuid,
  p_starts_at timestamptz,
  p_barber_id uuid default null,
  p_force boolean default false
)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  b public.bookings%rowtype;
  v_barber uuid;
  v_date date;
  v_len interval;
  v_ok boolean;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into s from public.business_settings where id = 1;
  select * into b from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if b.status not in ('pending','confirmed') then raise exception 'INVALID_STATUS'; end if;

  v_barber := coalesce(p_barber_id, b.barber_id);
  v_date := (p_starts_at at time zone s.timezone)::date;
  v_len := b.ends_at - b.starts_at;
  perform pg_advisory_xact_lock(hashtextextended('booking:' || v_date::text, 0));

  if not p_force then
    select exists (
      select 1 from public.get_available_slots(b.service_id, v_date, v_barber, b.id) a
      where a.slot_start = p_starts_at and a.barber_id = v_barber
    ) into v_ok;
    if not v_ok then raise exception 'SLOT_UNAVAILABLE'; end if;
  end if;

  update public.bookings
    set starts_at = p_starts_at, ends_at = p_starts_at + v_len, barber_id = v_barber, reminder_sent_at = null
    where id = b.id
    returning * into b;

  return jsonb_build_object('id', b.id, 'code', b.code, 'starts_at', b.starts_at, 'barber_id', b.barber_id);
exception
  when exclusion_violation then raise exception 'SLOT_UNAVAILABLE';
end $$;

-- Consulta pública por código (sin datos sensibles)
create or replace function public.get_booking_public(p_code text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'code', b.code,
    'status', b.status,
    'starts_at', b.starts_at,
    'ends_at', b.ends_at,
    'customer_name', b.customer_name,
    'service_name', b.service_name,
    'barber_name', br.name,
    'barber_photo', br.photo_url,
    'price', b.price,
    'discount', b.discount,
    'total', b.total
  )
  from public.bookings b join public.barbers br on br.id = b.barber_id
  where b.code = upper(btrim(p_code));
$$;

-- Cancelación por el cliente (requiere código + teléfono)
create or replace function public.cancel_booking_public(p_code text, p_phone text)
returns jsonb language plpgsql volatile security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  b public.bookings%rowtype;
begin
  select * into s from public.business_settings where id = 1;
  select * into b from public.bookings
    where code = upper(btrim(p_code)) and customer_phone = public.normalize_phone(p_phone)
    for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if b.status not in ('pending','confirmed') then raise exception 'INVALID_STATUS'; end if;
  if b.starts_at - now() < make_interval(hours => s.cancellation_window_hours) then
    raise exception 'CANCELLATION_WINDOW';
  end if;
  update public.bookings set status = 'cancelled', cancel_reason = 'Cancelada por el cliente' where id = b.id;
  return jsonb_build_object('id', b.id, 'code', b.code);
end $$;

-- Vista previa de cupón
create or replace function public.validate_coupon(p_code text, p_service_id uuid, p_date date default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  c public.coupons%rowtype;
  v_price numeric;
  v_discount numeric;
  v_date date;
begin
  select * into s from public.business_settings where id = 1;
  if not coalesce((s.features->>'coupons')::boolean, false) then
    return jsonb_build_object('valid', false, 'reason', 'disabled');
  end if;
  v_date := coalesce(p_date, (now() at time zone s.timezone)::date);
  select price into v_price from public.services where id = p_service_id and is_active;
  select * into c from public.coupons where code = upper(btrim(coalesce(p_code,'')));
  if not found or v_price is null or not c.is_active
     or (c.starts_on is not null and v_date < c.starts_on)
     or (c.ends_on is not null and v_date > c.ends_on)
     or (c.max_uses is not null and c.used_count >= c.max_uses)
     or v_price < c.min_amount then
    return jsonb_build_object('valid', false, 'reason', 'invalid');
  end if;
  v_discount := case when c.discount_type = 'percent' then round(v_price * c.value / 100, 0) else c.value end;
  v_discount := least(v_discount, v_price);
  return jsonb_build_object('valid', true, 'code', c.code, 'discount', v_discount, 'total', v_price - v_discount, 'description', c.description);
end $$;

-- Lista de espera pública
create or replace function public.join_waitlist(
  p_name text, p_phone text, p_email text, p_service_id uuid, p_barber_id uuid,
  p_date date, p_time_from time default null, p_time_to time default null, p_notes text default null
)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  v_phone text := public.normalize_phone(p_phone);
  v_id uuid;
begin
  select * into s from public.business_settings where id = 1;
  if not coalesce((s.features->>'waitlist')::boolean, false) then raise exception 'FEATURE_DISABLED'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 2 then raise exception 'INVALID_NAME'; end if;
  if v_phone is null then raise exception 'INVALID_PHONE'; end if;
  if p_date < (now() at time zone s.timezone)::date then raise exception 'INVALID_DATE'; end if;
  if (select count(*) from public.waitlist w where w.phone = v_phone and w.status = 'waiting') >= 3 then
    raise exception 'TOO_MANY_REQUESTS';
  end if;
  insert into public.waitlist (customer_name, phone, email, service_id, barber_id, desired_date, time_from, time_to, notes)
  values (btrim(p_name), v_phone, nullif(lower(btrim(coalesce(p_email,''))),''), p_service_id, p_barber_id, p_date,
          p_time_from, p_time_to, left(nullif(btrim(coalesce(p_notes,'')),''), 500))
  returning id into v_id;
  return v_id;
end $$;

-- Reseñas públicas (quedan pendientes de aprobación)
create or replace function public.submit_review(p_name text, p_rating int, p_comment text, p_booking_code text default null)
returns uuid language plpgsql volatile security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  b public.bookings%rowtype;
  v_id uuid;
begin
  select * into s from public.business_settings where id = 1;
  if not coalesce((s.features->>'reviews')::boolean, false) then raise exception 'FEATURE_DISABLED'; end if;
  if char_length(btrim(coalesce(p_name,''))) < 2 or char_length(p_name) > 80 then raise exception 'INVALID_NAME'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'INVALID_RATING'; end if;
  if p_comment is not null and char_length(p_comment) > 1000 then raise exception 'INVALID_COMMENT'; end if;
  if nullif(btrim(coalesce(p_booking_code,'')),'') is not null then
    select * into b from public.bookings where code = upper(btrim(p_booking_code)) and status = 'completed';
    if not found then raise exception 'INVALID_BOOKING'; end if;
    if exists (select 1 from public.reviews r where r.booking_id = b.id) then raise exception 'ALREADY_REVIEWED'; end if;
  end if;
  insert into public.reviews (booking_id, barber_id, customer_name, rating, comment, is_verified)
  values (b.id, b.barber_id, btrim(p_name), p_rating, nullif(btrim(coalesce(p_comment,'')),''), b.id is not null)
  returning id into v_id;
  return v_id;
end $$;

-- ---------------------------------------------------------------------
-- Vista de clientes con métricas
-- ---------------------------------------------------------------------
create or replace view public.customer_overview with (security_invoker = true) as
select
  c.*,
  (select max(b.starts_at) from public.bookings b where b.customer_id = c.id and b.status = 'completed') as last_visit_at,
  (select count(*) from public.bookings b where b.customer_id = c.id) as bookings_count,
  (select count(*) from public.bookings b where b.customer_id = c.id and b.status = 'no_show') as no_show_count,
  (select coalesce(sum(p.amount),0) from public.payments p where p.customer_id = c.id) as total_spent
from public.customers c;

-- ---------------------------------------------------------------------
-- Estadísticas del panel
-- ---------------------------------------------------------------------
create or replace function public.dashboard_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  s public.business_settings%rowtype;
  v_tz text;
  v_today date;
  v_week_start date;
  v_month_start date;
  r jsonb;
begin
  if not public.is_staff() then raise exception 'FORBIDDEN'; end if;
  select * into s from public.business_settings where id = 1;
  v_tz := s.timezone;
  v_today := (now() at time zone v_tz)::date;
  v_week_start := v_today - ((extract(isodow from v_today)::int) - 1);
  v_month_start := date_trunc('month', v_today)::date;

  select jsonb_build_object(
    'today_bookings', (select count(*) from bookings where (starts_at at time zone v_tz)::date = v_today and status <> 'cancelled'),
    'today_pending', (select count(*) from bookings where (starts_at at time zone v_tz)::date = v_today and status = 'pending'),
    'week_bookings', (select count(*) from bookings where (starts_at at time zone v_tz)::date between v_week_start and v_week_start + 6 and status <> 'cancelled'),
    'customers', (select count(*) from customers),
    'new_customers_month', (select count(*) from customers where (created_at at time zone v_tz)::date >= v_month_start),
    'revenue_today', (select coalesce(sum(amount),0) from payments where (paid_at at time zone v_tz)::date = v_today),
    'revenue_month', (select coalesce(sum(amount),0) from payments where (paid_at at time zone v_tz)::date >= v_month_start),
    'no_show_month', (select count(*) from bookings where status = 'no_show' and (starts_at at time zone v_tz)::date >= v_month_start),
    'completed_month', (select count(*) from bookings where status = 'completed' and (starts_at at time zone v_tz)::date >= v_month_start),
    'top_services', coalesce((
      select jsonb_agg(t order by t.count desc) from (
        select b.service_name as name, count(*) as count, coalesce(sum(b.total),0) as revenue
        from bookings b
        where b.status <> 'cancelled' and (b.starts_at at time zone v_tz)::date >= v_today - 30
        group by b.service_name order by count(*) desc limit 6
      ) t), '[]'::jsonb),
    'top_barbers', coalesce((
      select jsonb_agg(t order by t.count desc) from (
        select br.name, br.color, count(*) as count
        from bookings b join barbers br on br.id = b.barber_id
        where b.status <> 'cancelled' and (b.starts_at at time zone v_tz)::date >= v_today - 30
        group by br.name, br.color order by count(*) desc limit 6
      ) t), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('date', d::date, 'revenue', coalesce(p.rev,0), 'bookings', coalesce(bk.cnt,0)) order by d)
      from generate_series(v_today - 13, v_today, interval '1 day') d
      left join (select (paid_at at time zone v_tz)::date as day, sum(amount) as rev from payments group by 1) p on p.day = d::date
      left join (select (starts_at at time zone v_tz)::date as day, count(*) as cnt from bookings where status <> 'cancelled' group by 1) bk on bk.day = d::date
    ), '[]'::jsonb),
    'status_month', coalesce((
      select jsonb_object_agg(status, cnt) from (
        select status::text, count(*) as cnt from bookings
        where (starts_at at time zone v_tz)::date >= v_month_start group by status
      ) t), '{}'::jsonb)
  ) into r;
  return r;
end $$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.business_settings enable row level security;
alter table public.business_hours enable row level security;
alter table public.holidays enable row level security;
alter table public.services enable row level security;
alter table public.barbers enable row level security;
alter table public.barber_services enable row level security;
alter table public.barber_schedules enable row level security;
alter table public.time_blocks enable row level security;
alter table public.customers enable row level security;
alter table public.coupons enable row level security;
alter table public.promotions enable row level security;
alter table public.bookings enable row level security;
alter table public.payments enable row level security;
alter table public.waitlist enable row level security;
alter table public.reviews enable row level security;
alter table public.gallery_images enable row level security;
alter table public.notifications enable row level security;

-- Perfiles
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists profiles_admin on public.profiles;
create policy profiles_admin on public.profiles for update using (public.is_admin()) with check (public.is_admin());

-- Lectura pública de contenido del sitio
drop policy if exists settings_read on public.business_settings;
create policy settings_read on public.business_settings for select using (true);
drop policy if exists hours_read on public.business_hours;
create policy hours_read on public.business_hours for select using (true);
drop policy if exists holidays_read on public.holidays;
create policy holidays_read on public.holidays for select using (true);
drop policy if exists services_read on public.services;
create policy services_read on public.services for select using (is_active or public.is_staff());
drop policy if exists barbers_read on public.barbers;
create policy barbers_read on public.barbers for select using (is_active or public.is_staff());
drop policy if exists barber_services_read on public.barber_services;
create policy barber_services_read on public.barber_services for select using (true);
drop policy if exists schedules_read on public.barber_schedules;
create policy schedules_read on public.barber_schedules for select using (true);
drop policy if exists promotions_read on public.promotions;
create policy promotions_read on public.promotions for select using (is_active or public.is_staff());
drop policy if exists reviews_read on public.reviews;
create policy reviews_read on public.reviews for select using (is_approved or public.is_staff());
drop policy if exists gallery_read on public.gallery_images;
create policy gallery_read on public.gallery_images for select using (true);

-- Escritura de contenido: solo administradores
do $$
declare t text;
begin
  foreach t in array array['business_settings','business_hours','holidays','services','barbers','barber_services',
                           'barber_schedules','promotions','gallery_images','coupons'] loop
    execute format('drop policy if exists %1$s_admin_write on public.%1$s', t);
    execute format('create policy %1$s_admin_write on public.%1$s for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Datos operativos: personal del panel (admin + staff)
do $$
declare t text;
begin
  foreach t in array array['time_blocks','customers','bookings','payments','waitlist','notifications'] loop
    execute format('drop policy if exists %1$s_staff_all on public.%1$s', t);
    execute format('create policy %1$s_staff_all on public.%1$s for all using (public.is_staff()) with check (public.is_staff())', t);
  end loop;
end $$;

drop policy if exists coupons_staff_read on public.coupons;
create policy coupons_staff_read on public.coupons for select using (public.is_staff());
drop policy if exists reviews_staff_write on public.reviews;
create policy reviews_staff_write on public.reviews for all using (public.is_staff()) with check (public.is_staff());

-- Permisos de ejecución de funciones
revoke execute on function public.dashboard_stats() from public, anon;
revoke execute on function public.reschedule_booking(uuid, timestamptz, uuid, boolean) from public, anon;
grant execute on function public.dashboard_stats() to authenticated;
grant execute on function public.reschedule_booking(uuid, timestamptz, uuid, boolean) to authenticated;
grant execute on function public.get_available_slots(uuid, date, uuid, uuid) to anon, authenticated;
grant execute on function public.barber_next_slots(uuid, int) to anon, authenticated;
grant execute on function public.create_booking(uuid, timestamptz, text, text, text, uuid, text, text, boolean, text) to anon, authenticated;
grant execute on function public.get_booking_public(text) to anon, authenticated;
grant execute on function public.cancel_booking_public(text, text) to anon, authenticated;
grant execute on function public.validate_coupon(text, uuid, date) to anon, authenticated;
grant execute on function public.join_waitlist(text, text, text, uuid, uuid, date, time, time, text) to anon, authenticated;
grant execute on function public.submit_review(text, int, text, text) to anon, authenticated;

-- Fila de configuración inicial y horario por defecto
insert into public.business_settings (id) values (1) on conflict (id) do nothing;
insert into public.business_hours (weekday, is_open, open_time, close_time) values
  (0, false, '10:00', '14:00'),
  (1, true, '10:00', '20:00'),
  (2, true, '10:00', '20:00'),
  (3, true, '10:00', '20:00'),
  (4, true, '10:00', '20:00'),
  (5, true, '10:00', '21:00'),
  (6, true, '10:00', '18:00')
on conflict (weekday) do nothing;
