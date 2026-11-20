"use client";

import { clsx } from "clsx";
import { Download, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { useEffect, useState, useTransition } from "react";
import {
  addGalleryImage,
  addHoliday,
  createPanelUser,
  deleteGalleryImage,
  deleteHoliday,
  saveBookingRules,
  saveBusiness,
  saveFeatures,
  saveHours,
  setUserRole,
  updateGalleryImage,
} from "@/app/admin/actions/settings";
import { ImageInput } from "@/components/admin/image-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { SmartImage } from "@/components/ui/smart-image";
import { useToast } from "@/components/ui/toast";
import { formatDateStr, WEEKDAYS } from "@/lib/format";
import type { ActionResult, BusinessHour, BusinessSettings, Features, GalleryImage, Holiday, Profile } from "@/lib/types";

const TABS = [
  ["negocio", "Negocio"],
  ["horarios", "Horarios y festivos"],
  ["reservas", "Reservas"],
  ["funciones", "Funcionalidades"],
  ["galeria", "Galería"],
  ["qr", "Código QR"],
  ["usuarios", "Usuarios"],
] as const;

type Props = {
  initialTab?: string;
  settings: BusinessSettings;
  hours: BusinessHour[];
  holidays: Holiday[];
  gallery: GalleryImage[];
  users: Profile[];
  currentUserId: string;
  siteUrl: string;
};

function useRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult<unknown>>, msg = "Cambios guardados", after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(msg);
        after?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

export function SettingsTabs(props: Props) {
  const [tab, setTab] = useState<string>(TABS.some(([k]) => k === props.initialTab) ? props.initialTab! : "negocio");
  return (
    <div>
      <div className="scrollbar-none -mx-4 mb-6 flex gap-1 overflow-x-auto border-b border-white/[0.07] px-4 md:mx-0 md:px-0">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              history.replaceState(null, "", `?tab=${k}`);
            }}
            className={clsx(
              "shrink-0 border-b-2 px-4 py-3 text-sm transition-colors",
              tab === k ? "border-gold text-gold-light" : "border-transparent text-ink-400 hover:text-bone",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "negocio" && <BusinessTab settings={props.settings} />}
      {tab === "horarios" && <HoursTab hours={props.hours} holidays={props.holidays} locale={props.settings.locale} />}
      {tab === "reservas" && <RulesTab settings={props.settings} />}
      {tab === "funciones" && <FeaturesTab settings={props.settings} />}
      {tab === "galeria" && <GalleryTab gallery={props.gallery} />}
      {tab === "qr" && <QrTab siteUrl={props.siteUrl} name={props.settings.name} enabled={props.settings.features.qr} />}
      {tab === "usuarios" && <UsersTab users={props.users} currentUserId={props.currentUserId} />}
    </div>
  );
}

function BusinessTab({ settings }: { settings: BusinessSettings }) {
  const { pending, run } = useRun();
  const [f, setF] = useState({
    name: settings.name,
    tagline: settings.tagline ?? "",
    description: settings.description ?? "",
    logo_url: settings.logo_url,
    hero_image_url: settings.hero_image_url,
    address: settings.address ?? "",
    city: settings.city ?? "",
    map_query: settings.map_query ?? "",
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "",
    instagram: settings.instagram ?? "",
    timezone: settings.timezone,
    currency: settings.currency,
    locale: settings.locale,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveBusiness(f));
      }}
      className="grid gap-4 lg:grid-cols-2"
    >
      <Card className="grid gap-4 p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">Identidad</h2>
        <Field label="Nombre de la barbería">
          <Input value={f.name} onChange={(e) => set("name", e.target.value)} required />
        </Field>
        <Field label="Frase comercial" hint="Usa una coma para destacar la segunda parte en dorado: «Precisión, estilo y carácter.»">
          <Input value={f.tagline} onChange={(e) => set("tagline", e.target.value)} maxLength={120} />
        </Field>
        <Field label="Presentación">
          <Textarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={5} maxLength={1200} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo">
            <ImageInput value={f.logo_url} onChange={(v) => set("logo_url", v)} folder="brand" aspect="aspect-square" />
          </Field>
          <Field label="Fotografía principal">
            <ImageInput value={f.hero_image_url} onChange={(v) => set("hero_image_url", v)} folder="brand" />
          </Field>
        </div>
      </Card>
      <Card className="grid content-start gap-4 p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">Contacto y ubicación</h2>
        <Field label="Dirección">
          <Input value={f.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <Field label="Ciudad / comuna">
          <Input value={f.city} onChange={(e) => set("city", e.target.value)} />
        </Field>
        <Field label="Búsqueda para el mapa" hint="Texto que se busca en Google Maps (dirección completa).">
          <Input value={f.map_query} onChange={(e) => set("map_query", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teléfono">
            <Input value={f.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
          <Field label="WhatsApp" hint="Con código de país: +569…">
            <Input value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} />
          </Field>
          <Field label="Correo">
            <Input type="email" value={f.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Instagram">
            <Input value={f.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="usuario" />
          </Field>
        </div>
        <h2 className="mt-2 font-display text-lg uppercase tracking-wide">Región</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Zona horaria">
            <Input value={f.timezone} onChange={(e) => set("timezone", e.target.value)} />
          </Field>
          <Field label="Moneda">
            <Input value={f.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} maxLength={3} />
          </Field>
          <Field label="Idioma/formato">
            <Input value={f.locale} onChange={(e) => set("locale", e.target.value)} />
          </Field>
        </div>
        <Button type="submit" loading={pending} className="mt-2">
          Guardar datos del negocio
        </Button>
      </Card>
    </form>
  );
}

function HoursTab({ hours, holidays, locale }: { hours: BusinessHour[]; holidays: Holiday[]; locale: string }) {
  const { pending, run } = useRun();
  const [rows, setRows] = useState(
    [0, 1, 2, 3, 4, 5, 6].map(
      (wd) => hours.find((h) => h.weekday === wd) ?? { weekday: wd, is_open: false, open_time: "10:00", close_time: "19:00" },
    ).map((h) => ({ ...h, open_time: h.open_time.slice(0, 5), close_time: h.close_time.slice(0, 5) })),
  );
  const [hDate, setHDate] = useState("");
  const [hName, setHName] = useState("");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-1 font-display text-lg uppercase tracking-wide">Horario de atención</h2>
        <p className="mb-4 text-xs text-ink-400">Las reservas solo se permiten dentro de este horario y del turno de cada barbero.</p>
        <ul className="divide-y divide-white/[0.06]">
          {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
            const r = rows.find((x) => x.weekday === wd)!;
            const upd = (patch: Partial<typeof r>) => setRows((all) => all.map((x) => (x.weekday === wd ? { ...x, ...patch } : x)));
            return (
              <li key={wd} className="flex flex-wrap items-center gap-3 py-3">
                <span className="w-24 text-sm text-bone">{WEEKDAYS[wd]}</span>
                <Switch checked={r.is_open} onChange={(v) => upd({ is_open: v })} />
                {r.is_open ? (
                  <div className="flex items-center gap-2">
                    <Input type="time" value={r.open_time} onChange={(e) => upd({ open_time: e.target.value })} className="h-10 w-28" />
                    <span className="text-ink-500">–</span>
                    <Input type="time" value={r.close_time} onChange={(e) => upd({ close_time: e.target.value })} className="h-10 w-28" />
                  </div>
                ) : (
                  <span className="text-sm text-ink-500">Cerrado</span>
                )}
              </li>
            );
          })}
        </ul>
        <Button className="mt-4" loading={pending} onClick={() => run(() => saveHours(rows))}>
          Guardar horario
        </Button>
      </Card>
      <Card className="p-5">
        <h2 className="mb-1 font-display text-lg uppercase tracking-wide">Días festivos / cierres</h2>
        <p className="mb-4 text-xs text-ink-400">En estas fechas no se aceptan reservas.</p>
        <form
          className="mb-5 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => addHoliday(hDate, hName), "Festivo agregado", () => {
              setHDate("");
              setHName("");
            });
          }}
        >
          <Input type="date" value={hDate} onChange={(e) => setHDate(e.target.value)} required className="sm:w-44" />
          <Input value={hName} onChange={(e) => setHName(e.target.value)} placeholder="Ej: Fiestas Patrias" required minLength={2} />
          <Button type="submit" loading={pending} className="h-12" icon={<Plus className="h-4 w-4" />}>
            Agregar
          </Button>
        </form>
        {holidays.length === 0 ? (
          <p className="text-sm text-ink-500">Sin festivos próximos.</p>
        ) : (
          <ul className="divide-y divide-white/[0.06] text-sm">
            {holidays.map((h) => (
              <li key={h.id} className="flex items-center justify-between py-2.5">
                <span>
                  <span className="text-bone">{h.name}</span>
                  <span className="block text-xs text-ink-400">{formatDateStr(h.date, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                </span>
                <button onClick={() => run(() => deleteHoliday(h.id), "Festivo eliminado")} className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:text-danger" aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RulesTab({ settings }: { settings: BusinessSettings }) {
  const { pending, run } = useRun();
  const [f, setF] = useState({
    slot_interval_min: settings.slot_interval_min,
    min_notice_min: settings.min_notice_min,
    max_advance_days: settings.max_advance_days,
    auto_confirm: settings.auto_confirm,
    cancellation_policy: settings.cancellation_policy ?? "",
    cancellation_window_hours: settings.cancellation_window_hours,
    reminder_hours_before: settings.reminder_hours_before,
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Card className="max-w-3xl p-5">
      <form
        className="grid gap-5 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => saveBookingRules(f));
        }}
      >
        <Field label="Intervalo entre horas (min)" hint="Cada cuánto se ofrecen horas: 15 → 10:00, 10:15, 10:30…">
          <Select value={f.slot_interval_min} onChange={(e) => set("slot_interval_min", Number(e.target.value))}>
            {[10, 15, 20, 30, 45, 60].map((n) => (
              <option key={n} value={n}>
                {n} minutos
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Antelación mínima (min)" hint="Ej: 60 = no se puede reservar con menos de 1 hora.">
          <Input type="number" min={0} value={f.min_notice_min} onChange={(e) => set("min_notice_min", Number(e.target.value))} />
        </Field>
        <Field label="Reservar con hasta (días)">
          <Input type="number" min={1} max={365} value={f.max_advance_days} onChange={(e) => set("max_advance_days", Number(e.target.value))} />
        </Field>
        <Field label="Recordatorio (horas antes)">
          <Input type="number" min={1} max={168} value={f.reminder_hours_before} onChange={(e) => set("reminder_hours_before", Number(e.target.value))} />
        </Field>
        <Field label="Cancelación online hasta (horas antes)">
          <Input type="number" min={0} max={168} value={f.cancellation_window_hours} onChange={(e) => set("cancellation_window_hours", Number(e.target.value))} />
        </Field>
        <div className="flex items-end pb-2">
          <Switch checked={f.auto_confirm} onChange={(v) => set("auto_confirm", v)} label="Confirmación automática" description="Si está apagado, las reservas web quedan «pendientes» hasta que las confirmes." />
        </div>
        <Field label="Política de cancelación" className="sm:col-span-2" hint="Se muestra al reservar y en los correos.">
          <Textarea value={f.cancellation_policy} onChange={(e) => set("cancellation_policy", e.target.value)} rows={3} maxLength={1000} />
        </Field>
        <Button type="submit" loading={pending} className="sm:col-span-2 sm:justify-self-start">
          Guardar reglas
        </Button>
      </form>
    </Card>
  );
}

const FEATURE_INFO: Record<keyof Features, [string, string]> = {
  coupons: ["Cupones de descuento", "Campo de cupón al reservar y gestión de cupones."],
  promotions: ["Promociones", "Banners promocionales en la portada."],
  loyalty: ["Programa de fidelización", "Puntos por cada visita atendida y recompensas."],
  waitlist: ["Lista de espera", "Los clientes se anotan cuando no hay horas; aviso automático al liberarse una."],
  reviews: ["Reseñas", "Sección de opiniones y formulario público (con moderación)."],
  qr: ["Código QR", "QR descargable que lleva directo a la página de reservas."],
};

function FeaturesTab({ settings }: { settings: BusinessSettings }) {
  const { pending, run } = useRun();
  const [features, setFeatures] = useState(settings.features);
  const [pts, setPts] = useState(settings.loyalty_points_per_visit);
  const [thr, setThr] = useState(settings.loyalty_reward_threshold);
  const [reward, setReward] = useState(settings.loyalty_reward_description ?? "");
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Módulos</h2>
        <div className="flex flex-col gap-5">
          {(Object.keys(FEATURE_INFO) as (keyof Features)[]).map((k) => (
            <Switch key={k} checked={features[k]} onChange={(v) => setFeatures((f) => ({ ...f, [k]: v }))} label={FEATURE_INFO[k][0]} description={FEATURE_INFO[k][1]} />
          ))}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Fidelización</h2>
        <div className="grid gap-4">
          <Field label="Puntos por visita atendida">
            <Input type="number" min={0} value={pts} onChange={(e) => setPts(Number(e.target.value))} />
          </Field>
          <Field label="Puntos para obtener la recompensa">
            <Input type="number" min={1} value={thr} onChange={(e) => setThr(Number(e.target.value))} />
          </Field>
          <Field label="Recompensa">
            <Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Corte gratis" />
          </Field>
        </div>
      </Card>
      <div>
        <Button
          loading={pending}
          onClick={() =>
            run(() => saveFeatures({ features, loyalty_points_per_visit: pts, loyalty_reward_threshold: thr, loyalty_reward_description: reward }))
          }
        >
          Guardar funcionalidades
        </Button>
      </div>
    </div>
  );
}

function GalleryTab({ gallery }: { gallery: GalleryImage[] }) {
  const { pending, run } = useRun();
  const [url, setUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card className="flex flex-col gap-4 p-5">
        <h2 className="font-display text-lg uppercase tracking-wide">Agregar foto</h2>
        <ImageInput value={url} onChange={setUrl} folder="gallery" />
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Descripción (opcional)" maxLength={80} />
        <Button
          disabled={!url}
          loading={pending}
          onClick={() =>
            run(() => addGalleryImage(url!, caption), "Foto agregada", () => {
              setUrl(null);
              setCaption("");
            })
          }
        >
          Agregar a la galería
        </Button>
      </Card>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {gallery.map((g) => (
          <GalleryItem key={g.id} g={g} />
        ))}
        {gallery.length === 0 && <p className="text-sm text-ink-500">La galería está vacía.</p>}
      </div>
    </div>
  );
}

function GalleryItem({ g }: { g: GalleryImage }) {
  const { pending, run } = useRun();
  const [caption, setCaption] = useState(g.caption ?? "");
  const [order, setOrder] = useState(g.sort_order);
  const dirty = caption !== (g.caption ?? "") || order !== g.sort_order;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
      <SmartImage src={g.image_url} alt={g.caption ?? ""} className="aspect-square" />
      <div className="flex flex-col gap-2 p-3">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Descripción" className="h-9 text-xs" />
        <div className="flex items-center gap-2">
          <Input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} className="h-9 w-16 text-xs" aria-label="Orden" />
          {dirty && (
            <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => updateGalleryImage(g.id, caption, order))}>
              Guardar
            </Button>
          )}
          <button
            onClick={() => confirm("¿Eliminar esta foto?") && run(() => deleteGalleryImage(g.id), "Foto eliminada")}
            className="ml-auto grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:text-danger"
            aria-label="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function QrTab({ siteUrl, name, enabled }: { siteUrl: string; name: string; enabled: boolean }) {
  const [src, setSrc] = useState<string | null>(null);
  const [base, setBase] = useState(siteUrl);
  useEffect(() => {
    if (siteUrl.includes("localhost") && typeof window !== "undefined") setBase(window.location.origin);
  }, [siteUrl]);
  const url = `${base}/reservar?utm_source=qr`;
  useEffect(() => {
    QRCode.toDataURL(url, { width: 1024, margin: 2, errorCorrectionLevel: "H", color: { dark: "#0e0e0e", light: "#ffffff" } }).then(setSrc);
  }, [url]);

  if (!enabled) return <p className="text-sm text-ink-400">Activa el módulo «Código QR» en Funcionalidades.</p>;
  return (
    <Card className="flex max-w-xl flex-col items-center gap-5 p-8 text-center">
      <h2 className="font-display text-xl uppercase tracking-wide">Reserva con un escaneo</h2>
      <p className="text-sm text-ink-400">Imprímelo en el mesón, espejos, tarjetas o vitrina. Lleva directo a la página de reservas.</p>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Código QR de reservas" className="w-64 rounded-2xl bg-white p-3" />
      )}
      <code className="break-all text-xs text-ink-500">{url}</code>
      {src && (
        <a href={src} download={`qr-reservas-${name.toLowerCase().replace(/\s+/g, "-")}.png`}>
          <Button icon={<Download className="h-4 w-4" />}>Descargar PNG</Button>
        </a>
      )}
    </Card>
  );
}

function UsersTab({ users, currentUserId }: { users: Profile[]; currentUserId: string }) {
  const { pending, run } = useRun();
  const [f, setF] = useState({ email: "", password: "", full_name: "", role: "staff" as "admin" | "staff" });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Equipo con acceso al panel</h2>
        <ul className="divide-y divide-white/[0.06]">
          {users.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-3">
              <span className="min-w-0">
                <span className="block truncate text-sm text-bone">{u.full_name ?? u.email}</span>
                <span className="block truncate text-xs text-ink-400">{u.email}</span>
              </span>
              <Select
                value={u.role}
                disabled={u.id === currentUserId || pending}
                onChange={(e) => run(() => setUserRole(u.id, e.target.value as Profile["role"]), "Rol actualizado")}
                className="h-10 w-36 text-sm"
              >
                <option value="admin">Administrador</option>
                <option value="staff">Staff</option>
                <option value="none">Sin acceso</option>
              </Select>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-ink-500">
          <strong>Administrador</strong>: acceso total. <strong>Staff</strong>: agenda, reservas, clientes, pagos, reseñas y lista de espera.
        </p>
      </Card>
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Crear usuario</h2>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => createPanelUser(f), "Usuario creado", () => setF({ email: "", password: "", full_name: "", role: "staff" }));
          }}
        >
          <Field label="Nombre">
            <Input value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
          </Field>
          <Field label="Correo">
            <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required autoComplete="off" />
          </Field>
          <Field label="Contraseña temporal" hint="Mínimo 10 caracteres. Pídele que la cambie en «Mi cuenta».">
            <Input type="text" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required minLength={10} autoComplete="new-password" />
          </Field>
          <Field label="Rol">
            <Select value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as "admin" | "staff" })}>
              <option value="staff">Staff</option>
              <option value="admin">Administrador</option>
            </Select>
          </Field>
          <Button type="submit" loading={pending}>
            Crear usuario
          </Button>
        </form>
      </Card>
    </div>
  );
}
