"use client";

import { clsx } from "clsx";
import { Scissors } from "lucide-react";
import { useState } from "react";

/**
 * Imagen con carga diferida, fundido de entrada y respaldo elegante si la URL
 * falla o no existe (útil mientras el negocio sube sus propias fotos).
 */
export function SmartImage({
  src,
  alt,
  className,
  imgClassName,
  priority,
  label,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  label?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const show = src && !failed;

  return (
    <div className={clsx("relative overflow-hidden bg-ink-800", className)}>
      {!loaded && (
        <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(ellipse_at_top,rgba(200,161,101,0.14),transparent_60%),linear-gradient(160deg,#1c1c1c,#0e0e0e)]">
          <div className="flex flex-col items-center gap-2 text-gold/50">
            <Scissors className="h-7 w-7" strokeWidth={1.25} />
            {label && <span className="font-display text-[10px] uppercase tracking-[0.3em] text-ink-400">{label}</span>}
          </div>
        </div>
      )}
      {show && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          ref={(el) => {
            // La imagen pudo terminar de cargar antes de la hidratación.
            if (el?.complete) {
              if (el.naturalWidth > 0) setLoaded(true);
              else setFailed(true);
            }
          }}
          onLoad={() => setLoaded(true)}
          onError={() => setFailed(true)}
          className={clsx(
            "h-full w-full object-cover transition-opacity duration-700",
            loaded ? "opacity-100" : "opacity-0",
            imgClassName,
          )}
        />
      )}
    </div>
  );
}
