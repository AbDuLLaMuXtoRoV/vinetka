"use client";

import { useEffect, useState } from "react";

/**
 * Photo protection deterrents: hide (blur) photos when the tab or window loses
 * focus, which also defeats most app-switcher snapshots, and briefly on PrintScreen.
 * Real protection lives on the server (watermarked previews, signed expiring URLs).
 */
export function useProtection(enabled: boolean): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const hide = () => setHidden(true);
    const show = () => setHidden(false);
    const onVisibility = () => (document.visibilityState === "hidden" ? hide() : show());
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen" || (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(e.key))) {
        hide();
        clearTimeout(timer);
        timer = setTimeout(show, 1500);
      }
    };
    const block = (e: Event) => e.preventDefault();

    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("keyup", onKey);
    document.addEventListener("dragstart", block);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("keyup", onKey);
      document.removeEventListener("dragstart", block);
      clearTimeout(timer);
    };
  }, [enabled]);

  return hidden;
}
