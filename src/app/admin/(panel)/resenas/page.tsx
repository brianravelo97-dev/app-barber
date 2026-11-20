import { Check, EyeOff, MessageSquare, Trash2 } from "lucide-react";
import { deleteReview, moderateReview } from "@/app/admin/actions/marketing";
import { ActionButton } from "@/components/admin/action-button";
import { PageHeader } from "@/components/admin/page-header";
import { Badge, EmptyState, Stars } from "@/components/ui/misc";
import { requireStaffPage } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import type { Review } from "@/lib/types";

export const metadata = { title: "Reseñas" };

export default async function ReviewsPage() {
  const { supabase } = await requireStaffPage();
  const settings = await getSettings();
  const { data } = await supabase.from("reviews").select("*").order("is_approved").order("created_at", { ascending: false }).limit(200);
  const reviews = (data ?? []) as Review[];
  const approved = reviews.filter((r) => r.is_approved);
  const avg = approved.length ? approved.reduce((a, r) => a + r.rating, 0) / approved.length : 0;

  return (
    <>
      <PageHeader
        title="Reseñas"
        description={`${reviews.filter((r) => !r.is_approved).length} pendientes de moderación · promedio publicado ${avg ? avg.toFixed(1) : "—"} ★`}
      />
      {reviews.length === 0 ? (
        <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="Sin reseñas" description="Los clientes pueden opinar desde la portada o desde su reserva atendida." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {reviews.map((r) => (
            <div key={r.id} className={`rounded-2xl border bg-ink-850 p-5 ${r.is_approved ? "border-white/[0.07]" : "border-warning/30"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-display uppercase tracking-wide text-bone">{r.customer_name}</p>
                  <Stars value={r.rating} />
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {r.is_verified && <Badge tone="gold">Verificada</Badge>}
                  {r.is_approved ? <Badge tone="success">Publicada</Badge> : <Badge tone="warning">Pendiente</Badge>}
                </div>
              </div>
              {r.comment && <p className="mt-3 text-sm leading-relaxed text-bone-dim">“{r.comment}”</p>}
              <p className="mt-3 text-[11px] text-ink-500">{formatDateTime(r.created_at, settings.timezone, settings.locale)}</p>
              <div className="mt-4 flex gap-2">
                {r.is_approved ? (
                  <ActionButton size="sm" variant="outline" icon={<EyeOff className="h-3.5 w-3.5" />} action={moderateReview.bind(null, r.id, false)} success="Reseña ocultada">
                    Ocultar
                  </ActionButton>
                ) : (
                  <ActionButton size="sm" icon={<Check className="h-3.5 w-3.5" />} action={moderateReview.bind(null, r.id, true)} success="Reseña publicada">
                    Publicar
                  </ActionButton>
                )}
                <ActionButton size="sm" variant="ghost" icon={<Trash2 className="h-3.5 w-3.5 text-danger" />} action={deleteReview.bind(null, r.id)} confirmText="¿Eliminar esta reseña?" success="Reseña eliminada">
                  Eliminar
                </ActionButton>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
