"use client";

import { clsx } from "clsx";
import {
  Bell,
  CalendarDays,
  ClipboardList,
  CreditCard,
  ExternalLink,
  Hourglass,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  MessageSquare,
  Scissors,
  Settings,
  Tag,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark } from "@/components/icons";
import type { Features } from "@/lib/types";

type Item = { href: string; label: string; icon: React.ElementType; adminOnly?: boolean; feature?: keyof Features };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operación",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/agenda", label: "Agenda", icon: CalendarDays },
      { href: "/admin/reservas", label: "Reservas", icon: ClipboardList },
      { href: "/admin/clientes", label: "Clientes", icon: Users },
      { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
      { href: "/admin/lista-espera", label: "Lista de espera", icon: Hourglass, feature: "waitlist" },
    ],
  },
  {
    title: "Catálogo",
    items: [
      { href: "/admin/servicios", label: "Servicios", icon: Scissors, adminOnly: true },
      { href: "/admin/barberos", label: "Barberos", icon: UserRound },
    ],
  },
  {
    title: "Marketing",
    items: [
      { href: "/admin/cupones", label: "Cupones", icon: Tag, adminOnly: true, feature: "coupons" },
      { href: "/admin/promociones", label: "Promociones", icon: Megaphone, adminOnly: true, feature: "promotions" },
      { href: "/admin/resenas", label: "Reseñas", icon: MessageSquare, feature: "reviews" },
    ],
  },
  {
    title: "Sistema",
    items: [
      { href: "/admin/notificaciones", label: "Notificaciones", icon: Bell },
      { href: "/admin/configuracion", label: "Configuración", icon: Settings, adminOnly: true },
    ],
  },
];

export function AdminSidebar({
  businessName,
  userEmail,
  role,
  features,
}: {
  businessName: string;
  userEmail: string;
  role: string;
  features: Features;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  const nav = (
    <nav className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-4 scrollbar-thin">
      {GROUPS.map((g) => {
        const items = g.items.filter((i) => (!i.adminOnly || role === "admin") && (!i.feature || features[i.feature]));
        if (!items.length) return null;
        return (
          <div key={g.title}>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.25em] text-ink-500">{g.title}</p>
            <ul className="space-y-0.5">
              {items.map((i) => (
                <li key={i.href}>
                  <Link
                    href={i.href}
                    className={clsx(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                      isActive(i.href) ? "bg-gold/12 text-gold-light" : "text-bone-dim hover:bg-white/[0.04] hover:text-bone",
                    )}
                  >
                    <i.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                    {i.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-white/[0.06] p-3">
      <Link href="/" target="_blank" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-bone">
        <ExternalLink className="h-4 w-4" /> Ver sitio público
      </Link>
      <Link href="/admin/cuenta" className="mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-bone">
        <UserRound className="h-4 w-4" />
        <span className="min-w-0 flex-1 truncate">{userEmail}</span>
        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] uppercase">{role}</span>
      </Link>
      <form action="/auth/signout" method="post">
        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-ink-400 hover:bg-white/[0.04] hover:text-danger">
          <LogOut className="h-4 w-4" /> Cerrar sesión
        </button>
      </form>
    </div>
  );

  const brand = (
    <Link href="/admin" className="flex items-center gap-3 px-6 py-5">
      <LogoMark className="h-9 w-9 text-gold" />
      <span className="min-w-0">
        <span className="block truncate font-display text-sm uppercase tracking-[0.15em] text-bone">{businessName}</span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-gold">Admin</span>
      </span>
    </Link>
  );

  return (
    <>
      {/* Barra superior móvil */}
      <div className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-white/[0.06] bg-ink-950/90 px-4 backdrop-blur-xl lg:hidden">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="h-8 w-8 text-gold" />
          <span className="font-display text-sm uppercase tracking-[0.15em]">{businessName}</span>
        </Link>
        <button onClick={() => setOpen(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-white/5" aria-label="Abrir menú">
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Drawer móvil */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 animate-[slide-in_0.3s_ease_both] flex-col border-r border-white/[0.06] bg-ink-900 [animation-direction:reverse]">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/5" aria-label="Cerrar menú">
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </aside>
        </div>
      )}

      {/* Sidebar escritorio */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-white/[0.06] bg-ink-900 lg:flex">
        {brand}
        {nav}
        {footer}
      </aside>
    </>
  );
}
