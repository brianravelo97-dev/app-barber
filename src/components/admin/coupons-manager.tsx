"use client";

import { Pencil, Plus, Tag, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCoupon, saveCoupon } from "@/app/admin/actions/marketing";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch } from "@/components/ui/form";
import { Badge, EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatMoney } from "@/lib/format";
import type { Coupon } from "@/lib/types";

type Form = {
  code: string;
  description: string;
  discount_type: "percent" | "fixed";
  value: number;
  min_amount: number;
  starts_on: string;
  ends_on: string;
  max_uses: string;
  is_active: boolean;
};

const EMPTY: Form = { code: "", description: "", discount_type: "percent", value: 10, min_amount: 0, starts_on: "", ends_on: "", max_uses: "", is_active: true };

export function CouponsManager({ coupons, currency, locale }: { coupons: Coupon[]; currency: string; locale: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [edit, setEdit] = useState<{ id: string | null; f: Form } | null>(null);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((e) => (e ? { ...e, f: { ...e.f, [k]: v } } : e));

  function save() {
    if (!edit) return;
    const f = edit.f;
    start(async () => {
      const r = await saveCoupon(edit.id, {
        ...f,
        starts_on: f.starts_on || null,
        ends_on: f.ends_on || null,
        max_uses: f.max_uses ? Number(f.max_uses) : null,
      });
      if (r.ok) {
        toast.success("Cupón guardado");
        setEdit(null);
        router.refresh();
      } else toast.error(r.error);
    });
  }

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setEdit({ id: null, f: EMPTY })}>
          Nuevo cupón
        </Button>
      </div>
      {coupons.length === 0 ? (
        <EmptyState icon={<Tag className="h-6 w-6" />} title="Sin cupones" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {coupons.map((c) => (
            <div key={c.id} className="rounded-2xl border border-dashed border-gold/30 bg-ink-850 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display text-2xl tracking-[0.15em] text-gold">{c.code}</p>
                  <p className="mt-1 text-sm text-bone">
                    {c.discount_type === "percent" ? `${c.value}% de descuento` : `${formatMoney(c.value, currency, locale)} de descuento`}
                  </p>
                </div>
                {c.is_active ? <Badge tone="success">Activo</Badge> : <Badge>Inactivo</Badge>}
              </div>
              {c.description && <p className="mt-2 text-xs text-ink-400">{c.description}</p>}
              <p className="mt-3 text-xs text-ink-500">
                Usos: {c.used_count}
                {c.max_uses ? ` / ${c.max_uses}` : ""} {c.ends_on && `· vence ${c.ends_on}`}
                {c.min_amount > 0 && ` · mín. ${formatMoney(c.min_amount, currency, locale)}`}
              </p>
              <div className="mt-4 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  icon={<Pencil className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setEdit({
                      id: c.id,
                      f: {
                        code: c.code,
                        description: c.description ?? "",
                        discount_type: c.discount_type,
                        value: c.value,
                        min_amount: c.min_amount,
                        starts_on: c.starts_on ?? "",
                        ends_on: c.ends_on ?? "",
                        max_uses: c.max_uses ? String(c.max_uses) : "",
                        is_active: c.is_active,
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
                    confirm(`¿Eliminar el cupón ${c.code}?`) &&
                    start(async () => {
                      const r = await deleteCoupon(c.id);
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
        title={edit?.id ? "Editar cupón" : "Nuevo cupón"}
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
            <Field label="Código" className="sm:col-span-2">
              <Input value={edit.f.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="uppercase tracking-widest" maxLength={30} />
            </Field>
            <Field label="Tipo">
              <Select value={edit.f.discount_type} onChange={(e) => set("discount_type", e.target.value as Form["discount_type"])}>
                <option value="percent">Porcentaje (%)</option>
                <option value="fixed">Monto fijo</option>
              </Select>
            </Field>
            <Field label="Valor">
              <Input type="number" min={0} step="any" value={edit.f.value} onChange={(e) => set("value", Number(e.target.value))} />
            </Field>
            <Field label="Válido desde">
              <Input type="date" value={edit.f.starts_on} onChange={(e) => set("starts_on", e.target.value)} />
            </Field>
            <Field label="Válido hasta">
              <Input type="date" value={edit.f.ends_on} onChange={(e) => set("ends_on", e.target.value)} />
            </Field>
            <Field label="Máximo de usos">
              <Input type="number" min={1} value={edit.f.max_uses} onChange={(e) => set("max_uses", e.target.value)} placeholder="Ilimitado" />
            </Field>
            <Field label="Monto mínimo del servicio">
              <Input type="number" min={0} value={edit.f.min_amount} onChange={(e) => set("min_amount", Number(e.target.value))} />
            </Field>
            <Field label="Descripción" className="sm:col-span-2">
              <Input value={edit.f.description} onChange={(e) => set("description", e.target.value)} maxLength={200} />
            </Field>
            <Switch checked={edit.f.is_active} onChange={(v) => set("is_active", v)} label="Activo" />
          </div>
        )}
      </Modal>
    </>
  );
}
