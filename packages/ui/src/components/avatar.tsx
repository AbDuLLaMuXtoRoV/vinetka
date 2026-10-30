import type { ComponentProps } from "react";
import { cn } from "../lib/cn";
import { initials } from "../lib/format";

export function Avatar({ name, src, size = 36, className, ...props }: ComponentProps<"span"> & { name: string; src?: string | null; size?: number }) {
  return (
    <span
      className={cn("inline-grid shrink-0 place-items-center overflow-hidden rounded-full bg-sage/20 font-medium text-ink", className)}
      style={{ width: size, height: size, fontSize: Math.max(11, size * 0.38) }}
      {...props}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : <span aria-hidden>{initials(name)}</span>}
      <span className="sr-only">{name}</span>
    </span>
  );
}
