"use client";

import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/icons";
import { ButtonLink } from "@/components/ui/button";

const NAV = [
  { href: "/servicios", label: "Servicios" },
  { href: "/barberos", label: "Barberos" },
  { href: "/#galeria", label: "Galería" },
  { href: "/#opiniones", label: "Opiniones" },
  { href: "/#contacto", label: "Contacto" },
];

export function Brand({ name, logoUrl, compact }: { name: string; logoUrl: string | null; compact?: boolean }) {
  const [first, ...rest] = name.split(" ");
  return (
    <Link href="/" className="group flex items-center gap-3" aria-label={`${name} — inicio`}>
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
      ) : (
        <LogoMark className="h-10 w-10 text-gold transition-transform duration-500 group-hover:rotate-12" />
      )}
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-lg font-semibold uppercase tracking-[0.18em] text-bone">{first}</span>
          {rest.length > 0 && (
            <span className="mt-1 font-display text-[10px] uppercase tracking-[0.42em] text-gold">{rest.join(" ")}</span>
          )}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ name, logoUrl }: { name: string; logoUrl: string | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  const solid = scrolled || pathname !== "/" || open;

  return (
    <header
      className={clsx(
        "fixed inset-x-0 top-0 z-50 transition-all duration-500",
        solid ? "border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl" : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-5 py-3 md:h-20 md:px-8">
        <Brand name={name} logoUrl={logoUrl} />

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Principal">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "relative font-display text-[13px] uppercase tracking-[0.2em] transition-colors hover:text-gold-light",
                pathname === n.href ? "text-gold" : "text-bone/80",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ButtonLink href="/reservar" size="sm" className="hidden sm:inline-flex">
            Reservar hora
          </ButtonLink>
          <button
            className="grid h-11 w-11 place-items-center rounded-full text-bone hover:bg-white/5 lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
          >
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] animate-fade-in bg-ink-950 lg:hidden">
          <nav className="flex h-full flex-col px-6 pb-10 pt-6" aria-label="Móvil">
            {NAV.map((n, i) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${i * 50}ms` }}
                className="animate-fade-up border-b border-white/[0.06] py-5 font-display text-3xl uppercase tracking-wide text-bone"
              >
                {n.label}
              </Link>
            ))}
            <div className="mt-auto">
              <ButtonLink href="/reservar" size="lg" className="w-full" onClick={() => setOpen(false)}>
                Reservar hora
              </ButtonLink>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
