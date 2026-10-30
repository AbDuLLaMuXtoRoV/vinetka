import type { ReactNode } from "react";
import { Shell } from "@/components/shell/shell";
import { getSession } from "@/lib/api";
import { env } from "@/lib/env";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { member, studio } = await getSession();
  return (
    <Shell member={member} studio={studio} storeUrl={env.storeUrl}>
      {children}
    </Shell>
  );
}
