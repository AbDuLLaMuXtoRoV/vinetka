import { ApiError, type SnapbellClient } from "@snapbell/sdk";
import { revalidatePath } from "next/cache";
import { commonMsgs } from "@/messages/common";
import { api } from "./api";
import { getLocale } from "./i18n";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

/** Wraps a mutation for server actions: returns a serializable result and revalidates the given paths. */
export async function act<T>(
  fn: (client: SnapbellClient) => Promise<T>,
  revalidate: string | string[] = [],
): Promise<ActionResult<T>> {
  try {
    const client = await api();
    const data = await fn(client);
    // "layout:/x" revalidates /x and everything below it (e.g. the shell's studio name).
    for (const path of ([] as string[]).concat(revalidate)) {
      if (path.startsWith("layout:")) revalidatePath(path.slice(7), "layout");
      else revalidatePath(path);
    }
    return { ok: true, data };
  } catch (e) {
    const t = commonMsgs[await getLocale()].errors;
    if (e instanceof ApiError) {
      if (e.status === 401) return { ok: false, error: t.sessionExpired };
      if (e.status === 403) return { ok: false, error: t.forbidden };
      return { ok: false, error: e.message };
    }
    return { ok: false, error: t.network };
  }
}
