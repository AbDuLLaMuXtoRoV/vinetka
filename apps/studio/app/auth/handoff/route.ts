import { createClient } from "@snapbell/sdk";
import { forwardedHeaders } from "@/lib/forwarded";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/api";
import { env } from "@/lib/env";
import { getLocale } from "@/lib/i18n";

/** Marketing /signup hands off here with a one-time code; we exchange it for a session. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(new URL("/login", request.url));
  try {
    const session = await createClient({ baseUrl: env.apiUrl, locale: await getLocale(), headers: await forwardedHeaders() }).auth.handoff({ code });
    const res = NextResponse.redirect(new URL(session.studio.onboarding.done ? "/home" : "/onboarding", request.url));
    res.cookies.set(SESSION_COOKIE, session.token, sessionCookieOptions);
    return res;
  } catch {
    return NextResponse.redirect(new URL("/login?expired=1", request.url));
  }
}
