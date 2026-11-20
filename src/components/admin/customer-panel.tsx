"use client";

import { Gift } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { adjustPoints, redeemReward, updateCustomer } from "@/app/admin/actions/customers";
import { WhatsAppIcon } from "@/components/icons";
import { Button, buttonClass } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { whatsappLink } from "@/lib/format";
import type { CustomerOverview } from "@/lib/types";

export function CustomerPanel({
  customer,
  loyalty,
  tz,
  locale,
}: {
  customer: CustomerOverview;
  loyalty: { threshold: number; reward: string | null } | null;
  tz: string;
  locale: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(customer.full_name);
  const [email, setEmail] = useState(customer.email ?? "");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const wa = whatsappLink(customer.phone, `Hola ${customer.full_name.split(" ")[0]}!`);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(msg);
        router.refresh();
      } else toast.error(r.error ?? "Error");
    });

  const pct = loyalty ? Math.min(100, (customer.loyalty_points / loyalty.threshold) * 100) : 0;

  return (
    <>
      {loyalty && (
        <Card className="overflow-hidden p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg uppercase tracking-wide">Fidelización</h2>
            <Gift className="h-5 w-5 text-gold" />
          </div>
          <p className="mt-3 font-display text-4xl text-gold tabular-nums">
            {customer.loyalty_points} <span className="text-base text-ink-400">/ {loyalty.threshold} pts</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-gold" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-ink-400">Recompensa: {loyalty.reward ?? "—"}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button size="sm" disabled={customer.loyalty_points < loyalty.threshold} loading={pending} onClick={() => run(() => redeemReward(customer.id), "Recompensa canjeada")}>
              Canjear recompensa
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(() => adjustPoints(customer.id, 10), "+10 puntos")}>
              +10
            </Button>
            <Button size="sm" variant="ghost" onClick={() => run(() => adjustPoints(customer.id, -10), "-10 puntos")}>
              −10
            </Button>
          </div>
        </Card>
      )}
      <Card className="p-5">
        <h2 className="mb-4 font-display text-lg uppercase tracking-wide">Datos</h2>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            run(() => updateCustomer(customer.id, { full_name: name, email, notes }), "Cliente actualizado");
          }}
        >
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label="Teléfono" hint="El teléfono identifica al cliente y no se puede editar.">
            <Input value={customer.phone} disabled />
          </Field>
          <Field label="Correo">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Notas internas" hint="Preferencias, tipo de cabello, alergias…">
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} maxLength={1000} />
          </Field>
          <div className="flex gap-2">
            <Button type="submit" loading={pending} className="flex-1">
              Guardar
            </Button>
            {wa && (
              <a href={wa} target="_blank" rel="noopener noreferrer" className={buttonClass("outline", "md")}>
                <WhatsAppIcon className="h-4 w-4" />
              </a>
            )}
          </div>
          <p className="text-[11px] text-ink-500">
            Cliente desde {new Intl.DateTimeFormat(locale, { timeZone: tz, day: "numeric", month: "long", year: "numeric" }).format(new Date(customer.created_at))}
          </p>
        </form>
      </Card>
    </>
  );
}
