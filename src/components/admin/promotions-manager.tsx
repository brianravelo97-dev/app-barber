"use client";

import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deletePromotion, savePromotion } from "@/app/admin/actions/marketing";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import type { Promotion, Service } from "@/lib/types";

type Form = {
  title: string;
  description: string;
  badge: string;
  image_url: string | null;
  coupon_code: string;
  service_id: string;
  starts_on: string;
  ends_on: string;
  is_active: boolean;
  sort_order: number;
};
const EMPTY: Form = { title: "", description: "", badge: "", image_url: null, coupon_code: "", service_id: "", starts_on: "", ends_on: "", is_active: true, sort_order: 0 };

export function PromotionsManager({ promotions, services }: { promotions: Promotion[]; services: Service[] }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<{ id: string | null; f: Form } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, f: { ...e.f, [k]: v } } : e));

  function save() {
    if (!edit) return;
    const f = edit.f;
    start(async () => {
      const r = await savePromotion(edit.id, {
        ...f,
        service_id: f.service_id || null,
        starts_on: f.starts_on || null,
        ends_on: f.ends_on || null,
        coupon_code: f.coupon_code.toUpperCase() || null,
      });
      if (r.ok) {
        toast.success("Promoción guardada");
        setEdit(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ id: null, f: { ...EMPTY, sort_order: promotions.length + 1 } })}>
          Nueva promoción
        </Button>
      </div>
      {promotions.length === 0 ? (
        <EmptyState icon={<Megaphone className="h-6 w-6" />} title="Sin promociones" />
      ) : (
        <div className="grid gap-3">
          {promotions.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-ink-850 p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {p.badge && <Badge tone="gold">{p.badge}</Badge>}
                  <h3 className="font-display text-lg uppercase tracking-wide text-bone">{p.title}</h3>
                  {!p.is_active && <Badge>Inactiva</Badge>}
                </div>
                {p.description && <p className="mt-1 text-sm text-ink-400">{p.description}</p>}
                <p className="mt-1 text-xs text-ink-500">
                  {p.starts_on || p.ends_on ? `Vigencia: ${p.starts_on ?? "…"} → ${p.ends_on ?? "…"}` : "Sin fecha de término"}
                  {p.coupon_code && ` · Cupón ${p.coupon_code}`}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setEdit({
                      id: p.id,
                      f: {
                        title: p.title,
                        description: p.description ?? "",
                        badge: p.badge ?? "",
                        image_url: p.image_url,
                        coupon_code: p.coupon_code ?? "",
                        service_id: p.service_id ?? "",
                        starts_on: p.starts_on ?? "",
                        ends_on: p.ends_on ?? "",
                        is_active: p.is_active,
                        sort_order: p.sort_order,
                      },
                    })
                  }
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<Trash2 className="h-3.5 w-3.5 text-danger" />}
                  onClick={() =>
                    confirm("¿Eliminar esta promoción?") &&
                    start(async () => {
                      const r = await deletePromotion(p.id);
                      if (r.ok) router.refresh();
                      else toast.error(r.error);
                    })
                  }
                >
                  Eliminar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal
        open={!!edit}
        onClose={() => setEdit(null)}
        size="lg"
        title={edit?.id ? "Editar promoción" : "Nueva promoción"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEdit(null)}>
              Cancelar
            </Button>
            <Button loading={pending} onClick={save}>
              Guardar
            </Button>
          </>
        }
      >
        {edit && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Título" className="sm:col-span-2">
              <Input value={edit.f.title} onChange={(e) => set("title", e.target.value)} maxLength={80} />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Textarea value={edit.f.description} onChange={(e) => set("description", e.target.value)} maxLength={300} rows={2} />
            </Field>
            <Field label="Etiqueta" hint="Ej: -20%, Nuevo, Martes">
              <Input value={edit.f.badge} onChange={(e) => set("badge", e.target.value)} maxLength={24} />
            </Field>
            <Field label="Cupón asociado" hint="Se precarga al reservar">
              <Input value={edit.f.coupon_code} onChange={(e) => set("coupon_code", e.target.value.toUpperCase())} maxLength={30} />
            </Field>
            <Field label="Servicio vinculado" className="sm:col-span-2">
              <Select value={edit.f.service_id} onChange={(e) => set("service_id", e.target.value)}>
                <option value="">Ninguno</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Desde">
              <Input type="date" value={edit.f.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
            </Field>
            <Field label="Hasta">
              <Input type="date" value={edit.f.ends_on} onChange={(e) => set("ends_on", e.target.value)} />
            </Field>
            <Field label="Orden">
              <Input type="number" min={0} value={edit.f.sort_order} onChange={(e) => set("sort_order", Number(e.target.value))} />
            </Field>
            <div className="flex items-end pb-3">
              <Switch checked={edit.f.is_active} onChange={(v) => set("is_active", v)} label="Activa" />
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
