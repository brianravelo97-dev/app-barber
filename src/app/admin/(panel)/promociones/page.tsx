import { PageHeader } from "@/components/admin/page-header";
import { PromotionsManager } from "@/components/admin/promotions-manager";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";
import type { Promotion } from "@/lib/types";

export const metadata = { title: "Promociones" };

export default async function PromotionsPage() {
  const { supabase } = await requireStaffPage();
  const [settings, refs, { data }] = await Promise.all([
    getSettings(),
    getAdminRefs(supabase),
    supabase.from("promotions").select("*").order("sort_order"),
  ]);
  return (
    <>
      <PageHeader title="Promociones" description="Banners destacados en la portada. Puedes enlazarlos a un servicio y a un cupón." />
      {!settings.features.promotions && (
        <p className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">Las promociones están desactivadas en Configuración → Funcionalidades.</p>
      )}
      <PromotionsManager promotions={(data ?? []) as Promotion[]} services={refs.services} />
    </>
  );
}
