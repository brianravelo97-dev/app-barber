"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="eyebrow">Algo salió mal</p>
        <h1 className="h-display mt-4 text-5xl text-bone md:text-7xl">Error temporal</h1>
        <p className="mt-4 text-ink-400">No pudimos cargar esta página. Inténtalo nuevamente en unos segundos.</p>
        <div className="mt-8 flex justify-center gap-3">
          <button onClick={reset} className="inline-flex h-12 items-center rounded-full bg-gold px-8 font-medium text-ink-950">
            Reintentar
          </button>
          <Link href="/" className="inline-flex h-12 items-center rounded-full border border-white/15 px-8 text-bone">
            Inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
