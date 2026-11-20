-- =====================================================================
--  DATOS PROVISIONALES DE DEMOSTRACIÓN
--  Todo este contenido es editable desde /admin. Reemplázalo por los datos
--  reales del negocio (nombre, dirección, barberos, precios, fotos).
--  Las fotografías apuntan a Unsplash (licencia libre); sustitúyelas por
--  fotos propias subiéndolas desde el panel.
-- =====================================================================

update public.business_settings set
  name = 'Onyx Barber Studio',
  tagline = 'Precisión, estilo y carácter.',
  description = 'Un estudio de grooming masculino inspirado en las barberías clásicas de Nueva York. Cortes de precisión, afeitado a navaja y un ambiente pensado para que te desconectes. [Texto provisional — edítalo en Configuración]',
  hero_image_url = 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=2000&q=80',
  address = 'Av. Providencia 1234, local 5 (dirección provisional)',
  city = 'Santiago, Chile',
  map_query = 'Av. Providencia 1234, Providencia, Santiago',
  phone = '+56 9 1234 5678',
  whatsapp = '+56912345678',
  email = 'hola@onyxbarber.example',
  instagram = 'onyxbarber.example',
  timezone = 'America/Santiago',
  currency = 'CLP',
  locale = 'es-CL',
  cancellation_policy = 'Puedes cancelar o reprogramar sin costo hasta 3 horas antes de tu cita. Las inasistencias reiteradas pueden requerir abono previo para futuras reservas.',
  cancellation_window_hours = 3,
  auto_confirm = false
where id = 1;

insert into public.services (id, name, description, category, price, duration_min, image_url, is_featured, sort_order) values
 ('11111111-0000-0000-0000-000000000001','Corte clásico','Corte a tijera y máquina con terminaciones a navaja, lavado y peinado.','Cortes',12000,40,'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=1200&q=80',true,1),
 ('11111111-0000-0000-0000-000000000002','Fade','Degradado de precisión (low, mid o high) con transición impecable.','Cortes',14000,45,'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1200&q=80',true,2),
 ('11111111-0000-0000-0000-000000000003','Corte premium','Asesoría de estilo, corte, lavado con masaje capilar, toalla caliente y styling.','Cortes',20000,60,'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1200&q=80',true,3),
 ('11111111-0000-0000-0000-000000000004','Corte + barba','Nuestro combo más pedido: corte completo y perfilado de barba con toalla caliente.','Combos',22000,70,'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1200&q=80',true,4),
 ('11111111-0000-0000-0000-000000000005','Perfilado de barba','Diseño y perfilado con navaja, aceites y bálsamo hidratante.','Barba',9000,30,'https://images.unsplash.com/photo-1621607512214-68297480165e?auto=format&fit=crop&w=1200&q=80',false,5),
 ('11111111-0000-0000-0000-000000000006','Afeitado tradicional','Ritual completo a navaja: vapor, toallas calientes, pre-shave y after-shave.','Barba',13000,45,'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=1200&q=80',false,6),
 ('11111111-0000-0000-0000-000000000007','Diseño de cejas','Limpieza y diseño natural de cejas con navaja o pinza.','Detalles',5000,15,'https://images.unsplash.com/photo-1634480496840-b79a2b8e4e57?auto=format&fit=crop&w=1200&q=80',false,7),
 ('11111111-0000-0000-0000-000000000008','Tratamiento capilar','Exfoliación del cuero cabelludo, mascarilla nutritiva y masaje relajante.','Tratamientos',15000,40,'https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&w=1200&q=80',false,8)
on conflict (id) do nothing;

insert into public.barbers (id, name, slug, role_title, bio, specialties, years_experience, photo_url, color, sort_order) values
 ('22222222-0000-0000-0000-000000000001','Matías Rojas','matias-rojas','Master Barber','Fundador del estudio. Obsesionado con los detalles y los cortes clásicos con un giro contemporáneo. [Perfil provisional]', array['Fades','Corte clásico','Asesoría de estilo'], 12, 'https://images.unsplash.com/photo-1580518337843-f959e992563b?auto=format&fit=crop&w=900&q=80', '#C8A165', 1),
 ('22222222-0000-0000-0000-000000000002','Diego Fuentes','diego-fuentes','Senior Barber','Especialista en barbas y afeitado tradicional a navaja. Paciencia y pulso firme. [Perfil provisional]', array['Barba','Afeitado tradicional','Toalla caliente'], 8, 'https://images.unsplash.com/photo-1567894340315-735d7c361db0?auto=format&fit=crop&w=900&q=80', '#B87333', 2),
 ('22222222-0000-0000-0000-000000000003','Tomás Vidal','tomas-vidal','Barber & Stylist','Tendencias, texturas y diseños. Si traes una referencia, la hace realidad. [Perfil provisional]', array['Texturizado','Diseños','Cejas'], 5, 'https://images.unsplash.com/photo-1595152772835-219674b2a8a6?auto=format&fit=crop&w=900&q=80', '#8C9A86', 3)
on conflict (id) do nothing;

-- Todos los barberos realizan todos los servicios (ajustable en el panel)
insert into public.barber_services (barber_id, service_id)
select b.id, s.id from public.barbers b cross join public.services s
on conflict do nothing;

-- Turnos: lunes a sábado con colación; cada barbero descansa un día distinto
insert into public.barber_schedules (barber_id, weekday, start_time, end_time)
select b.id, d.weekday, d.st::time, d.et::time
from public.barbers b
cross join (values (1,'10:00','14:00'),(1,'15:00','20:00'),
                   (2,'10:00','14:00'),(2,'15:00','20:00'),
                   (3,'10:00','14:00'),(3,'15:00','20:00'),
                   (4,'10:00','14:00'),(4,'15:00','20:00'),
                   (5,'10:00','14:00'),(5,'15:00','21:00'),
                   (6,'10:00','18:00')) as d(weekday, st, et)
where not exists (select 1 from public.barber_schedules x where x.barber_id = b.id)
  and not (b.slug = 'matias-rojas' and d.weekday = 1)
  and not (b.slug = 'diego-fuentes' and d.weekday = 3)
  and not (b.slug = 'tomas-vidal' and d.weekday = 2);

insert into public.gallery_images (image_url, caption, sort_order) values
 ('https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=1000&q=80','Mid fade',1),
 ('https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=1000&q=80','El estudio',2),
 ('https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=1000&q=80','Corte premium',3),
 ('https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=1000&q=80','Corte + barba',4),
 ('https://images.unsplash.com/photo-1512690459411-b9245aed614b?auto=format&fit=crop&w=1000&q=80','Detalles',5),
 ('https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?auto=format&fit=crop&w=1000&q=80','Herramientas',6);

insert into public.coupons (code, description, discount_type, value, max_uses) values
 ('BIENVENIDO10','10% de descuento en tu primera visita (cupón de ejemplo)','percent',10,200)
on conflict (code) do nothing;

insert into public.promotions (title, description, badge, coupon_code, is_active, sort_order) values
 ('Primera visita -10%','Reserva online y usa el código BIENVENIDO10 al confirmar. (Promoción de ejemplo)','Online',
  'BIENVENIDO10', true, 1);
