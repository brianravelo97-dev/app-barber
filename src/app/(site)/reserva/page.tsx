import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";

export const metadata: Metadata = { title: "Gestionar mi reserva", robots: { index: false } };

async function lookup(formData: FormData) {
  "use server";
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (code.length >= 4) redirect(`/reserva/${code}`);
}

export default function LookupPage() {
  return (
    <div className="pb-24 pt-32 md:pt-40">
      <div className="mx-auto max-w-md px-5 text-center">
        <span className="eyebrow">Mi reserva</span>
        <h1 className="h-display mt-3 text-4xl text-bone md:text-5xl">Consulta tu reserva</h1>
        <p className="mt-4 text-ink-400">Ingresa el número de reserva que recibiste al reservar.</p>
        <form action={lookup} className="mt-8 flex flex-col gap-3">
          <Input
            name="code"
            required
            minLength={4}
            maxLength={12}
            placeholder="Ej: 7K3Q9M"
            className="h-14 text-center font-display text-2xl uppercase tracking-[0.3em]"
            aria-label="Número de reserva"
          />
          <Button type="submit" size="lg">
            Ver reserva
          </Button>
        </form>
      </div>
    </div>
  );
}
