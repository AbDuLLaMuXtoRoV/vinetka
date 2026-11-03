import { test as base, expect, type BrowserContext, type Page } from "@playwright/test";
import { DEMO_CODES, DEMO_CREDENTIALS, DEMO_IDS, createClient, type SnapbellClient } from "@snapbell/sdk";
import { fileURLToPath } from "node:url";

export { expect, DEMO_CODES, DEMO_CREDENTIALS, DEMO_IDS };

export const BASE_URL = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
export const API_URL = process.env.API_URL ?? `${BASE_URL}/v1`;

/** Sample files for uploads: photo-1.jpg, photo-2.jpg (1600×2000), selfie.jpg, roster.csv. */
export const fixture = (name: string) => fileURLToPath(new URL(`../fixtures/${name}`, import.meta.url));

/** A random private IP, so every test counts as a different visitor for per-IP rate limits. */
function randomIp(): string {
  const n = () => Math.floor(Math.random() * 250) + 1;
  return `10.${n()}.${n()}.${n()}`;
}

/** Unique suffix for names and emails created by a test. */
export const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4).toString(36)}`;

export const test = base.extend<{
  /** This test's visitor IP (also sent by `page` and `api`). */
  visitor: string;
  /** API client for setting up or checking data, as the same visitor. */
  api: (token?: string | null) => SnapbellClient;
}>({
  visitor: async ({}, use) => {
    await use(randomIp());
  },
  extraHTTPHeaders: async ({ visitor }, use) => {
    await use({ "X-Forwarded-For": visitor });
  },
  api: async ({ visitor }, use) => {
    await use((token) => createClient({ baseUrl: API_URL, token: token ?? null, headers: { "X-Forwarded-For": visitor } }));
  },
});

type StaffWho = "owner" | "admin" | "photographer";

/** Studio log in through the real form. Lands on /studio/home (or /studio/onboarding). */
export async function studioLogin(page: Page, who: StaffWho | { email: string; password: string } = "owner") {
  const creds = typeof who === "string" ? DEMO_CREDENTIALS[who] : who;
  await page.goto("/studio/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/studio\/(home|onboarding)/);
}

/** Snapbell admin log in through the real form. */
export async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.locator("#email").fill(DEMO_CREDENTIALS.internalAdmin.email);
  await page.locator("#password").fill(DEMO_CREDENTIALS.internalAdmin.password);
  await page.locator('form button[type="submit"]').click();
  await page.waitForURL(/\/admin\/(requests|studios)/);
}

/**
 * Signs a parent in without the UI (for tests that are not about sign-in):
 * one-time code through the API, then the session cookies the site sets.
 */
export async function parentSession(context: BrowserContext, api: (token?: string | null) => SnapbellClient, opts: { destination?: string; name?: string } = {}) {
  const destination = opts.destination ?? `e2e-${unique()}@example.com`;
  const anon = api();
  const sent = await anon.auth.sendOtp({ destination, channel: destination.includes("@") ? "email" : "sms" });
  if (!sent.devCode) throw new Error("No devCode: run the API with DEMO_MODE=true (pnpm start:all does).");
  const session = await anon.auth.verifyOtp({ destination, code: sent.devCode, name: opts.name, consent: { smsUpdates: false, marketing: false } });
  const name = session.parent.name ?? destination;
  await context.addCookies([
    { name: "sb_parent", value: session.token, url: BASE_URL, httpOnly: true, sameSite: "Lax" },
    { name: "sb_parent_name", value: encodeURIComponent(name), url: BASE_URL, sameSite: "Lax" },
  ]);
  return { ...session, destination };
}

/** Switch the whole site's language (one cookie for every area). */
export async function setLanguage(context: BrowserContext, locale: "en" | "ru" | "uz") {
  await context.addCookies([{ name: "sb_locale", value: locale, url: BASE_URL, sameSite: "Lax" }]);
}
