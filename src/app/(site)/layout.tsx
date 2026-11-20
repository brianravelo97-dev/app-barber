import { SiteFooter, WhatsAppFab } from "@/components/site/footer";
import { SiteHeader } from "@/components/site/header";
import { isSupabaseConfigured } from "@/lib/env";
import { getSettings } from "@/lib/data";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      {!isSupabaseConfigured && (
        <div className="relative z-[60] bg-warning px-4 py-2 text-center text-xs font-medium text-ink-950">
          Supabase no está configurado. Copia <code>.env.example</code> a <code>.env.local</code> y sigue el README.
        </div>
      )}
      <SiteHeader name={settings.name} logoUrl={settings.logo_url} />
      <main className="min-h-[70dvh]">{children}</main>
      <SiteFooter settings={settings} />
      <WhatsAppFab phone={settings.whatsapp} name={settings.name} />
    </>
  );
}
