import { clsx } from "clsx";
import type { ReactNode } from "react";
import { STATUS_LABEL } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx("card-surface", className)}>{children}</div>;
}

type Tone = "gold" | "neutral" | "success" | "warning" | "danger" | "info";
const tones: Record<Tone, string> = {
  gold: "bg-gold/12 text-gold-light border-gold/25",
  neutral: "bg-white/[0.06] text-bone-dim border-white/10",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/12 text-warning border-warning/25",
  danger: "bg-danger/12 text-danger border-danger/25",
  info: "bg-info/12 text-info border-info/25",
};

export function Badge({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export const STATUS_TONE: Record<BookingStatus, Tone> = {
  pending: "warning",
  confirmed: "info",
  completed: "success",
  cancelled: "neutral",
  no_show: "danger",
};

/** Colores de estado para la agenda (fondo + borde). */
export const STATUS_STYLE: Record<BookingStatus, string> = {
  pending: "bg-warning/15 border-warning/60 text-warning",
  confirmed: "bg-info/15 border-info/60 text-[#a9c8ec]",
  completed: "bg-success/15 border-success/60 text-[#9fd6b4]",
  cancelled: "bg-white/[0.04] border-white/20 text-ink-400 line-through",
  no_show: "bg-danger/15 border-danger/60 text-[#f0a29c]",
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("flex flex-col items-center justify-center gap-3 px-6 py-14 text-center", className)}>
      {icon && <div className="grid h-14 w-14 place-items-center rounded-full bg-white/[0.04] text-gold">{icon}</div>}
      <h3 className="font-display text-lg uppercase tracking-wide text-bone">{title}</h3>
      {description && <p className="max-w-sm text-sm text-ink-400">{description}</p>}
      {action}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("animate-pulse rounded-xl bg-white/[0.05]", className)} />;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div
      className={clsx(
        "mb-10 flex flex-col gap-4 md:mb-14",
        align === "center" ? "items-center text-center" : "md:flex-row md:items-end md:justify-between",
      )}
    >
      <div className={clsx("flex flex-col gap-3", align === "center" && "items-center")}>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2 className="h-display text-4xl text-bone sm:text-5xl md:text-6xl">{title}</h2>
        {description && <p className="max-w-xl text-[15px] leading-relaxed text-ink-300">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" className={i <= value ? "text-gold" : "text-ink-600"}>
          <path
            fill="currentColor"
            d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5L2.5 9.4l6.6-.9L12 2.5z"
          />
        </svg>
      ))}
    </span>
  );
}
