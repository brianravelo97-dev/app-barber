"use client";

import { Ban, BellRing, CalendarClock, Check, CircleCheck, Phone, RotateCcw, UserX } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  completeBooking,
  rescheduleBooking,
  revertCompleted,
  sendReminderNow,
  setBookingStatus,
  updateBookingNotes,
} from "@/app/admin/actions/bookings";
import { SlotPicker } from "@/components/admin/slot-picker";
import { WhatsAppIcon } from "@/components/icons";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Select, Switch, Textarea } from "@/components/ui/form";
import { StatusBadge } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { capitalize, formatDateTime, formatLongDate, formatMoney, formatTime, PAYMENT_LABEL, whatsappLink } from "@/lib/format";
import { localDate, zonedToUtcISO } from "@/lib/time";
import type { Barber, Booking, PaymentMethod } from "@/lib/types";

export type AdminCtx = { tz: string; currency: string; locale: string; barbers: Barber[] };

export function BookingDetail({ booking, ctx, onClose }: { booking: Booking | null; ctx: AdminCtx; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [mode, setMode] = useState<"view" | "pay" | "reschedule" | "cancel">("view");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [reason, setReason] = useState("");
  const [rDate, setRDate] = useState("");
  const [rBarber, setRBarber] = useState<string>("");
  const [rSlot, setRSlot] = useState<{ start: string; barbers: string[] } | null>(null);
  const [force, setForce] = useState(false);
  const [manualTime, setManualTime] = useState("");
  const [notes, setNotes] = useState<string | null>(null);

  if (!booking) return null;
  const b = booking;
  const money = (n: number) => formatMoney(n, ctx.currency, ctx.locale);
  const barber = ctx.barbers.find((x) => x.id === b.barber_id);
  const active = b.status === "pending" || b.status === "confirmed";

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(msg);
        setMode("view");
        router.refresh();
        onClose();
      } else toast.error(r.error ?? "Error");
    });
  }

  function openReschedule() {
    setRDate(localDate(b.starts_at, ctx.tz));
    setRBarber(b.barber_id);
    setRSlot(null);
    setForce(false);
    setManualTime("");
    setMode("reschedule");
  }

  const wa = whatsappLink(
    b.customer_phone,
    `Hola ${b.customer_name.split(" ")[0]}, te escribimos por tu reserva ${b.code} del ${formatLongDate(b.starts_at, ctx.tz, ctx.locale)} a las ${formatTime(b.starts_at, ctx.tz)}.`,
  );

  return (
    <Modal open onClose={onClose} side title={b.service_name} description={`Reserva ${b.code}`}>
      {mode === "view" && (
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <StatusBadge status={b.status} />
            <span className="font-display text-2xl text-gold">{money(b.total)}</span>
          </div>

          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-500">Fecha y hora</dt>
              <dd className="text-bone">
                {capitalize(formatLongDate(b.starts_at, ctx.tz, ctx.locale))} · {formatTime(b.starts_at, ctx.tz)}–{formatTime(b.ends_at, ctx.tz)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-500">Barbero</dt>
              <dd className="flex items-center gap-2 text-bone">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: barber?.color }} /> {barber?.name ?? "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] uppercase tracking-wider text-ink-500">Origen</dt>
              <dd className="text-bone">{b.source === "web" ? "Web" : b.source === "walk_in" ? "Sin reserva" : "Panel"}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-[11px] uppercase tracking-wider text-ink-500">Cliente</dt>
              <dd className="text-bone">
                <Link href={`/admin/clientes/${b.customer_id}`} className="hover:text-gold">
                  {b.customer_name}
                </Link>
              </dd>
              <dd className="text-ink-400">{b.customer_phone}</dd>
              {b.customer_email && <dd className="text-ink-400">{b.customer_email}</dd>}
            </div>
            {b.discount > 0 && (
              <div className="col-span-2 text-ink-400">
                Precio {money(b.price)} · descuento {money(b.discount)}
              </div>
            )}
            {b.cancel_reason && b.status === "cancelled" && (
              <div className="col-span-2 rounded-xl bg-white/[0.03] p-3 text-ink-400">Motivo: {b.cancel_reason}</div>
            )}
          </dl>

          <div className="flex gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "sm", "flex-1")}>
                <WhatsAppIcon className="h-4 w-4" /> WhatsApp
              </a>
            )}
            <a href={`tel:${b.customer_phone}`} className={buttonClass("outline", "sm", "flex-1")}>
              <Phone className="h-4 w-4" /> Llamar
            </a>
          </div>

          <Field label="Notas">
            <Textarea
              defaultValue={b.notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Notas internas o del cliente"
            />
          </Field>
          {notes !== null && notes !== (b.notes ?? "") && (
            <Button size="sm" variant="outline" loading={pending} onClick={() => run(() => updateBookingNotes(b.id, notes), "Notas guardadas")}>
              Guardar notas
            </Button>
          )}

          <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] pt-5">
            {b.status === "pending" && (
              <Button variant="primary" className="col-span-2" loading={pending} icon={<Check className="h-4 w-4" />} onClick={() => run(() => setBookingStatus(b.id, "confirmed"), "Reserva confirmada")}>
                Confirmar reserva
              </Button>
            )}
            {(active || b.status === "no_show") && (
              <Button
                variant="success"
                icon={<CircleCheck className="h-4 w-4" />}
                onClick={() => {
                  setAmount(String(b.total));
                  setMode("pay");
                }}
              >
                Atendido
              </Button>
            )}
            {active && (
              <Button variant="outline" icon={<UserX className="h-4 w-4" />} loading={pending} onClick={() => run(() => setBookingStatus(b.id, "no_show"), "Inasistencia registrada")}>
                No asistió
              </Button>
            )}
            {active && (
              <Button variant="outline" icon={<CalendarClock className="h-4 w-4" />} onClick={openReschedule}>
                Reprogramar
              </Button>
            )}
            {active && (
              <Button variant="outline" icon={<BellRing className="h-4 w-4" />} loading={pending} onClick={() => run(() => sendReminderNow(b.id), "Recordatorio procesado (ver Notificaciones)")}>
                Recordar
              </Button>
            )}
            {active && (
              <Button variant="danger" className="col-span-2" icon={<Ban className="h-4 w-4" />} onClick={() => setMode("cancel")}>
                Cancelar reserva
              </Button>
            )}
            {b.status === "completed" && (
              <Button variant="outline" className="col-span-2" icon={<RotateCcw className="h-4 w-4" />} loading={pending} onClick={() => run(() => revertCompleted(b.id), "Estado revertido")}>
                Deshacer «atendido»
              </Button>
            )}
            {(b.status === "cancelled" || b.status === "no_show") && (
              <Button variant="outline" className="col-span-2" icon={<RotateCcw className="h-4 w-4" />} loading={pending} onClick={() => run(() => setBookingStatus(b.id, "confirmed"), "Reserva reactivada")}>
                Reactivar reserva
              </Button>
            )}
          </div>
          <p className="text-[11px] text-ink-500">
            Creada {formatDateTime(b.created_at, ctx.tz, ctx.locale)}
            {b.reminder_sent_at && ` · recordatorio ${formatDateTime(b.reminder_sent_at, ctx.tz, ctx.locale)}`}
          </p>
        </div>
      )}

      {mode === "pay" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => completeBooking(b.id, { amount: Number(amount), method }), "Cliente atendido y pago registrado");
          }}
        >
          <p className="text-sm text-ink-300">Registra el pago recibido. Se sumarán puntos de fidelización si está activado.</p>
          <Field label="Monto cobrado">
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </Field>
          <Field label="Medio de pago">
            <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setMode("view")}>
              Volver
            </Button>
            <Button type="submit" variant="primary" className="flex-1" loading={pending}>
              Confirmar atención
            </Button>
          </div>
        </form>
      )}

      {mode === "cancel" && (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => setBookingStatus(b.id, "cancelled", reason), "Reserva cancelada");
          }}
        >
          <Field label="Motivo (opcional)" hint="Se notificará al cliente si hay integraciones configuradas.">
            <Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} />
          </Field>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setMode("view")}>
              Volver
            </Button>
            <Button type="submit" variant="danger" className="flex-1" loading={pending}>
              Cancelar reserva
            </Button>
          </div>
        </form>
      )}

      {mode === "reschedule" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <Input type="date" value={rDate} onChange={(e) => { setRDate(e.target.value); setRSlot(null); }} />
            </Field>
            <Field label="Barbero">
              <Select value={rBarber} onChange={(e) => { setRBarber(e.target.value); setRSlot(null); }}>
                {ctx.barbers.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Switch checked={force} onChange={setForce} label="Forzar hora manual" description="Permite fuera de horario. Nunca permite solapar otra reserva." />
          {force ? (
            <Field label="Hora de inicio">
              <Input type="time" value={manualTime} onChange={(e) => setManualTime(e.target.value)} step={300} />
            </Field>
          ) : (
            <SlotPicker serviceId={b.service_id} date={rDate} barberId={rBarber} ignoreBookingId={b.id} value={rSlot} onChange={setRSlot} tz={ctx.tz} />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setMode("view")}>
              Volver
            </Button>
            <Button
              className="flex-1"
              loading={pending}
              disabled={force ? !manualTime || !rDate : !rSlot}
              onClick={() => {
                const startsAt = force ? zonedToUtcISO(rDate, manualTime, ctx.tz) : rSlot!.start;
                run(() => rescheduleBooking(b.id, startsAt, rBarber, force), "Cita reprogramada");
              }}
            >
              Guardar nueva hora
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
