import { BASE_URL, DEMO_CREDENTIALS, expect, test } from "./fixtures";

/**
 * Every server-side redirect must keep the visitor on the site's own address.
 * Behind `next start -H 0.0.0.0` (as on Render) a redirect built from the request
 * URL points at http://0.0.0.0:PORT, which browsers can't reach and where the
 * cookies just set don't apply.
 */
const site = new URL(BASE_URL).origin;

async function locationOf(request: import("@playwright/test").APIRequestContext, path: string, headers: Record<string, string> = {}) {
  const res = await request.get(path, { maxRedirects: 0, headers });
  expect(res.status(), `${path} should redirect`).toBeGreaterThanOrEqual(300);
  expect(res.status()).toBeLessThan(400);
  const location = res.headers()["location"];
  expect(location, `${path} has a Location`).toBeTruthy();
  return new URL(location!, BASE_URL);
}

test.describe("redirects stay on the site", () => {
  test("studio magic link", async ({ request, api }) => {
    const { devLink } = await api().auth.magicLink({ email: DEMO_CREDENTIALS.owner.email });
    expect(devLink).toBeTruthy();
    const token = new URL(devLink!, BASE_URL).searchParams.get("token")!;
    const target = await locationOf(request, `/studio/auth/magic?token=${encodeURIComponent(token)}`);
    expect(target.origin).toBe(site);
    expect(target.pathname).toMatch(/^\/studio\/(home|onboarding)$/);

    const expired = await locationOf(request, "/studio/auth/magic?token=not-a-real-token");
    expect(expired.origin).toBe(site);
    expect(expired.pathname).toBe("/studio/login");
  });

  test("shop handoff arrival", async ({ request }) => {
    const target = await locationOf(request, "/shop/auth/continue?code=used-or-unknown&next=/account");
    expect(target.origin).toBe(site);
    expect(target.pathname).toBe("/shop/signin");
  });

  test("sign-in gates and language redirects", async ({ request }) => {
    for (const [path, expected] of [
      ["/shop/account", "/shop/signin"],
      ["/shop/a/SAMPLE", "/shop/verify"],
      ["/studio/home", "/studio/login"],
      ["/admin/studios", "/admin/login"],
      ["/en/pricing", "/pricing"],
      ["/shop?lang=uz", "/shop"],
      ["/go/store?to=/account&lang=en", "/shop/account"],
    ] as const) {
      const target = await locationOf(request, path);
      expect(target.origin, path).toBe(site);
      expect(target.pathname, path).toBe(expected);
    }
  });
});
