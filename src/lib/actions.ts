import "server-only";
import { AuthError, requireAdmin, requireStaff } from "@/lib/auth";
import { friendlyError } from "@/lib/errors";
import type { ActionResult } from "@/lib/types";

type Ctx = Awaited<ReturnType<typeof requireStaff>>;

/**
 * Envuelve una Server Action: verifica sesión + rol, captura errores y devuelve
 * un resultado serializable. Las políticas RLS vuelven a validar en la base de datos.
 */
export async function withStaff<T>(fn: (ctx: Ctx) => Promise<T>, opts: { admin?: boolean } = {}): Promise<ActionResult<T>> {
  try {
    const ctx = opts.admin ? await requireAdmin() : await requireStaff();
    const data = await fn(ctx);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: friendlyError("FORBIDDEN") };
    if (e instanceof UserError) return { ok: false, error: e.message };
    console.error("[action]", e);
    return { ok: false, error: friendlyError(e) };
  }
}

/** Error con mensaje apto para mostrar al usuario. */
export class UserError extends Error {}

/** Lanza si la respuesta de Supabase trae error. */
export function check<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw res.error;
  return res.data as NonNullable<T>;
}
