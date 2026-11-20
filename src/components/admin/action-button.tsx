"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/types";

/** Botón que ejecuta una Server Action (ya enlazada con .bind) y refresca la vista. */
export function ActionButton({
  action,
  success,
  confirmText,
  ...props
}: Omit<ComponentProps<typeof Button>, "onClick"> & {
  action: () => Promise<ActionResult<unknown>>;
  success?: string;
  confirmText?: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, start] = useTransition();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => {
        if (confirmText && !confirm(confirmText)) return;
        start(async () => {
          const r = await action();
          if (r.ok) {
            if (success) toast.success(success);
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    />
  );
}
