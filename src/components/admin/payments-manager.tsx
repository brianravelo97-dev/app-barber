"use client";

import { Plus, Receipt, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addPayment, deletePayment } from "@/app/admin/actions/customers";
import type { PaymentRow } from "@/app/admin/(panel)/pagos/page";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/misc";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatMoney, PAYMENT_LABEL } from "@/lib/format";

export function PaymentsManager({
  rows,
  tz,
  currency,
  locale,
  canDelete,
}: {
  rows: PaymentRow[];
  tz: string;
  currency: string;
  locale: string;
  canDelete: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => setOpen(true)}>
          Registrar pago manual
        </Button>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-white/[0.07] bg-ink-850">
          <EmptyState icon={<Receipt className="h-6 w-6" />} title="Sin pagos en el período" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-850">
          <ul className="divide-y divide-white/[0.05] text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center gap-4 px-4 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-bone">
                    {r.bookings ? `${r.bookings.service_name} · ${r.bookings.customer_name}` : r.notes || "Pago manual"}
                  </span>
                  <span className="text-xs text-ink-400">
                    {formatDateTime(r.paid_at, tz, locale)} · {PAYMENT_LABEL[r.method]}
                    {r.bookings && ` · #${r.bookings.code}`}
                  </span>
                </span>
                <span className="font-display text-lg tabular-nums text-bone">{formatMoney(r.amount, currency, locale)}</span>
                {canDelete && (
                  <button
                    onClick={() =>
                      confirm("¿Eliminar este pago?") &&
                      start(async () => {
                        const res = await deletePayment(r.id);
                        if (res.ok) router.refresh();
                        else toast.error(res.error);
                      })
                    }
                    className="grid h-9 w-9 place-items-center rounded-full text-ink-500 hover:text-danger"
                    aria-label="Eliminar pago"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Pago manual"
        description="Venta de productos, propinas u otros ingresos."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await addPayment({ amount: Number(amount), method, notes });
                  if (r.ok) {
                    toast.success("Pago registrado");
                    setOpen(false);
                    setAmount("");
                    setNotes("");
                    router.refresh();
                  } else toast.error(r.error);
                })
              }
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <Field label="Monto">
            <Input type="number" min={0} step="any" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="Medio de pago">
            <Select value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Concepto">
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ej: cera para el pelo" maxLength={200} />
          </Field>
        </div>
      </Modal>
    </>
  );
}
