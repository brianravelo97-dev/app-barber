import { Mail, MapPin, Phone } from "lucide-react";
import Link from "next/link";
import { InstagramIcon, WhatsAppIcon } from "@/components/icons";
import { Brand } from "@/components/site/header";
import { instagramLink, whatsappLink } from "@/lib/format";
import type { BusinessSettings } from "@/lib/types";

export function SiteFooter({ settings }: { settings: BusinessSettings }) {
  const wa = whatsappLink(settings.whatsapp);
  const ig = instagramLink(settings.instagram);
  return (
    <footer className="border-t border-white/[0.06] bg-ink-950">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-4 md:px-8">
        <div className="md:col-span-2">
          <Brand name={settings.name} logoUrl={settings.logo_url} />
          {settings.tagline && (
            <p className="mt-6 max-w-sm font-serif text-2xl italic leading-snug text-bone-dim">{settings.tagline}</p>
          )}
          <div className="mt-6 flex gap-3">
            {ig && (
              <a
                href={ig}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-bone hover:border-gold hover:text-gold"
                aria-label="Instagram"
              >
                <InstagramIcon className="h-5 w-5" />
              </a>
            )}
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="grid h-11 w-11 place-items-center rounded-full border border-white/10 text-bone hover:border-gold hover:text-gold"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon className="h-5 w-5" />
              </a>
            )}
          </div>
        </div>
        <div>
          <h3 className="eyebrow mb-5">Explora</h3>
          <ul className="space-y-3 text-sm text-ink-300">
            <li><Link className="hover:text-bone" href="/reservar">Reservar hora</Link></li>
            <li><Link className="hover:text-bone" href="/servicios">Servicios y precios</Link></li>
            <li><Link className="hover:text-bone" href="/barberos">Nuestro equipo</Link></li>
            <li><Link className="hover:text-bone" href="/reserva">Gestionar mi reserva</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-5">Contacto</h3>
          <ul className="space-y-3 text-sm text-ink-300">
            {settings.address && (
              <li className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{settings.address}{settings.city ? `, ${settings.city}` : ""}</li>
            )}
            {settings.phone && (
              <li className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`tel:${settings.phone.replace(/\s/g, "")}`} className="hover:text-bone">{settings.phone}</a></li>
            )}
            {settings.email && (
              <li className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold" /><a href={`mailto:${settings.email}`} className="hover:text-bone">{settings.email}</a></li>
            )}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.05]">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-6 text-xs text-ink-500 md:flex-row md:px-8">
          <span>© {new Date().getFullYear()} {settings.name}. Todos los derechos reservados.</span>
          <Link href="/admin" className="hover:text-ink-300">Acceso administración</Link>
        </div>
      </div>
    </footer>
  );
}

export function WhatsAppFab({ phone, name }: { phone: string | null; name: string }) {
  const href = whatsappLink(phone, `Hola ${name}, quiero hacer una consulta.`);
  if (!href) return null;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="group fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-[#25D366] text-white shadow-[0_10px_30px_-5px_rgba(37,211,102,0.5)] transition-transform duration-300 hover:scale-105 md:bottom-8 md:right-8 md:h-16 md:w-16 mb-[env(safe-area-inset-bottom)]"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25D366] opacity-20 [animation-duration:2.5s]" />
      <WhatsAppIcon className="relative h-7 w-7 md:h-8 md:w-8" />
    </a>
  );
}
