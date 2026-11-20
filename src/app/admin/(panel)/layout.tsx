import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { default: "Panel", template: "%s · Panel" }, robots: { index: false } };

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await requireStaffPage();
  const settings = await getSettings();

  if (!profile || profile.role === "none") {
    return (
      <div className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-md">
          <ShieldAlert className="mx-auto h-12 w-12 text-warning" strokeWidth={1.25} />
          <h1 className="mt-5 font-display text-2xl uppercase tracking-wide">Sin permisos de acceso</h1>
          <p className="mt-3 text-sm text-ink-400">
            Tu cuenta ({user.email}) existe, pero aún no tiene un rol asignado. Pide a un administrador que te asigne el rol
            <strong> admin</strong> o <strong>staff</strong> en Configuración → Usuarios.
          </p>
          <form action="/auth/signout" method="post" className="mt-6">
            <button className="text-sm text-gold hover:underline">Cerrar sesión</button>
          </form>
          <Link href="/" className="mt-3 block text-xs text-ink-500 hover:text-bone">
            Ir al sitio
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-ink-950">
      <AdminSidebar businessName={settings.name} userEmail={user.email ?? ""} role={profile.role} features={settings.features} />
      <div className="lg:pl-64">
        {!settings.setup_completed && profile.role === "admin" && (
          <div className="border-b border-warning/20 bg-warning/10 px-5 py-2.5 text-xs text-warning md:px-8">
            Estás usando datos provisionales de ejemplo (nombre, dirección, barberos, fotos y precios).{" "}
            <Link href="/admin/configuracion" className="font-semibold underline">
              Edítalos en Configuración
            </Link>{" "}
            para publicar la información real.
          </div>
        )}
        <main className="mx-auto max-w-[1400px] px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}
