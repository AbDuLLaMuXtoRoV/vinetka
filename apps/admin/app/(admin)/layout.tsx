import type { ReactNode } from "react";
import { AdminShell } from "@/components/shell";
import { getAdmin } from "@/lib/api";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { email } = await getAdmin();
  return <AdminShell email={email}>{children}</AdminShell>;
}
