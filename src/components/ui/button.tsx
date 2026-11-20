import Link from "next/link";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LoaderCircle } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg" | "icon";

const base =
  "relative inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-300 ease-[var(--ease-premium)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-ink-950 shadow-[0_8px_30px_-10px_rgba(200,161,101,0.6)] hover:bg-gold-light hover:shadow-[0_10px_40px_-8px_rgba(200,161,101,0.7)]",
  secondary: "bg-bone text-ink-950 hover:bg-white",
  outline: "border border-white/15 text-bone hover:border-gold/70 hover:text-gold-light bg-white/[0.02]",
  ghost: "text-bone/80 hover:bg-white/[0.06] hover:text-bone",
  danger: "bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25",
  success: "bg-success/15 text-success border border-success/30 hover:bg-success/25",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-base",
  icon: "h-10 w-10",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return twMerge(clsx(base, variants[variant], sizes[size], className));
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} {...rest}>
      {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function ButtonLink({ variant = "primary", size = "md", icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
