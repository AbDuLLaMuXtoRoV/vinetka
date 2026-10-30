"use client";

import { FolderUp, Upload } from "lucide-react";
import { useId, useRef, useState, type DragEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";
import { useLocale } from "./locale";

/** Drag-and-drop or click to pick files; `allowFolder` adds a folder picker for picture-day card dumps. */
export function FileDropZone({
  onFiles,
  accept = "image/jpeg,image/png,image/heic",
  multiple = true,
  allowFolder = false,
  title,
  hint,
  disabled,
  className,
  children,
}: {
  onFiles: (files: File[]) => void;
  accept?: string;
  multiple?: boolean;
  allowFolder?: boolean;
  title?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  const t = uiMessages[useLocale()];
  const id = useId();
  const folderRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);

  // Match the same rules as <input accept>: MIME types, wildcards and extensions.
  // Some browsers report an empty MIME type (e.g. .csv on Windows), so extensions matter.
  const accepts = (f: File) => {
    const name = f.name.toLowerCase();
    return accept
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .some((t) =>
        t.startsWith(".") ? name.endsWith(t) : t.endsWith("/*") ? f.type.startsWith(t.slice(0, -1)) : t === f.type,
      );
  };

  const take = (list: FileList | null) => {
    if (!list || disabled) return;
    const files = Array.from(list).filter(accepts);
    if (files.length) onFiles(files);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    take(e.dataTransfer.files);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      className={cn(
        "grid place-items-center gap-3 rounded-card border-2 border-dashed p-8 text-center transition-colors duration-150",
        over ? "border-ink bg-accent/10" : "border-border bg-surface",
        disabled && "opacity-50",
        className,
      )}
    >
      <Upload className="size-8 text-muted" aria-hidden />
      <div className="grid gap-1">
        <p className="text-base font-medium">{title ?? t.dropTitle}</p>
        <p className="text-sm text-muted">{hint ?? t.dropHint}</p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <label
          htmlFor={id}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-input bg-ink px-4 text-sm font-medium text-bg focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ink"
        >
          {t.chooseFiles}
          <input id={id} type="file" accept={accept} multiple={multiple} disabled={disabled} className="sr-only" onChange={(e) => take(e.target.files)} />
        </label>
        {allowFolder && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => folderRef.current?.click()}
            className="inline-flex h-11 items-center gap-2 rounded-input border border-ink/70 px-4 text-sm font-medium"
          >
            <FolderUp className="size-4" aria-hidden />
            {t.uploadFolder}
          </button>
        )}
        {allowFolder && (
          <input
            ref={(el) => {
              folderRef.current = el;
              el?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => take(e.target.files)}
          />
        )}
      </div>
      {children}
    </div>
  );
}
