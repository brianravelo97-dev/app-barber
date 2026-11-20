import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="eyebrow">Error 404</p>
        <h1 className="h-display mt-4 text-6xl text-bone md:text-8xl">Página no encontrada</h1>
        <p className="mt-4 text-ink-400">El enlace no existe o la reserva no fue encontrada.</p>
        <Link href="/" className="mt-8 inline-flex h-12 items-center rounded-full bg-gold px-8 font-medium text-ink-950">
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
