"use client";

import { ImagePlus, X } from "lucide-react";
import { useRef, useState } from "react";
import { uploadImage } from "@/app/admin/actions/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { SmartImage } from "@/components/ui/smart-image";
import { useToast } from "@/components/ui/toast";

/** Selector de imagen: subir archivo (Supabase Storage) o pegar URL. */
export function ImageInput({
  value,
  onChange,
  folder,
  aspect = "aspect-[4/3]",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  aspect?: string;
}) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  async function onFile(file: File) {
    setLoading(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("folder", folder);
    const r = await uploadImage(fd);
    setLoading(false);
    if (r.ok && r.data) {
      onChange(r.data.url);
      toast.success("Imagen subida");
    } else if (!r.ok) toast.error(r.error);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={`relative w-full max-w-xs overflow-hidden rounded-xl border border-white/10 ${aspect}`}>
        {value ? (
          <>
            <SmartImage src={value} alt="" className="h-full w-full" />
            <button
              type="button"
              onClick={() => onChange(null)}
              className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-ink-950/80 text-bone hover:text-danger"
              aria-label="Quitar imagen"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button type="button" onClick={() => ref.current?.click()} className="grid h-full w-full place-items-center bg-ink-900 text-ink-400 hover:text-gold">
            <span className="flex flex-col items-center gap-2 text-xs">
              <ImagePlus className="h-6 w-6" /> Subir imagen
            </span>
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" loading={loading} onClick={() => ref.current?.click()}>
          {value ? "Cambiar" : "Subir archivo"}
        </Button>
        <Input
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          placeholder="…o pega una URL https://"
          className="h-9 text-xs"
        />
      </div>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
