"use client";

import { clsx } from "clsx";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  side = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Panel lateral (drawer) en escritorio, hoja inferior en móvil */
  side?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const widths = { sm: "sm:max-w-sm", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 animate-fade-in bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        ref={panelRef}
        tabIndex={-1}
        className={clsx(
          "relative flex max-h-[92dvh] w-full flex-col overflow-hidden border border-white/10 bg-ink-850 shadow-2xl outline-none",
          side
            ? "animate-fade-up rounded-t-3xl sm:absolute sm:inset-y-0 sm:right-0 sm:max-h-none sm:max-w-md sm:animate-slide-in sm:rounded-none sm:rounded-l-3xl"
            : clsx("animate-fade-up rounded-t-3xl sm:animate-scale-in sm:rounded-3xl", widths[size]),
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.07] px-6 py-5">
            <div>
              {title && <h2 className="font-display text-xl uppercase tracking-wide text-bone">{title}</h2>}
              {description && <p className="mt-1 text-sm text-ink-400">{description}</p>}
            </div>
            <button
              onClick={onClose}
              className="-mr-2 grid h-9 w-9 shrink-0 place-items-center rounded-full text-ink-400 hover:bg-white/5 hover:text-bone"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="scrollbar-thin flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-white/[0.07] bg-ink-900/60 px-6 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
