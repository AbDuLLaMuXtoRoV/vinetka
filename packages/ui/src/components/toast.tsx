"use client";

import { CircleCheck, CircleX, Info, X } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { uiMessages } from "../lib/messages";
import { useLocale } from "./locale";

type Tone = "default" | "success" | "danger";
interface ToastItem {
  id: number;
  title: ReactNode;
  description?: ReactNode;
  tone: Tone;
}

const ToastContext = createContext<((t: Omit<ToastItem, "id" | "tone"> & { tone?: Tone }) => void) | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const labels = uiMessages[useLocale()];

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    (t: Omit<ToastItem, "id" | "tone"> & { tone?: Tone }) => {
      const id = nextId++;
      setItems((list) => [...list.slice(-2), { id, tone: "default", ...t }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );
  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:right-6 md:bottom-6 md:left-auto md:items-end"
      >
        {items.map((t) => {
          const Icon = t.tone === "success" ? CircleCheck : t.tone === "danger" ? CircleX : Info;
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-card bg-ink p-4 text-bg shadow-overlay"
            >
              <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "success" && "text-success", t.tone === "danger" && "text-danger")} aria-hidden />
              <div className="grid flex-1 gap-0.5 text-sm">
                <p className="font-medium">{t.title}</p>
                {t.description && <p className="opacity-80">{t.description}</p>}
              </div>
              <button type="button" onClick={() => dismiss(t.id)} className="-m-1 rounded p-1 opacity-70 hover:opacity-100" aria-label={labels.dismiss}>
                <X className="size-4" aria-hidden />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
