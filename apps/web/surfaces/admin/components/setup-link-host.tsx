"use client";

import type { SetupLink } from "@snapbell/sdk";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { SetupLinkDialog } from "@admin/components/setup-link-dialog";

interface ShownLink {
  name: string;
  studioName?: string;
  link: SetupLink;
}

const SetupLinkContext = createContext<((shown: ShownLink) => void) | null>(null);

/**
 * Shows a new owner's setup link above the page. Lives in the admin layout, so
 * the dialog survives the page refreshing underneath it (a request card turning
 * "Converted", or leaving a filtered list) until the admin closes it.
 */
export function SetupLinkHost({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<ShownLink | null>(null);
  const show = useCallback((next: ShownLink) => setShown(next), []);
  return (
    <SetupLinkContext.Provider value={show}>
      {children}
      <SetupLinkDialog name={shown?.name ?? ""} studioName={shown?.studioName} link={shown?.link ?? null} onClose={() => setShown(null)} />
    </SetupLinkContext.Provider>
  );
}

/** Opens the layout-level setup-link dialog; null outside the admin layout. */
export function useShowSetupLink() {
  return useContext(SetupLinkContext);
}
