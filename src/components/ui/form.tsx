import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ComponentProps, ReactNode } from "react";

export const inputClass =
  "w-full rounded-xl border border-white/10 bg-ink-900 px-4 h-12 text-[15px] text-bone placeholder:text-ink-500 transition-colors focus:border-gold/70 focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  children,
  className,
  htmlFor,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={clsx("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-[13px] font-medium text-bone-dim">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={twMerge(inputClass, className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={twMerge(inputClass, "h-auto min-h-24 py-3 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select
      className={twMerge(
        inputClass,
        "appearance-none bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22%238a8784%22%20stroke-width=%222%22%3E%3Cpath%20d=%22m6%209%206%206%206-6%22/%3E%3C/svg%3E')] bg-[length:14px] bg-[right_1rem_center] bg-no-repeat pr-10",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  name,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  name?: string;
}) {
  return (
    <label className={clsx("flex cursor-pointer items-start justify-between gap-4", disabled && "opacity-50")}>
      {(label || description) && (
        <span className="flex flex-col">
          {label && <span className="text-sm font-medium text-bone">{label}</span>}
          {description && <span className="text-xs text-ink-400">{description}</span>}
        </span>
      )}
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          type="checkbox"
          name={name}
          className="peer sr-only"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-6 w-11 rounded-full bg-ink-600 transition-colors peer-checked:bg-gold peer-focus-visible:ring-2 peer-focus-visible:ring-gold/40" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-bone shadow transition-transform duration-300 peer-checked:translate-x-5 peer-checked:bg-ink-950" />
      </span>
    </label>
  );
}
