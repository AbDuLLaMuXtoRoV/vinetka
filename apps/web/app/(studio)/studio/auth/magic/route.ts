import { createClient } from "@snapbell/sdk";
import { forwardedHeaders } from "@studio/lib/forwarded";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@studio/lib/api";
import { env } from "@studio/lib/env";
import { getLocale } from "@studio/lib/i18n";

/** Magic sign-in link from email. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.redirect(new URL("/studio/login", request.url));
  try {
    const session = await createClient({ baseUrl: env.apiUrl, locale: await getLocale(), headers: await forwardedHeaders() }).auth.redeemMagicLink({ token });
    const res = NextResponse.redirect(new URL(session.studio.onboarding.done ? "/studio/home" : "/studio/onboarding", request.url));
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/studio/login?expired=1", request.url));
  }
}
