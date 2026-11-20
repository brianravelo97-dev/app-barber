"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ReviewForm } from "@/components/site/review-form";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export function BookingManage({
  code,
  canCancel,
  canReview,
  customerName,
  policy,
  windowHours,
}: {
  code: string;
  canCancel: boolean;
  canReview: boolean;
  customerName: string;
  policy: string | null;
  windowHours: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  async function cancel(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/bookings/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Tu reserva fue cancelada.");
      setOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo cancelar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {canCancel && (
        <div className="mt-8 rounded-2xl border border-white/[0.07] p-5 text-sm text-ink-400">
          <p>
            ¿No puedes asistir? Puedes cancelar online hasta {windowHours} h antes.{" "}
            <button className="text-gold underline-offset-4 hover:underline" onClick={() => setOpen(true)}>
              Cancelar reserva
            </button>
          </p>
        </div>
      )}
      {canReview && (
        <div className="mt-8 rounded-3xl border border-white/[0.07] bg-ink-850 p-6">
          <h2 className="mb-4 font-display text-xl uppercase tracking-wide text-bone">¿Cómo te fue?</h2>
          <ReviewForm defaultCode={code} defaultName={customerName} />
        </div>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancelar reserva"
        description="Por seguridad, confirma el teléfono con el que reservaste."
      >
        <form onSubmit={cancel} className="flex flex-col gap-4">
          <Field label="Teléfono">
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+56 9 1234 5678" autoFocus />
          </Field>
          {policy && <p className="text-xs text-ink-400">{policy}</p>}
          <Button type="submit" variant="danger" loading={loading}>
            Sí, cancelar mi reserva
          </Button>
        </form>
      </Modal>
    </>
  );
}
