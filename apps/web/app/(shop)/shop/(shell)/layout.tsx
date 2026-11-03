import type { StudioBranding } from "@snapbell/sdk";
import type { ReactNode } from "react";
import { StoreShell } from "@shop/components/store-shell";
import { cartCount, getBranding, getCart, lastAlbumCode } from "@shop/lib/api";

/** Cart, checkout, orders and account: branded with the last album the parent opened. */
export default async function ShellLayout({ children }: { children: ReactNode }) {
  const [code, cart] = await Promise.all([lastAlbumCode(), getCart()]);
  let studio: StudioBranding | null = null;
  if (code) {
    const b = await getBranding(code);
    if (b.ok) studio = b.data;
  }
  return (
    <StoreShell code={code} studio={studio} cartCount={cartCount(cart)}>
      {children}
    </StoreShell>
  );
}
