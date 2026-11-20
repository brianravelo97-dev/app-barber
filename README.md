# Onyx Barber Studio — Plataforma de reservas y gestión para barberías

Aplicación web completa (sitio público + reservas online + panel de administración) construida con
**Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + Storage)**.

> **Datos provisionales:** el nombre «Onyx Barber Studio», la dirección, los barberos, precios, textos y fotos (Unsplash)
> son de ejemplo y están marcados como provisionales. Todo se edita desde **/admin → Configuración / Servicios / Barberos**.
> Mientras no guardes la configuración del negocio, el panel muestra un aviso recordándolo.

---

## 1. Concepto creativo

Barbería boutique neoyorquina: **negro profundo, gris carbón, blanco cálido y detalles dorado/cobre**.
Tipografía condensada contundente (Oswald) para títulos, una serif itálica (Playfair Display) para acentos
y Inter para lectura. Fotografía protagonista, grano sutil, transiciones suaves (`ease-premium`) y apariciones al hacer scroll.
Diseño **mobile‑first**: botones grandes, barra inferior con resumen durante la reserva y botón flotante de WhatsApp.

## 2. Funcionalidades

**Sitio público**
- Portada: hero, frase comercial, CTA «Reservar hora», presentación, servicios destacados, barberos, galería, opiniones,
  mapa, horario con indicador «Abierto ahora», contacto, Instagram y WhatsApp flotante. Banner de promociones.
- Catálogo de servicios por categoría (foto, descripción, precio, duración, botón reservar).
- Perfiles de barberos: foto, especialidades, experiencia, horario semanal y **próximas horas libres reales**.
- **Reserva en 4 pasos** (servicio → barbero o «cualquiera» → fecha/hora → datos). Recuerda los datos del cliente,
  salta automáticamente al próximo día con horas, cupones, lista de espera si no hay horas.
- Confirmación con número de reserva, estado, «agregar al calendario» (Google / .ics), WhatsApp y **cancelación online**
  (código + teléfono, respetando la ventana de cancelación). Reseña verificada tras la visita.
- Consulta de reserva en `/reserva`. SEO: metadatos, sitemap, robots, manifest PWA.

**Panel de administración (`/admin`, protegido)**
- Dashboard: reservas de hoy/semana, clientes, ingresos del día/mes, tasa de inasistencia, gráficos de ingresos y reservas
  (14 días), servicios más solicitados y barberos con más reservas.
- **Agenda visual** día / semana / mes: columnas por barbero, horario disponible vs. descanso, bloqueos, línea de «ahora»,
  colores por estado, clic en un hueco para crear reserva, clic en una cita para gestionarla.
- Reservas: filtros por fecha, barbero, estado; búsqueda por nombre/teléfono/código; confirmar, cancelar (con motivo),
  reprogramar (con horas libres o forzando hora manual — nunca permite solapar), marcar atendido + registrar pago,
  registrar inasistencia, reactivar, recordar, notas. Crear reservas telefónicas o sin cita (walk‑in).
- Servicios: crear, editar, eliminar (o desactivar si tiene historial), precio, duración, foto, destacar, orden.
- Barberos: perfil, foto, especialidades, servicios que realiza, color en agenda, **turnos semanales (incluye turno partido)**,
  días de descanso, bloqueos puntuales, agenda individual.
- Clientes: base de datos automática, historial de reservas, servicios utilizados, última visita, total gastado,
  inasistencias, notas internas, puntos de fidelización y canje de recompensa.
- Pagos: registro por medio de pago, totales por período, pagos manuales (productos/propinas).
- Marketing: cupones, promociones, moderación de reseñas, lista de espera (con aviso automático al liberarse una hora).
- Notificaciones: registro real de cada envío y estado de las integraciones.
- Configuración: datos del negocio, logo, foto principal, contacto, redes, región (zona horaria/moneda), horario de atención,
  festivos, reglas de reserva (intervalo, antelación, confirmación automática, política y ventana de cancelación,
  recordatorios), **módulos activables** (cupones, promociones, fidelización, lista de espera, reseñas, QR),
  galería, **código QR** descargable y usuarios del panel (roles admin / staff).

## 3. Arquitectura

```
src/
  app/
    (site)/            Sitio público (ISR 60 s; se revalida al editar desde el panel)
      reservar/        Asistente de reservas
      reserva/[code]   Confirmación / gestión por el cliente
    admin/
      login/           Acceso
      (panel)/         Páginas del panel (verifican sesión + rol en el servidor)
      actions/         Server Actions (validación zod + rol + RLS)
    api/               Endpoints públicos (disponibilidad, reservas, cancelación, cupones, reseñas, lista de espera, .ics, cron)
    auth/              Callback de recuperación de contraseña y cierre de sesión
  components/          UI (ui/), sitio (site/), reservas (booking/), panel (admin/)
  lib/                 Supabase (server / public / service / browser), datos, validación, tiempo/zonas horarias,
                       notificaciones (Resend + Twilio), errores, rate‑limit
  middleware.ts        Protege /admin y refresca la sesión
supabase/
  migrations/          Esquema, RLS, funciones y storage
  seed.sql             Datos provisionales
  tests/               Pruebas SQL de la lógica de reservas
```

**Seguridad**
- Supabase Auth (email + contraseña) con sesión en cookies httpOnly (`@supabase/ssr`); `getUser()` valida el token en cada petición.
- Doble control de permisos: el servidor verifica rol (`admin` / `staff`) antes de cada acción y **Row Level Security** lo vuelve a
  exigir en la base de datos. Los visitantes no pueden leer reservas ni clientes.
- La clave `service_role` solo se usa en el servidor (notificaciones, cron, subida de imágenes, alta de usuarios).
- Validación con zod en el servidor + validaciones en SQL. Honeypot y rate‑limit en endpoints públicos, máximo 3 reservas activas por teléfono.
- Cabeceras de seguridad (nosniff, frame‑options, referrer‑policy, permissions‑policy).

## 4. Base de datos

Tablas: `profiles` (usuarios/administradores), `business_settings`, `business_hours`, `holidays`, `services`, `barbers`,
`barber_services`, `barber_schedules` (horarios/disponibilidad), `time_blocks` (bloqueos), `customers`, `bookings`, `payments`,
`coupons`, `promotions`, `reviews`, `waitlist`, `gallery_images`, `notifications` + vista `customer_overview`.

**Cómo se evitan las dobles reservas**
1. `get_available_slots()` calcula las horas libres en PostgreSQL: turno del barbero ∩ horario del local, festivos, bloqueos,
   reservas activas, antelación mínima y máxima.
2. `create_booking()` (transacción, `SECURITY DEFINER`) toma un *advisory lock* por día, revalida que la hora exacta esté libre,
   asigna barbero (si es «cualquiera», el menos cargado), aplica cupón, crea/actualiza el cliente e inserta la reserva.
3. Garantía final: restricción **`EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at) WITH &&)`** sobre reservas
   activas. Aunque dos peticiones lleguen al mismo milisegundo, PostgreSQL rechaza la segunda.

## 5. Puesta en marcha

### Requisitos
Node.js 20+ y un proyecto de [Supabase](https://supabase.com) (el plan gratuito sirve).

### Pasos
1. **Instalar**
   ```bash
   npm install
   cp .env.example .env.local
   ```
2. **Crear el proyecto en Supabase** y copiar en `.env.local` desde *Project Settings → API*:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_SERVICE_ROLE_KEY`.
3. **Crear la base de datos**: en *SQL Editor* ejecuta, en este orden,
   `supabase/migrations/20261120000001_schema.sql`, `supabase/migrations/20261120000002_storage.sql`
   y (opcional, datos de ejemplo) `supabase/seed.sql`.
   Con la CLI de Supabase: `supabase link --project-ref <ref> && supabase db push` y luego ejecuta `seed.sql`.
4. **Crear el primer administrador**
   ```bash
   ADMIN_EMAIL=dueno@tubarberia.cl ADMIN_PASSWORD='clave-segura-123' ADMIN_NAME='Tu Nombre' npm run db:seed-admin
   ```
5. **Configurar Auth** en Supabase → *Authentication → URL Configuration*: *Site URL* = tu dominio y agrega
   `https://tu-dominio/auth/callback` a *Redirect URLs* (recuperación de contraseña). Desactiva el registro público
   (*Authentication → Providers → Email → Allow new users to sign up*: off) — los usuarios se crean desde el panel.
6. **Ejecutar**
   ```bash
   npm run dev       # http://localhost:3000  ·  panel en /admin
   ```
7. Entra a `/admin/configuracion` y reemplaza los datos provisionales.

## 6. Notificaciones (requieren claves externas)

La app **no simula envíos**: si un proveedor no está configurado, el intento queda registrado como «no configurado» en
*Panel → Notificaciones*. Se envían: confirmación, recordatorio, cancelación, reprogramación y aviso a la lista de espera.

| Canal | Proveedor | Variables | Pasos |
|---|---|---|---|
| Correo | [Resend](https://resend.com) | `RESEND_API_KEY`, `EMAIL_FROM` | Crear cuenta → verificar tu dominio → crear API key → `EMAIL_FROM="Tu Barbería <reservas@tudominio.cl>"` |
| WhatsApp | [Twilio](https://www.twilio.com/whatsapp) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | Para pruebas usa el *WhatsApp Sandbox*. En producción registra un remitente de WhatsApp Business; los mensajes iniciados por el negocio fuera de la ventana de 24 h requieren **plantillas aprobadas por Meta** (crea plantillas equivalentes a los textos de `src/lib/notifications/templates.ts`). |

**Recordatorios automáticos**: `GET /api/cron/reminders` con cabecera `Authorization: Bearer <CRON_SECRET>`.
Envía recordatorios a las citas que comienzan dentro de *Configuración → Reservas → Recordatorio (horas antes)*; es idempotente.
- **Vercel**: `vercel.json` ya lo programa cada hora (define `CRON_SECRET`; Vercel lo envía automáticamente).
  En el plan Hobby los cron solo pueden ser diarios: cambia el schedule a `0 12 * * *` o usa un cron externo.
- **Alternativas**: [cron-job.org](https://cron-job.org) o `pg_cron` + `pg_net` en Supabase, llamando a la URL con la cabecera.
- Desde una reserva también puedes pulsar **Recordar** para enviarlo manualmente.

## 7. Despliegue (Vercel recomendado)

1. Sube el repositorio a GitHub e impórtalo en [Vercel](https://vercel.com/new).
2. Define las variables de `.env.example` (incluye `NEXT_PUBLIC_SITE_URL=https://tu-dominio`).
3. Despliega. Actualiza *Site URL* y *Redirect URLs* en Supabase Auth con el dominio final.
4. Imprime el **QR** desde *Configuración → Código QR*.

## 8. Pruebas

```bash
npm run typecheck   # TypeScript
npm run lint        # ESLint
npm test            # pruebas unitarias (zonas horarias, validación, plantillas, errores)
npm run test:db     # pruebas SQL contra un PostgreSQL local (DATABASE_URL=postgres://...)
npm run build       # build de producción
```

`npm run test:db` crea una base temporal, aplica la migración y el seed, y verifica 17 escenarios: franjas y colaciones,
reserva válida, rechazo de solapamientos totales y parciales, asignación de «cualquier barbero», fuera de horario,
horas no alineadas, pasado, validaciones, cupones, RLS (un visitante no ve reservas/clientes), cancelación pública,
bloqueos, festivos, EXCLUDE constraint, reprogramación forzada sin solapes, fidelización, límite por teléfono,
lista de espera, reseñas y permisos de roles.

## 9. Personalización rápida

- Colores y tipografías: `src/app/globals.css` (bloque `@theme`) y `src/app/layout.tsx`.
- Textos de notificaciones: `src/lib/notifications/templates.ts`.
- Funcionalidades: activar/desactivar en *Configuración → Funcionalidades* (sin tocar código).
