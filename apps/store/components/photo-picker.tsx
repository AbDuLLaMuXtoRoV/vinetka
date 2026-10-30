"use client";

import type { AlbumPhoto } from "@snapbell/sdk";
import { Button } from "@snapbell/ui/button";
import { PhotoTile } from "@snapbell/ui/commerce/photo-tile";
import { useMessages } from "@snapbell/ui/locale";
import { Sheet } from "@snapbell/ui/overlay";
import { useEffect, useState, type ReactNode } from "react";
import { photoMsgs } from "@/messages/photos";
import { shopMsgs } from "@/messages/shop";

/**
 * Bottom sheet to choose the photo(s) for a package or product: one per slot.
 * With a single slot, tapping a photo replaces the choice.
 */
export function PhotoPicker({
  open,
  onOpenChange,
  title,
  photos,
  slots,
  initial,
  confirmLabel,
  pending,
  onConfirm,
  footerNote,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  photos: AlbumPhoto[];
  slots: number;
  initial: string[];
  confirmLabel: string;
  pending?: boolean;
  onConfirm: (photoIds: string[]) => void;
  footerNote?: ReactNode;
}) {
  const t = useMessages(shopMsgs).picker;
  const p = useMessages(photoMsgs);
  const need = Math.max(1, Math.min(slots, photos.length));
  const [selected, setSelected] = useState<string[]>(initial.slice(0, need));

  useEffect(() => {
    if (open) setSelected(initial.slice(0, need));
    // Reset the choice each time the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const toggle = (id: string) => {
    setSelected((s) => {
      if (s.includes(id)) return s.filter((x) => x !== id);
      if (need === 1) return [id];
      return s.length >= need ? [...s.slice(1), id] : [...s, id];
    });
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={need === 1 ? t.chooseOne : t.chooseMany(need, selected.length)}
      footer={
        <div className="grid w-full gap-2">
          {footerNote}
          <Button size="lg" block disabled={selected.length < need} loading={pending} onClick={() => onConfirm(selected)}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <ul className="grid grid-cols-3 gap-2 md:grid-cols-4">
        {photos.map((photo, i) => (
          <li key={photo.id}>
            <PhotoTile
              src={photo.thumbUrl}
              alt={`${photo.tags[0] ?? p.photo} ${i + 1}`}
              selected={selected.includes(photo.id)}
              onSelect={() => toggle(photo.id)}
            />
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
