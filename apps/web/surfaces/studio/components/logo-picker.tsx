"use client";

import { Button } from "@snapbell/ui/button";
import { useMessages } from "@snapbell/ui/locale";
import { ImagePlus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { brandMsgs } from "@studio/messages/brand";

/** Reads an image, scales it to at most 256px and returns a PNG data URL. */
async function toDataUrl(file: File, max = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

export function LogoPicker({ value, onChange, name }: { value: string | null; onChange: (dataUrl: string | null) => void; name: string }) {
  const id = useId();
  const t = useMessages(brandMsgs);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="grid size-20 place-items-center overflow-hidden rounded-card border border-border bg-sunken">
        {value ? <img src={value} alt={t.logoAlt(name)} className="size-full object-contain" /> : <ImagePlus className="size-6 text-muted" aria-hidden />}
      </div>
      <div className="grid gap-2">
        <div className="flex gap-2">
          <label htmlFor={id} className="inline-flex h-11 cursor-pointer items-center rounded-input border border-ink/70 px-4 text-sm font-medium hover:bg-ink/5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink">
            {value ? t.replaceLogo : t.uploadLogo}
            <input
              id={id}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              className="sr-only"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 5_000_000) return setError(t.tooBig);
                try {
                  setError(null);
                  onChange(await toDataUrl(file));
                } catch {
                  setError(t.unreadable);
                }
              }}
            />
          </label>
          {value && (
            <Button variant="ghost" size="icon" aria-label={t.removeLogo} onClick={() => onChange(null)}>
              <Trash2 />
            </Button>
          )}
        </div>
        <p className="text-xs text-muted">{error ?? t.logoHint}</p>
      </div>
    </div>
  );
}

export function ColorPicker({ value, onChange, id }: { value: string; onChange: (color: string) => void; id: string }) {
  const t = useMessages(brandMsgs);
  const presets = ["#2F6F73", "#B45309", "#6B8F71", "#7C3AED", "#BE185D", "#1D4ED8", "#F5B700", "#1C1B1F"];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {presets.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          aria-label={t.useColor(c)}
          aria-pressed={value.toLowerCase() === c.toLowerCase()}
          className="size-11 rounded-full border-2 border-transparent ring-offset-2 ring-offset-bg aria-pressed:ring-2 aria-pressed:ring-ink"
          style={{ background: c }}
        />
      ))}
      <label htmlFor={id} className="flex h-11 items-center gap-2 rounded-input border border-border px-3 text-sm">
        <input id={id} type="color" value={value} onChange={(e) => onChange(e.target.value)} className="size-6 cursor-pointer rounded border-0 bg-transparent" />
        <span className="font-mono text-xs uppercase">{value}</span>
      </label>
    </div>
  );
}
