import type { Metadata } from "next";
import { Suspense } from "react";
import { LogoMark } from "@/components/icons";
import { LoginForm } from "@/components/admin/login-form";
import { isSupabaseConfigured } from "@/lib/env";

export const metadata: Metadata = { title: "Acceso administración", robots: { index: false } };

export default function LoginPage() {
  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden px-5">
      <div className="pointer-events-none absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-gold/10 blur-3xl" />
      <div className="relative w-full max-w-sm">
        <div className="mb-10 flex flex-col items-center text-center">
          <LogoMark className="h-14 w-14 text-gold" />
          <h1 className="mt-6 font-display text-2xl uppercase tracking-[0.2em] text-bone">Panel de gestión</h1>
          <p className="mt-2 text-sm text-ink-400">Acceso exclusivo para el equipo</p>
        </div>
        {isSupabaseConfigured ? (
          <Suspense>
            <LoginForm />
          </Suspense>
        ) : (
          <div className="rounded-2xl border border-warning/30 bg-warning/10 p-5 text-sm text-warning">
            Supabase no está configurado. Define <code>NEXT_PUBLIC_SUPABASE_URL</code> y <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> en
            <code> .env.local</code> (ver README).
          </div>
        )}
      </div>
    </div>
  );
}
