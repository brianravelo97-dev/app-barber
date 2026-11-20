"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
      setLoading(false);
      return;
    }
    const next = params.get("next");
    router.replace(next && next.startsWith("/admin") ? next : "/admin");
    router.refresh();
  }

  async function reset() {
    if (!email) {
      setError("Ingresa tu correo para enviarte el enlace de recuperación.");
      return;
    }
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/admin/cuenta`,
    });
    if (error) setError(error.message);
    else setResetSent(true);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 rounded-3xl border border-white/[0.08] bg-ink-850/80 p-6 backdrop-blur">
      <Field label="Correo electrónico" htmlFor="email">
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="username" />
      </Field>
      <Field label="Contraseña" htmlFor="password">
        <div className="relative">
          <Input
            id="password"
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-bone"
            aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
      {error && <p className="rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
      {resetSent && <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-success">Te enviamos un correo para restablecer la contraseña.</p>}
      <Button type="submit" size="lg" loading={loading} icon={<Lock className="h-4 w-4" />}>
        Ingresar
      </Button>
      <button type="button" onClick={reset} className="text-xs text-ink-400 hover:text-bone">
        ¿Olvidaste tu contraseña?
      </button>
    </form>
  );
}
