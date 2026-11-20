"use client";

import { clsx } from "clsx";
import { ArrowLeft, CalendarDays, Lock, Plus, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addBlock, deleteBarber, deleteBlock, saveBarber, saveSchedule } from "@/app/admin/actions/catalog";
import { ImageInput } from "@/components/admin/image-input";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/misc";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { WEEKDAYS, slugify } from "@/lib/format";
import { localDate, localTime, todayInTz } from "@/lib/time";
import type { Barber, BarberSchedule, BusinessHour, Service, TimeBlock } from "@/lib/types";

type Range = { weekday: number; start_time: string; end_time: string };

export function BarberEditor({
  barber,
  services,
  serviceIds,
  schedules,
  blocks,
  hours,
  tz,
  locale,
  canEdit,
}: {
  barber: Barber | null;
  services: Service[];
  serviceIds: string[];
  schedules: BarberSchedule[];
  blocks: TimeBlock[];
  hours: BusinessHour[];
  tz: string;
  locale: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [form, setForm] = useState({
    name: barber?.name ?? "",
    slug: barber?.slug ?? "",
    role_title: barber?.role_title ?? "",
    bio: barber?.bio ?? "",
    specialties: barber?.specialties ?? [],
    years_experience: barber?.years_experience ?? null,
    photo_url: barber?.photo_url ?? null,
    instagram: barber?.instagram ?? "",
    color: barber?.color ?? "#C8A165",
    is_active: barber?.is_active ?? true,
    sort_order: barber?.sort_order ?? 0,
  });
  const [slugTouched, setSlugTouched] = useState(Boolean(barber));
  const [spec, setSpec] = useState("");
  const [selServices, setSelServices] = useState<string[]>(barber ? serviceIds : services.map((s) => s.id));
  const [ranges, setRanges] = useState<Range[]>(
    schedules.map((s) => ({ weekday: s.weekday, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5) })),
  );
  const [blk, setBlk] = useState({ date: todayInTz(tz), start: "13:00", end: "14:00", reason: "", all_day: false });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    start(async () => {
      const r = await saveBarber(barber?.id ?? null, form, selServices);
      if (r.ok) {
        toast.success("Perfil guardado");
        if (!barber && r.data) router.replace(`/admin/barberos/${r.data.id}`);
        else router.refresh();
      } else toast.error(r.error);
    });
  }

  function addRange(wd: number) {
    const bh = hours.find((h) => h.weekday === wd);
    setRanges((r) => [...r, { weekday: wd, start_time: bh?.open_time.slice(0, 5) ?? "10:00", end_time: bh?.close_time.slice(0, 5) ?? "19:00" }]);
  }

  function saveWeek() {
    if (!barber) return;
    start(async () => {
      const r = await saveSchedule(barber.id, ranges);
      if (r.ok) {
        toast.success("Horario guardado");
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function createBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!barber) return;
    start(async () => {
      const r = await addBlock({ barber_id: barber.id, ...blk, end: blk.all_day ? "23:59" : blk.end, start: blk.all_day ? "00:00" : blk.start });
      if (r.ok) {
        toast.success("Bloqueo agregado");
        setBlk((b) => ({ ...b, reason: "" }));
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <div>
      <Link href="/admin/barberos" className="mb-5 inline-flex items-center gap-2 text-sm text-ink-400 hover:text-bone">
        <ArrowLeft className="h-4 w-4" /> Barberos
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl uppercase tracking-wide text-bone">{barber ? barber.name : "Nuevo barbero"}</h1>
        {barber && (
          <div className="flex gap-2">
            <ButtonLink href={`/admin/agenda?barber=${barber.id}&view=week`} variant="outline" size="sm" icon={<CalendarDays className="h-4 w-4" />}>
              Ver agenda
            </ButtonLink>
            <ButtonLink href={`/barberos/${barber.slug}`} target="_blank" variant="ghost" size="sm">
              Perfil público
            </ButtonLink>
          </div>
        )}
      </div>
      {!canEdit && <p className="mb-4 rounded-xl bg-white/[0.04] px-4 py-3 text-sm text-ink-400">Solo un administrador puede modificar perfiles y horarios. Puedes gestionar bloqueos.</p>}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Perfil</h2>
          <form onSubmit={saveProfile} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre">
              <Input
                value={form.name}
                onChange={(e) => {
                  set("name", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
                required
              />
            </Field>
            <Field label="Cargo">
              <Input value={form.role_title} onChange={(e) => set("role_title", e.target.value)} placeholder="Senior Barber" />
            </Field>
            <Field label="URL del perfil" hint={`/barberos/${form.slug || "…"}`}>
              <Input
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
                required
              />
            </Field>
            <Field label="Años de experiencia">
              <Input
                type="number"
                min={0}
                max={80}
                value={form.years_experience ?? ""}
                onChange={(e) => set("years_experience", e.target.value === "" ? null : Number(e.target.value))}
              />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea value={form.bio} onChange={(e) => set("bio", e.target.value)} rows={3} maxLength={800} />
            </Field>
            <Field label="Especialidades" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {form.specialties.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-3 py-1 text-sm">
                    {s}
                    <button type="button" onClick={() => set("specialties", form.specialties.filter((x) => x !== s))} aria-label={`Quitar ${s}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder="Fades, Barba…"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && spec.trim()) {
                      e.preventDefault();
                      set("specialties", Array.from(new Set([...form.specialties, spec.trim()])).slice(0, 12));
                      setSpec("");
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="h-12"
                  onClick={() => {
                    if (!spec.trim()) return;
                    set("specialties", Array.from(new Set([...form.specialties, spec.trim()])).slice(0, 12));
                    setSpec("");
                  }}
                >
                  Añadir
                </Button>
              </div>
            </Field>
            <Field label="Instagram">
              <Input value={form.instagram} onChange={(e) => set("instagram", e.target.value)} placeholder="usuario" />
            </Field>
            <Field label="Color en agenda">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => set("color", e.target.value)} className="h-12 w-14 cursor-pointer rounded-xl border border-white/10 bg-transparent" />
                <Input value={form.color} onChange={(e) => set("color", e.target.value)} />
              </div>
            </Field>
            <Field label="Fotografía" className="sm:col-span-2">
              <ImageInput value={form.photo_url} onChange={(v) => set("photo_url", v)} folder="barbers" aspect="aspect-[4/5]" />
            </Field>
            <Field label="Servicios que realiza" className="sm:col-span-2">
              <div className="flex flex-wrap gap-2">
                {services.map((s) => {
                  const on = selServices.includes(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => setSelServices((v) => (on ? v.filter((x) => x !== s.id) : [...v, s.id]))}
                      className={clsx(
                        "rounded-full border px-3 py-1.5 text-sm transition-colors",
                        on ? "border-gold bg-gold/15 text-gold-light" : "border-white/10 text-ink-400 hover:text-bone",
                      )}
                    >
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Orden">
              <Input type="number" min={0} value={form.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
            </Field>
            <div className="flex items-end pb-3">
              <Switch checked={form.is_active} onChange={(v) => set("is_active", v)} label="Activo" description="Visible y reservable" />
            </div>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="submit" loading={pending} disabled={!canEdit}>
                {barber ? "Guardar perfil" : "Crear barbero"}
              </Button>
              {barber && canEdit && (
                <Button
                  type="button"
                  variant="danger"
                  onClick={() =>
                    confirm(`¿Eliminar a ${barber.name}? Esta acción no se puede deshacer.`) &&
                    start(async () => {
                      const r = await deleteBarber(barber.id);
                      if (r.ok) {
                        toast.success("Barbero eliminado");
                        router.replace("/admin/barberos");
                      } else toast.error(r.error);
                    })
                  }
                >
                  Eliminar
                </Button>
              )}
            </div>
          </form>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg uppercase tracking-wide">Horario semanal</h2>
              <Button size="sm" onClick={saveWeek} loading={pending} disabled={!barber || !canEdit}>
                Guardar horario
              </Button>
            </div>
            {!barber && <p className="text-sm text-ink-400">Guarda el perfil primero para configurar el horario.</p>}
            {barber && (
              <ul className="divide-y divide-white/[0.06]">
                {[1, 2, 3, 4, 5, 6, 0].map((wd) => {
                  const mine = ranges.map((r, i) => ({ ...r, i })).filter((r) => r.weekday === wd);
                  const bh = hours.find((h) => h.weekday === wd);
                  return (
                    <li key={wd} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                      <div className="flex w-36 items-center justify-between sm:block">
                        <span className="text-sm text-bone">{WEEKDAYS[wd]}</span>
                        <span className="block text-[11px] text-ink-500">
                          {bh?.is_open ? `Local ${bh.open_time.slice(0, 5)}–${bh.close_time.slice(0, 5)}` : "Local cerrado"}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-2">
                        {mine.length === 0 && <span className="text-sm text-ink-500">Día de descanso</span>}
                        {mine.map((r) => (
                          <div key={r.i} className="flex items-center gap-2">
                            <Input
                              type="time"
                              value={r.start_time}
                              onChange={(e) => setRanges((all) => all.map((x, j) => (j === r.i ? { ...x, start_time: e.target.value } : x)))}
                              className="h-10"
                            />
                            <span className="text-ink-500">–</span>
                            <Input
                              type="time"
                              value={r.end_time}
                              onChange={(e) => setRanges((all) => all.map((x, j) => (j === r.i ? { ...x, end_time: e.target.value } : x)))}
                              className="h-10"
                            />
                            <button
                              type="button"
                              onClick={() => setRanges((all) => all.filter((_, j) => j !== r.i))}
                              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink-400 hover:text-danger"
                              aria-label="Quitar franja"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                        <button type="button" onClick={() => addRange(wd)} className="inline-flex items-center gap-1 self-start text-xs text-gold hover:underline">
                          <Plus className="h-3 w-3" /> {mine.length ? "Añadir franja (turno partido)" : "Trabaja este día"}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          {barber && (
            <Card className="p-5">
              <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Bloqueos y descansos</h2>
              <form onSubmit={createBlock} className="mb-5 grid gap-3 sm:grid-cols-2">
                <Field label="Fecha">
                  <Input type="date" value={blk.date} onChange={(e) => setBlk({ ...blk, date: e.target.value })} required />
                </Field>
                <div className="flex items-end pb-3">
                  <Switch checked={blk.all_day} onChange={(v) => setBlk({ ...blk, all_day: v })} label="Todo el día" />
                </div>
                {!blk.all_day && (
                  <>
                    <Field label="Desde">
                      <Input type="time" value={blk.start} onChange={(e) => setBlk({ ...blk, start: e.target.value })} />
                    </Field>
                    <Field label="Hasta">
                      <Input type="time" value={blk.end} onChange={(e) => setBlk({ ...blk, end: e.target.value })} />
                    </Field>
                  </>
                )}
                <Field label="Motivo" className="sm:col-span-2">
                  <Input value={blk.reason} onChange={(e) => setBlk({ ...blk, reason: e.target.value })} placeholder="Vacaciones, médico…" />
                </Field>
                <Button type="submit" variant="outline" loading={pending} icon={<Lock className="h-4 w-4" />} className="sm:col-span-2">
                  Bloquear horario
                </Button>
              </form>
              {blocks.length === 0 ? (
                <p className="text-sm text-ink-500">Sin bloqueos próximos.</p>
              ) : (
                <ul className="divide-y divide-white/[0.06] text-sm">
                  {blocks.map((b) => (
                    <li key={b.id} className="flex items-center justify-between gap-3 py-2.5">
                      <span>
                        <span className="text-bone">
                          {new Intl.DateTimeFormat(locale, { timeZone: tz, weekday: "short", day: "numeric", month: "short" }).format(new Date(b.starts_at))}{" "}
                          {localTime(b.starts_at, tz)}–{localDate(b.ends_at, tz) !== localDate(b.starts_at, tz) ? localDate(b.ends_at, tz) + " " : ""}
                          {localTime(b.ends_at, tz)}
                        </span>
                        <span className="block text-xs text-ink-400">
                          {b.reason || "Sin motivo"}
                          {!b.barber_id && " · toda la barbería"}
                        </span>
                      </span>
                      <button
                        onClick={() =>
                          start(async () => {
                            const r = await deleteBlock(b.id);
                            if (r.ok) router.refresh();
                            else toast.error(r.error);
                          })
                        }
                        className="grid h-9 w-9 place-items-center rounded-full text-ink-400 hover:text-danger"
                        aria-label="Eliminar bloqueo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
