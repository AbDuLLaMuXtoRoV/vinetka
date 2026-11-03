import type { ReactNode } from "react";
import { AdminShell } from "@admin/components/shell";
import { api, getAdmin } from "@admin/lib/api";

/** Badge count for the Requests nav item; the shell still renders if the lookup fails. */
async function countNewRequests(): Promise<number> {
  try {
    return (await (await api()).admin.contactRequests({ status: "new" })).length;
  } catch {
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { email } = await getAdmin();
  const newRequests = await countNewRequests();
  return (
    <AdminShell email={email} newRequests={newRequests}>
      {children}
    </AdminShell>
  );
}
