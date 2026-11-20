"use client";

import { Star } from "lucide-react";
import { useState } from "react";
import { clsx } from "clsx";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";

export function ReviewForm({ defaultCode, defaultName, onDone }: { defaultCode?: string; defaultName?: string; onDone?: () => void }) {
  const toast = useToast();
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(defaultName ?? "");
  const [comment, setComment] = useState("");
  const [code, setCode] = useState(defaultCode ?? "");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, rating, comment, code: code || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSent(true);
      toast.success("¡Gracias! Tu opinión será publicada tras ser revisada.");
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo enviar la reseña");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return <p className="py-6 text-center text-bone-dim">¡Gracias por tu opinión! La publicaremos tras revisarla.</p>;
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2">
        <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setRating(i)}
              onMouseEnter={() => setHover(i)}
              aria-label={`${i} estrellas`}
              className="p-1"
            >
              <Star className={clsx("h-9 w-9 transition-colors", (hover || rating) >= i ? "fill-gold text-gold" : "text-ink-600")} />
            </button>
          ))}
        </div>
      </div>
      <Field label="Tu nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} autoComplete="name" />
      </Field>
      <Field label="Comentario">
        <Textarea value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} placeholder="¿Cómo fue tu experiencia?" />
      </Field>
      <Field label="Código de reserva (opcional)" hint="Si lo ingresas, tu reseña aparecerá como visita verificada.">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={12} className="uppercase tracking-widest" />
      </Field>
      <Button type="submit" loading={loading} size="lg">
        Enviar opinión
      </Button>
    </form>
  );
}

export function ReviewButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Dejar mi opinión
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Tu opinión" description="Ayúdanos a mejorar y a otros a elegir.">
        <ReviewForm />
      </Modal>
    </>
  );
}
