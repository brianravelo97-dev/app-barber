"use server";

import { randomUUID } from "node:crypto";
import { UserError, withStaff } from "@/lib/actions";
import { createServiceClient } from "@/lib/supabase/service";

const TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };
const MAX = 5 * 1024 * 1024;

/** Sube una imagen al bucket público "media" (solo administradores). Devuelve la URL pública. */
export async function uploadImage(formData: FormData) {
  return withStaff(
    async () => {
      const file = formData.get("file");
      const folder = String(formData.get("folder") ?? "misc").replace(/[^a-z0-9-]/gi, "").slice(0, 30) || "misc";
      if (!(file instanceof File)) throw new UserError("No se recibió ningún archivo.");
      const ext = TYPES[file.type];
      if (!ext) throw new UserError("Formato no permitido. Usa JPG, PNG, WebP o AVIF.");
      if (file.size > MAX) throw new UserError("La imagen supera los 5 MB.");

      const sb = createServiceClient();
      if (!sb) throw new UserError("Falta SUPABASE_SERVICE_ROLE_KEY en el servidor para subir archivos. También puedes pegar una URL.");
      const path = `${folder}/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
      const { error } = await sb.storage.from("media").upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
      if (error) throw new UserError(`No se pudo subir la imagen: ${error.message}`);
      return { url: sb.storage.from("media").getPublicUrl(path).data.publicUrl };
    },
    { admin: true },
  );
}
