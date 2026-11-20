"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";

export function WaitlistForm({
  serviceId,
  barberId,
  date,
  defaultName,
  defaultPhone,
}: {
  serviceId: string | null;
  barberId: string | null;
  date: string;
  defaultName?: string;
  defaultPhone?: string;
}) {
  const toast = useToast();
  const [name, setName] = useState(defaultName ?? "");
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, serviceId, barberId, date, timeFrom: from || null, timeTo: to || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setDone(true);
      toast.success("Te avisaremos si se libera un horario.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo registrar");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <p className="text-sm text-success">¡Listo! Estás en la lista de espera para este día. Te contactaremos si se libera una hora.</p>;
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} autoComplete="name" />
      </Field>
      <Field label="Teléfono">
        <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+56 9 ..." autoComplete="tel" />
      </Field>
      <Field label="Desde (opcional)">
        <Input type="time" value={from} onChange={(e) => setFrom(e.target.value)} />
      </Field>
      <Field label="Hasta (opcional)">
        <Input type="time" value={to} onChange={(e) => setTo(e.target.value)} />
      </Field>
      <Button type="submit" variant="outline" loading={loading} className="sm:col-span-2">
        Avísame si se libera una hora
      </Button>
    </form>
  );
}
