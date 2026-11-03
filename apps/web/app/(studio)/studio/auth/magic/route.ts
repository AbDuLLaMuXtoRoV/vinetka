import { createClient } from "@snapbell/sdk";
import { forwardedHeaders } from "@studio/lib/forwarded";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@studio/lib/api";
import { env } from "@studio/lib/env";
import { getLocale } from "@studio/lib/i18n";
import { redirectToPath } from "@web/surfaces/shared/redirect";

/** Magic sign-in link from email. Redirects stay on the site the browser is using. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return redirectToPath("/studio/login");
  try {
    const session = await createClient({ baseUrl: env.apiUrl, locale: await getLocale(), headers: await forwardedHeaders() }).auth.redeemMagicLink({ token });
    const res = redirectToPath(session.studio.onboarding.done ? "/studio/home" : "/studio/onboarding");
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions);
    return res;
  } catch {
    return redirectToPath("/studio/login?expired=1");
  }
}
