import type { BrowserContext, Page, Route } from "@playwright/test";
import type { Order, SnapbellClient } from "@snapbell/sdk";
import { expect, unique } from "../fixtures";

/** A random Uzbek mobile number in the national format the phone field expects ("90 5xx xx xx"). */
export function randomPhone(): string {
  const d = () => Math.floor(Math.random() * 10);
  return `90 5${d()}${d()} ${d()}${d()} ${d()}${d()}`;
}

/**
 * Waits until the page is interactive. Text typed into a server-rendered input before
 * React has attached to it is lost (WebKit is slow enough for this to show up).
 */
export async function ready(page: Page) {
  await page.waitForLoadState("networkidle");
}

/** Types an album code into the six boxes on /shop, one character at a time (boxes auto-advance). */
export async function enterAlbumCode(page: Page, code: string) {
  await ready(page);
  await page.getByLabel("Album code, character 1 of 6").pressSequentially(code);
}

/** Adds a response's Set-Cookie headers to the browser, minus the Secure flag. */
async function storeCookies(context: BrowserContext, baseUrl: string, setCookies: string[]) {
  for (const line of setCookies) {
    const [pair = "", ...attrs] = line.split(";").map((p) => p.trim());
    const eq = pair.indexOf("=");
    const name = pair.slice(0, eq);
    const value = pair.slice(eq + 1);
    const attr = (key: string) => attrs.find((a) => a.toLowerCase().startsWith(key))?.split("=")[1];
    const maxAge = attr("max-age=");
    if (!value || maxAge === "0") {
      await context.clearCookies({ name });
      continue;
    }
    const sameSite = (attr("samesite=") ?? "lax").toLowerCase();
    await context.addCookies([
      {
        name,
        value,
        url: baseUrl,
        httpOnly: attrs.some((a) => a.toLowerCase() === "httponly"),
        sameSite: sameSite === "strict" ? "Strict" : sameSite === "none" ? "None" : "Lax",
        expires: maxAge ? Math.floor(Date.now() / 1000) + Number(maxAge) : -1,
      },
    ]);
  }
}

/**
 * The site is served over plain HTTP in local runs, but the production build marks
 * its cookies Secure. Chromium accepts Secure cookies on localhost; WebKit drops
 * them. On WebKit + http, keep the cookies without the Secure flag, as HTTPS would.
 */
export async function allowSecureCookiesOverHttp(context: BrowserContext, baseUrl: string) {
  await context.route(`${baseUrl}/**`, async (route) => {
    try {
      await fulfillWithoutSecure(route, context, baseUrl);
    } catch {
      // The browser dropped the request (navigated away) while we were fetching it.
      await route.continue().catch(() => {});
    }
  });
}

async function fulfillWithoutSecure(route: Route, context: BrowserContext, baseUrl: string) {
  const response = await route.fetch({ maxRedirects: 0 });
  const setCookies = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  if (response.status() >= 300 && response.status() < 400) {
    // Playwright can't hand a redirect back: store its cookies ourselves, then let
    // the browser repeat the request for real (redirects here are idempotent GETs).
    await storeCookies(context, baseUrl, setCookies);
    if (route.request().method() === "GET") return route.continue();
  }
  const headers = response.headers();
  if (headers["set-cookie"]) headers["set-cookie"] = headers["set-cookie"].replace(/;\s*Secure/gi, "");
  await route.fulfill({ response, headers });
}

/**
 * Finishes the one-time-code step on /shop/verify, /shop/signin or /shop/signup
 * through the UI: phone (default) or email, "Send my code", then the code shown on
 * screen in demo mode.
 */
export async function completeOneTimeCode(page: Page, opts: { phone?: string; email?: string; submitLabel?: RegExp } = {}) {
  await ready(page);
  if (opts.email) {
    await page.getByRole("radio", { name: "Email me" }).click();
    await page.locator("#verify-email").fill(opts.email);
  } else {
    await page.locator("#verify-phone").fill(opts.phone ?? randomPhone());
  }
  await page.getByRole("button", { name: "Send my code" }).click();
  const devCode = page.locator("p", { hasText: "Dev mode: your code is" }).locator("code");
  await expect(devCode).toHaveText(/^\d{6}$/);
  const code = (await devCode.textContent())!.trim();
  await page.getByLabel("One-time code, character 1 of 6").pressSequentially(code);
}

/** Adds the first package on the album's shop page through the photo picker sheet. */
export async function addFirstPackage(page: Page, albumCode: string) {
  await page.goto(`/shop/a/${albumCode}/shop`);
  await page.getByRole("button", { name: "Choose photo" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: /^Add to cart · / }).click();
  await expect(page.getByText("Added to cart").first()).toBeVisible();
}

/** Fills the checkout contact and (for home delivery) the address fields. */
export async function fillCheckout(page: Page, opts: { name?: string; email?: string; home?: boolean } = {}) {
  await ready(page);
  await page.locator("#co-name").fill(opts.name ?? "Elena Testova");
  await page.locator("#co-email").fill(opts.email ?? `e2e-${unique()}@example.com`);
  if (opts.home !== false) {
    await page.locator("#co-line1").fill("12 Alder St");
    await page.locator("#co-city").fill("Portland");
    await page.locator("#co-state").fill("OR");
    await page.locator("#co-postalCode").fill("97204");
  }
}

/** The test-mode card button ("Pay $X"), not the Apple/Google Pay ones. */
export const payButton = (page: Page) => page.getByRole("button", { name: /^Pay \$[\d,.]+$/ });

/** Places a paid order for the parent through the API (for tests that only need an existing order). */
export async function placeOrderViaApi(client: SnapbellClient, albumCode = "SAMPLE"): Promise<Order> {
  const album = await client.store.album(albumCode);
  const shop = await client.store.shop(albumCode);
  const pkg = shop.packages[0]!;
  let cart = await client.carts.create({ albumCode });
  cart = await client.carts.update(cart.id, {
    items: [
      {
        id: `e2e-${unique()}`,
        kind: "package",
        refId: pkg.id,
        quantity: 1,
        albumCode,
        subjectId: album.subject?.id ?? null,
        photoIds: [album.photos[0]!.id],
        customization: null,
      },
    ],
    deliveryMethod: "home",
  });
  const res = await client.checkout.submit({
    cartId: cart.id,
    contact: { name: "Elena Testova", email: `e2e-${unique()}@example.com`, phone: null },
    delivery: { method: "home", address: { line1: "12 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" } },
    payment: { method: "card", paymentMethodId: null },
  });
  return client.orders.get(res.orderId);
}
