-- Pruebas de la lógica de reservas. Ejecutar con: npm run test:db
-- Se ejecutan como rol "anon" (igual que un visitante del sitio) salvo donde se indica.
\set ON_ERROR_STOP 1
set client_min_messages = notice;

create or replace function pg_temp.expect_error(p_sql text, p_msg text) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if sqlerrm = p_msg then return; end if;
    raise exception 'Se esperaba error % pero se obtuvo: %', p_msg, sqlerrm;
  end;
  raise exception 'Se esperaba error % pero la sentencia tuvo éxito', p_msg;
end $$;

-- Fecha de prueba: próximo jueves (todos los barberos trabajan) en hora local del negocio.
create temp table t_ctx as
select d::date as day from generate_series((now() at time zone 'America/Santiago')::date + 1,
                                     (now() at time zone 'America/Santiago')::date + 8, interval '1 day') d
where extract(dow from d) = 4 limit 1;
grant select on t_ctx to anon, authenticated;

set role anon;

-- 1. Hay franjas disponibles y respetan la colación (14:00-15:00)
do $$
declare v_day date := (select day from t_ctx); n int; n_lunch int;
begin
  select count(*) into n from get_available_slots('11111111-0000-0000-0000-000000000002', v_day);
  if n = 0 then raise exception 'Test 1: no hay franjas'; end if;
  select count(*) into n_lunch from get_available_slots('11111111-0000-0000-0000-000000000002', v_day)
   where (slot_start at time zone 'America/Santiago')::time >= '13:20' and (slot_start at time zone 'America/Santiago')::time < '15:00';
  if n_lunch > 0 then raise exception 'Test 1: hay franjas que pisan la colación (%)', n_lunch; end if;
  raise notice 'OK 1 — % franjas', n;
end $$;

-- 2. Reserva válida
do $$
declare v_day date := (select day from t_ctx); r jsonb;
begin
  r := create_booking('11111111-0000-0000-0000-000000000002', ((v_day + time '10:00') at time zone 'America/Santiago'),
                      'Juan Pérez', '+56 9 8765 4321', 'juan@example.com', '22222222-0000-0000-0000-000000000001');
  if r->>'code' is null or char_length(r->>'code') <> 6 then raise exception 'Test 2: código inválido %', r; end if;
  if (r->>'status') <> 'pending' then raise exception 'Test 2: estado %', r->>'status'; end if;
  raise notice 'OK 2 — reserva %', r->>'code';
end $$;

-- 3. Misma hora y barbero => rechazo
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000001', %L::timestamptz, 'Pedro Soto', '+56911112222', null, '22222222-0000-0000-0000-000000000001')$q$,
  ((select day from t_ctx) + time '10:00') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');
-- 3b. Solapamiento parcial (10:30 dentro de 10:00-10:45) => rechazo
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000001', %L::timestamptz, 'Pedro Soto', '+56911112222', null, '22222222-0000-0000-0000-000000000001')$q$,
  ((select day from t_ctx) + time '10:30') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');

-- 4. Misma hora con "cualquier barbero" => asigna a otro barbero
do $$
declare v_day date := (select day from t_ctx); r jsonb;
begin
  r := create_booking('11111111-0000-0000-0000-000000000002', ((v_day + time '10:00') at time zone 'America/Santiago'),
                      'Pedro Soto', '+56911112222');
  if (r->>'barber_id')::uuid = '22222222-0000-0000-0000-000000000001' then raise exception 'Test 4: asignó barbero ocupado'; end if;
  raise notice 'OK 4 — asignado a %', r->>'barber_name';
end $$;

-- 5. Fuera de horario (22:00) y en colación => rechazo
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444')$q$,
  ((select day from t_ctx) + time '22:00') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444')$q$,
  ((select day from t_ctx) + time '13:45') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');
-- 5b. Hora no alineada a la grilla
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444')$q$,
  ((select day from t_ctx) + time '11:07') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');
-- 5c. En el pasado
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444')$q$,
  now() - interval '2 days'), 'SLOT_UNAVAILABLE');

-- 6. Validaciones de datos
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'A', '+56933334444')$q$,
  ((select day from t_ctx) + time '16:00') at time zone 'America/Santiago'), 'INVALID_NAME');
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '123')$q$,
  ((select day from t_ctx) + time '16:00') at time zone 'America/Santiago'), 'INVALID_PHONE');
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444', 'no-es-correo')$q$,
  ((select day from t_ctx) + time '16:00') at time zone 'America/Santiago'), 'INVALID_EMAIL');
-- 6b. Un visitante no puede forzar
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444', null, '22222222-0000-0000-0000-000000000001', null, null, true)$q$,
  ((select day from t_ctx) + time '23:00') at time zone 'America/Santiago'), 'FORBIDDEN');

-- 7. Cupón
do $$
declare v_day date := (select day from t_ctx); r jsonb;
begin
  r := validate_coupon('bienvenido10', '11111111-0000-0000-0000-000000000003', v_day);
  if not (r->>'valid')::boolean or (r->>'discount')::numeric <> 2000 then raise exception 'Test 7: %', r; end if;
  r := create_booking('11111111-0000-0000-0000-000000000003', ((v_day + time '16:00') at time zone 'America/Santiago'),
                      'Ana Díaz', '+56933334444', null, null, null, 'bienvenido10');
  if (r->>'total')::numeric <> 18000 then raise exception 'Test 7: total %', r->>'total'; end if;
  raise notice 'OK 7 — cupón aplicado';
end $$;
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000002', %L::timestamptz, 'Ana Díaz', '+56933334444', null, null, null, 'NOEXISTE')$q$,
  ((select day from t_ctx) + time '17:00') at time zone 'America/Santiago'), 'INVALID_COUPON');

-- 8. Anon no puede leer reservas ni clientes (RLS)
do $$
declare n int;
begin
  select count(*) into n from bookings;
  if n <> 0 then raise exception 'Test 8: anon ve % reservas', n; end if;
  select count(*) into n from customers;
  if n <> 0 then raise exception 'Test 8: anon ve % clientes', n; end if;
  raise notice 'OK 8 — RLS';
end $$;
select pg_temp.expect_error($q$select dashboard_stats()$q$, 'permission denied for function dashboard_stats');

-- 9. Cancelación pública: teléfono incorrecto vs correcto; la franja se libera
reset role;
create temp table t_code as select code from bookings where customer_phone = '+56987654321';
grant select on t_code to anon;
set role anon;
select pg_temp.expect_error(format($q$select cancel_booking_public(%L, '+56900000000')$q$, (select code from t_code)), 'NOT_FOUND');
select cancel_booking_public((select code from t_code), '+56 9 8765 4321');
do $$
declare v_day date := (select day from t_ctx); r jsonb;
begin
  r := create_booking('11111111-0000-0000-0000-000000000002', ((v_day + time '10:00') at time zone 'America/Santiago'),
                      'Luis Mora', '+56955556666', null, '22222222-0000-0000-0000-000000000001');
  raise notice 'OK 9 — franja liberada tras cancelación (%)', r->>'code';
end $$;

-- 10. Bloqueo de horario y festivo
reset role;
insert into time_blocks (barber_id, starts_at, ends_at, reason)
select '22222222-0000-0000-0000-000000000002', (day + time '17:00') at time zone 'America/Santiago', (day + time '19:00') at time zone 'America/Santiago', 'Trámite'
from t_ctx;
set role anon;
select pg_temp.expect_error(format($q$select create_booking('11111111-0000-0000-0000-000000000005', %L::timestamptz, 'Ana Díaz', '+56933334444', null, '22222222-0000-0000-0000-000000000002')$q$,
  ((select day from t_ctx) + time '17:30') at time zone 'America/Santiago'), 'SLOT_UNAVAILABLE');
reset role;
insert into holidays (date, name) select day + 1, 'Festivo de prueba' from t_ctx;
set role anon;
do $$
declare n int;
begin
  select count(*) into n from get_available_slots('11111111-0000-0000-0000-000000000002', (select day + 1 from t_ctx));
  if n <> 0 then raise exception 'Test 10: festivo con % franjas', n; end if;
  raise notice 'OK 10 — bloqueos y festivos';
end $$;

-- 11. Restricción de exclusión a nivel de tabla (incluso para escrituras directas)
reset role;
do $$
declare b bookings%rowtype;
begin
  select * into b from bookings where status <> 'cancelled' limit 1;
  begin
    insert into bookings (code, customer_id, barber_id, service_id, starts_at, ends_at, status, customer_name, customer_phone, service_name, price, total)
    values ('ZZZZZZ', b.customer_id, b.barber_id, b.service_id, b.starts_at + interval '5 minutes', b.ends_at, 'confirmed', 'x', '+56900000001', 'x', 0, 0);
    raise exception 'Test 11: se permitió solapamiento';
  exception when exclusion_violation then raise notice 'OK 11 — exclusion constraint';
  end;
end $$;

-- 12. Personal: reprogramar, completar (puntos), estadísticas
insert into auth.users (id, email) values ('33333333-0000-0000-0000-000000000001', 'admin@example.com');
update profiles set role = 'admin' where id = '33333333-0000-0000-0000-000000000001';
set request.jwt.claim.sub = '33333333-0000-0000-0000-000000000001';
set role authenticated;
do $$
declare b bookings%rowtype; r jsonb; v_day date := (select day from t_ctx); c customers%rowtype;
begin
  select * into b from bookings where customer_phone = '+56955556666';
  r := reschedule_booking(b.id, ((v_day + time '11:00') at time zone 'America/Santiago'));
  -- mover encima de otra reserva => error
  begin
    perform reschedule_booking(b.id, ((v_day + time '10:00') at time zone 'America/Santiago'), '22222222-0000-0000-0000-000000000001', true);
    -- forzado sobre una franja libre de 10:00 de Matías: la de Luis ya se movió, así que debería funcionar
  exception when others then raise exception 'Test 12: forzar reprogramación falló: %', sqlerrm;
  end;
  update bookings set status = 'completed' where id = b.id;
  select * into c from customers where phone = '+56955556666';
  if c.loyalty_points <> 10 or c.total_visits <> 1 then raise exception 'Test 12: puntos % visitas %', c.loyalty_points, c.total_visits; end if;
  update bookings set status = 'confirmed' where id = b.id;
  select * into c from customers where phone = '+56955556666';
  if c.loyalty_points <> 0 or c.total_visits <> 0 then raise exception 'Test 12: reversión puntos %', c.loyalty_points; end if;
  r := dashboard_stats();
  if (r->>'customers')::int < 3 then raise exception 'Test 12: stats %', r; end if;
  raise notice 'OK 12 — personal: reprogramación, fidelización y estadísticas';
end $$;
-- Forzar encima de una reserva existente => la exclusión lo impide
do $$
declare b bookings%rowtype; other bookings%rowtype;
begin
  select * into b from bookings where customer_phone = '+56955556666';
  select * into other from bookings where customer_phone = '+56911112222';
  perform reschedule_booking(b.id, other.starts_at, other.barber_id, true);
  raise exception 'Test 13: se permitió forzar solapamiento';
exception when others then
  if sqlerrm <> 'SLOT_UNAVAILABLE' then raise; end if;
  raise notice 'OK 13 — forzar no permite doble reserva';
end $$;

-- 14. Límite de reservas futuras por teléfono
reset role;
reset request.jwt.claim.sub;
set role anon;
do $$
declare v_day date := (select day from t_ctx); i int; t time; ok int := 0;
begin
  foreach t in array array['18:00','18:30','19:00','19:30']::time[] loop
    begin
      perform create_booking('11111111-0000-0000-0000-000000000007', ((v_day + t) at time zone 'America/Santiago'), 'Spam Bot', '+56977778888');
      ok := ok + 1;
    exception when others then
      if sqlerrm <> 'TOO_MANY_BOOKINGS' then raise; end if;
    end;
  end loop;
  if ok <> 3 then raise exception 'Test 14: se aceptaron %', ok; end if;
  raise notice 'OK 14 — límite por teléfono';
end $$;

-- 15. Lista de espera y reseñas
do $$
declare id uuid;
begin
  id := join_waitlist('Carla Ruiz', '+56912121212', null, '11111111-0000-0000-0000-000000000001', null, (select day from t_ctx), '10:00', '12:00', null);
  id := submit_review('Carla Ruiz', 5, 'Excelente atención');
  raise notice 'OK 15 — lista de espera y reseñas';
end $$;
select pg_temp.expect_error($q$select submit_review('Carla Ruiz', 9, 'x')$q$, 'INVALID_RATING');
-- la reseña no aprobada no es visible públicamente
do $$ begin
  if (select count(*) from reviews) <> 0 then raise exception 'Test 15: reseña sin aprobar visible'; end if;
end $$;

-- 16. Próximas horas de barbero
do $$
declare n int;
begin
  select count(*) into n from barber_next_slots('22222222-0000-0000-0000-000000000003', 5);
  if n <> 5 then raise exception 'Test 16: % franjas', n; end if;
  raise notice 'OK 16 — próximas horas del barbero';
end $$;

reset role;
select 'TODAS LAS PRUEBAS PASARON' as resultado;

-- 17. Roles: un staff no puede auto-promoverse; el admin sí puede asignar roles
insert into auth.users (id, email) values ('33333333-0000-0000-0000-000000000002', 'staff@example.com');
update profiles set role = 'staff' where id = '33333333-0000-0000-0000-000000000002';
set request.jwt.claim.sub = '33333333-0000-0000-0000-000000000002';
set role authenticated;
select pg_temp.expect_error($q$select set_user_role('33333333-0000-0000-0000-000000000002', 'admin')$q$, 'FORBIDDEN');
select pg_temp.expect_error($q$update profiles set role = 'admin' where id = '33333333-0000-0000-0000-000000000002'$q$, 'permission denied for table profiles');
update profiles set full_name = 'Staff Uno' where id = '33333333-0000-0000-0000-000000000002';
reset role;
set request.jwt.claim.sub = '33333333-0000-0000-0000-000000000001';
set role authenticated;
select set_user_role('33333333-0000-0000-0000-000000000002', 'admin');
select pg_temp.expect_error($q$select set_user_role('33333333-0000-0000-0000-000000000001', 'staff')$q$, 'SELF_DEMOTION');
reset role;
do $$ begin
  if (select role from profiles where id = '33333333-0000-0000-0000-000000000002') <> 'admin' then raise exception 'Test 17 falló'; end if;
  if (select full_name from profiles where id = '33333333-0000-0000-0000-000000000002') <> 'Staff Uno' then raise exception 'Test 17: nombre'; end if;
  raise notice 'OK 17 — roles y permisos de perfiles';
end $$;
select 'PRUEBAS DE ROLES PASARON' as resultado;
