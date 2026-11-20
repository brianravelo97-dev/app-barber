"use client";

import { Pencil, Plus, Scissors, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteService, saveService, toggleService } from "@/app/admin/actions/catalog";
import { ImageInput } from "@/components/admin/image-input";
import { Button } from "@/components/ui/button";
import { Field, Input, Switch, Textarea } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { SmartImage } from "@/components/ui/smart-image";
import { useToast } from "@/components/ui/toast";
import { formatDuration, formatMoney } from "@/lib/format";
import type { Service } from "@/lib/types";

const EMPTY = {
  name: "",
  description: "",
  category: "",
  price: 0,
  duration_min: 30,
  image_url: null as string | null,
  is_active: true,
  is_featured: false,
  sort_order: 0,
};

export function ServicesManager({ services, currency, locale }: { services: Service[]; currency: string; locale: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<{ id: string | null; data: typeof EMPTY } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Service | null>(null);

  const open = (s?: Service) =>
    setEditing({
      id: s?.id ?? null,
      data: s
        ? {
            name: s.name,
            description: s.description ?? "",
            category: s.category ?? "",
            price: s.price,
            duration_min: s.duration_min,
            image_url: s.image_url,
            is_active: s.is_active,
            is_featured: s.is_featured,
            sort_order: s.sort_order,
          }
        : { ...EMPTY, sort_order: services.length + 1 },
    });

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setEditing((e) => (e ? { ...e, data: { ...e.data, [k]: v } } : e));

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    start(async () => {
      const r = await saveService(editing.id, editing.data);
      if (r.ok) {
        toast.success(editing.id ? "Servicio actualizado" : "Servicio creado");
        setEditing(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  function toggle(s: Service, field: "is_active" | "is_featured", v: boolean) {
    start(async () => {
      const r = await toggleService(s.id, field, v);
      if (r.ok) router.refresh();
      else toast.error(r.error);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => open()}>
          Nuevo servicio
        </Button>
      </div>

      {services.length === 0 ? (
        <EmptyState icon={<Scissors className="h-6 w-6" />} title="Sin servicios" description="Crea tu primer servicio." />
      ) : (
        <div className="grid gap-3">
          {services.map((s) => (
            <div key={s.id} className="flex flex-col gap-4 rounded-2xl border border-white/[0.07] bg-ink-850 p-4 sm:flex-row sm:items-center">
              <SmartImage src={s.image_url} alt="" className="h-16 w-24 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-display text-lg uppercase tracking-wide text-bone">{s.name}</h3>
                  {s.category && <Badge>{s.category}</Badge>}
                  {!s.is_active && <Badge tone="danger">Inactivo</Badge>}
                  {s.is_featured && <Badge tone="gold">Destacado</Badge>}
                </div>
                <p className="mt-0.5 text-sm text-ink-400">
                  {formatMoney(s.price, currency, locale)} · {formatDuration(s.duration_min)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Switch checked={s.is_active} onChange={(v) => toggle(s, "is_active", v)} label="Activo" disabled={pending} />
                <button
                  onClick={() => toggle(s, "is_featured", !s.is_featured)}
                  className={s.is_featured ? "text-gold" : "text-ink-500 hover:text-gold"}
                  aria-label="Destacar"
                  title="Destacar en la portada"
                >
                  <Star className={s.is_featured ? "h-5 w-5 fill-gold" : "h-5 w-5"} />
                </button>
                <Button size="icon" variant="ghost" onClick={() => open(s)} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setConfirmDelete(s)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4 text-danger" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        size="lg"
        title={editing?.id ? "Editar servicio" : "Nuevo servicio"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button type="submit" form="service-form" loading={pending}>
              Guardar
            </Button>
          </>
        }
      >
        {editing && (
          <form id="service-form" onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre" className="sm:col-span-2">
              <Input value={editing.data.name} onChange={(e) => set("name", e.target.value)} required maxLength={80} />
            </Field>
            <Field label="Precio">
              <Input type="number" min={0} step="any" value={editing.data.price} onChange={(e) => set("price", Number(e.target.value))} required />
            </Field>
            <Field label="Duración (minutos)">
              <Input type="number" min={5} max={480} step={5} value={editing.data.duration_min} onChange={(e) => set("duration_min", Number(e.target.value))} required />
            </Field>
            <Field label="Categoría" hint="Agrupa los servicios en el catálogo (Cortes, Barba…)">
              <Input value={editing.data.category} onChange={(e) => set("category", e.target.value)} maxLength={40} />
            </Field>
            <Field label="Orden">
              <Input type="number" min={0} value={editing.data.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea value={editing.data.description} onChange={(e) => set("description", e.target.value)} maxLength={600} rows={3} />
            </Field>
            <Field label="Fotografía" className="sm:col-span-2">
              <ImageInput value={editing.data.image_url} onChange={(v) => set("image_url", v)} folder="services" />
            </Field>
            <Switch checked={editing.data.is_active} onChange={(v) => set("is_active", v)} label="Activo" description="Visible y reservable" />
            <Switch checked={editing.data.is_featured} onChange={(v) => set("is_featured", v)} label="Destacado" description="Aparece en la portada" />
          </form>
        )}
      </Modal>

      <Modal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        size="sm"
        title="Eliminar servicio"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await deleteService(confirmDelete!.id);
                  if (r.ok) {
                    toast.success("Servicio eliminado");
                    setConfirmDelete(null);
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Eliminar
            </Button>
          </>
        }
      >
        <p className="text-sm text-ink-300">
          ¿Eliminar <strong className="text-bone">{confirmDelete?.name}</strong>? Si tiene reservas asociadas, te sugeriremos desactivarlo.
        </p>
      </Modal>
    </>
  );
}
