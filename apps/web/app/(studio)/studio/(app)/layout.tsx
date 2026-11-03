import type { ReactNode } from "react";
import { Shell } from "@studio/components/shell/shell";
import { getSession } from "@studio/lib/api";
import { env } from "@studio/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { member, studio } = await getSession();
  return (
    <Shell member={member} studio={studio} storeUrl={env.storeUrl}>
      {children}
    </Shell>
  );
}
