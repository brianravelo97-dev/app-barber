"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createAdminBooking } from "@/app/admin/actions/bookings";
import { SlotPicker } from "@/components/admin/slot-picker";
import type { AdminCtx } from "@/components/admin/booking-detail";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDuration, formatMoney } from "@/lib/format";
import { todayInTz, zonedToUtcISO } from "@/lib/time";
import type { Service } from "@/lib/types";

export function NewBookingButton({
  ctx,
  services,
  defaultDate,
  defaultBarber,
  label = "Nueva reserva",
}: {
  ctx: AdminCtx;
  services: Service[];
  defaultDate?: string;
  defaultBarber?: string | null;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)} icon={<Plus className="h-4 w-4" />} size="sm">
        {label}
      </Button>
      {open && (
        <NewBookingModal
          ctx={ctx}
          services={services}
          defaultDate={defaultDate}
          defaultBarber={defaultBarber}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export function NewBookingModal({
  ctx,
  services,
  defaultDate,
  defaultBarber,
  defaultTime,
  onClose,
}: {
  ctx: AdminCtx;
  services: Service[];
  defaultDate?: string;
  defaultBarber?: string | null;
  defaultTime?: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [barberId, setBarberId] = useState<string>(defaultBarber ?? "");
  const [date, setDate] = useState(defaultDate ?? todayInTz(ctx.tz));
  const [slot, setSlot] = useState<{ start: string; barbers: string[] } | null>(null);
  const [force, setForce] = useState(Boolean(defaultTime));
  const [time, setTime] = useState(defaultTime ?? "");
  const [walkIn, setWalkIn] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (force && !barberId) return toast.error("Para forzar una hora debes elegir un barbero.");
    const startsAt = force ? zonedToUtcISO(date, time, ctx.tz) : slot?.start;
    if (!startsAt) return toast.error("Selecciona una hora.");
    start(async () => {
      const r = await createAdminBooking({
        serviceId,
        barberId: barberId || (slot?.barbers[0] ?? null),
        startsAt,
        name,
        phone,
        email: email || null,
        notes: notes || null,
        force,
        walkIn,
      });
      if (r.ok) {
        toast.success(`Reserva ${r.data?.code} creada`);
        router.refresh();
        onClose();
      } else toast.error(r.error);
    });
  }

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title="Nueva reserva"
      description="Reserva telefónica, presencial o cliente sin cita."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            Cancelar
          </Button>
          <Button type="submit" form="new-booking" loading={pending}>
            Crear reserva
          </Button>
        </>
      }
    >
      <form id="new-booking" onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Servicio" className="sm:col-span-2">
          <Select value={serviceId} onChange={(e) => { setServiceId(e.target.value); setSlot(null); }} required>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {formatDuration(s.duration_min)} · {formatMoney(s.price, ctx.currency, ctx.locale)}
                {!s.is_active ? " (inactivo)" : ""}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Barbero">
          <Select value={barberId} onChange={(e) => { setBarberId(e.target.value); setSlot(null); }}>
            <option value="">Cualquiera disponible</option>
            {ctx.barbers.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setSlot(null); }} required />
        </Field>
        <div className="sm:col-span-2">
          <Switch checked={force} onChange={setForce} label="Hora manual (forzar)" description="Ignora horario laboral. Nunca permite solapar reservas." />
        </div>
        <div className="sm:col-span-2">
          {force ? (
            <Field label="Hora de inicio">
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} required step={300} />
            </Field>
          ) : (
            <SlotPicker serviceId={serviceId} date={date} barberId={barberId || null} value={slot} onChange={setSlot} tz={ctx.tz} />
          )}
        </div>
        <Field label="Nombre del cliente">
          <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
        </Field>
        <Field label="Teléfono">
          <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+56 9 ..." />
        </Field>
        <Field label="Correo (opcional)">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <div className="flex items-end pb-3">
          <Switch checked={walkIn} onChange={setWalkIn} label="Cliente sin cita (walk-in)" description="No envía notificación." />
        </div>
        <Field label="Notas" className="sm:col-span-2">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} />
        </Field>
      </form>
    </Modal>
  );
}
