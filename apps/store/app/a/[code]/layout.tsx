import { normalizeCode } from "@snapbell/sdk";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StoreShell } from "@/components/store-shell";
import { cartCount, getAlbum, getBranding, getCart } from "@/lib/api";

export default async function AlbumLayout({ children, params }: { children: ReactNode; params: Promise<{ code: string }> }) {
  const raw = (await params).code;
  const code = normalizeCode(decodeURIComponent(raw));
  if (code !== raw) redirect(`/a/${code}`);

  const [album, cart] = await Promise.all([getAlbum(code), getCart()]);
  if (!album.ok && album.error.kind === "unauthorized") redirect(`/verify?code=${code}&next=/a/${code}`);

  let studio = album.ok ? album.data.studio : album.error.kind === "access" ? album.error.studio : null;
  if (!studio) {
    const b = await getBranding(code);
    if (b.ok) studio = b.data;
  }

  return (
    <StoreShell code={code} studio={studio} cartCount={cartCount(cart)}>
      {children}
    </StoreShell>
  );
}
