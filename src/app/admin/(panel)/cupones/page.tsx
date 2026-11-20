import { CouponsManager } from "@/components/admin/coupons-manager";
import { PageHeader } from "@/components/admin/page-header";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import type { Coupon } from "@/lib/types";

export const metadata = { title: "Cupones" };

export default async function CouponsPage() {
  const { supabase } = await requireStaffPage();
  const settings = await getSettings();
  const { data } = await supabase.from("coupons").select("*").order("created_at", { ascending: false });
  const coupons = ((data ?? []) as Coupon[]).map((c) => ({ ...c, value: Number(c.value), min_amount: Number(c.min_amount) }));
  return (
    <>
      <PageHeader title="Cupones de descuento" description="Los clientes los aplican al confirmar su reserva online." />
      {!settings.features.coupons && (
        <p className="mb-4 rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">Los cupones están desactivados en Configuración → Funcionalidades.</p>
      )}
      <CouponsManager coupons={coupons} currency={settings.currency} locale={settings.locale} />
    </>
  );
}
