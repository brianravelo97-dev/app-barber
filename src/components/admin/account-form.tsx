"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { Card } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";

export function AccountForm({ fullName }: { fullName: string }) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(fullName);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = createClient();
    const { data } = await sb.auth.getUser();
    // El usuario solo puede actualizar su propio nombre a través de los metadatos de Auth.
    const { error } = await sb.auth.updateUser({ data: { full_name: name } });
    if (!error && data.user) await sb.from("profiles").update({ full_name: name }).eq("id", data.user.id);
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Nombre actualizado");
      router.refresh();
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 10) return toast.error("La contraseña debe tener al menos 10 caracteres.");
    if (pw !== pw2) return toast.error("Las contraseñas no coinciden.");
    setLoading(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Contraseña actualizada");
      setPw("");
      setPw2("");
    }
  }

  return (
    <div className="grid max-w-3xl gap-4 md:grid-cols-2">
      <Card className="p-5">
        <form onSubmit={saveName} className="grid gap-4">
          <h2 className="font-display text-lg uppercase tracking-wide">Perfil</h2>
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </Field>
          <Button type="submit" loading={loading}>
            Guardar
          </Button>
        </form>
      </Card>
      <Card className="p-5">
        <form onSubmit={savePassword} className="grid gap-4">
          <h2 className="font-display text-lg uppercase tracking-wide">Cambiar contraseña</h2>
          <Field label="Nueva contraseña">
            <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" minLength={10} required />
          </Field>
          <Field label="Repetir contraseña">
            <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" required />
          </Field>
          <Button type="submit" loading={loading}>
            Actualizar contraseña
          </Button>
        </form>
      </Card>
    </div>
  );
}
