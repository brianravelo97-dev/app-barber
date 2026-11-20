import { ServicesManager } from "@/components/admin/services-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffPage } from "@/lib/auth";
import { getAdminRefs } from "@/lib/admin-data";
import { getSettings } from "@/lib/data";

export const metadata = { title: "Servicios" };

export default async function ServicesAdminPage() {
  const { supabase } = await requireStaffPage();
  const [settings, refs] = await Promise.all([getSettings(), getAdminRefs(supabase)]);
  return (
    <>
      <PageHeader title="Servicios" description="Catálogo, precios y duración. Los cambios se publican en el sitio al instante." />
      <ServicesManager services={refs.services} currency={settings.currency} locale={settings.locale} />
    </>
  );
}
