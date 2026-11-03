import type { BrowserContext, Page } from "@playwright/test";
import type { SnapbellClient } from "@snapbell/sdk";
import { BASE_URL, DEMO_CODES, DEMO_CREDENTIALS, expect, unique } from "../fixtures";

type Api = (token?: string | null) => SnapbellClient;

/** A toast with this title (the studio's useAction toasts every outcome). */
export const toast = (page: Page, title: string | RegExp) => page.getByRole("status").filter({ hasText: title }).first();

/** `YYYY-MM-DD` for an <input type="date">, `days` from today. */
export function dateInput(days: number): string {
  const d = new Date(Date.now() + days * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** The studio session token the browser holds (to check results through the API). */
export async function staffToken(context: BrowserContext): Promise<string> {
  const cookie = (await context.cookies(BASE_URL)).find((c) => c.name === "sb_studio");
  if (!cookie) throw new Error("No sb_studio cookie: log in first.");
  return cookie.value;
}

/** Sign the browser in as a staff member without the login form. */
export async function useStaffSession(context: BrowserContext, token: string) {
  await context.addCookies([{ name: "sb_studio", value: token, url: BASE_URL, httpOnly: true, sameSite: "Lax" }]);
}

/** Brightside owner's API client. */
export async function ownerClient(api: Api): Promise<SnapbellClient> {
  const session = await api().auth.login(DEMO_CREDENTIALS.owner);
  return api(session.token);
}

/** A brand-new studio created by the Snapbell admin (owner still "invited"). */
export async function adminCreatedStudio(api: Api) {
  const u = unique();
  const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
  const created = await api(token).admin.createStudio({
    studioName: `E2E Studio ${u}`,
    ownerName: `Owner ${u}`,
    ownerEmail: `owner-${u}@example.com`,
    ownerPhone: "90 555 00 11",
    markets: ["schools"],
  });
  const setupToken = new URL(created.setupLink.url).searchParams.get("token")!;
  return { ...created, u, setupToken, setupPath: `/studio/setup?token=${encodeURIComponent(setupToken)}`, password: `pw-${u}-secret` };
}

/** A new studio whose owner has already set a password; returns the owner's staff session. */
export async function readyStudio(api: Api) {
  const studio = await adminCreatedStudio(api);
  const session = await api().auth.completeSetup({ token: studio.setupToken, password: studio.password });
  return { ...studio, session };
}

/**
 * A paid order in the Family Store (album SAMPLE, Ava Martinez, Brightside) placed
 * through the API by a new parent with a unique name.
 */
export async function placeSampleOrder(api: Api, opts: { name?: string } = {}) {
  const u = unique();
  const name = opts.name ?? `E2E Buyer ${u}`;
  const email = `buyer-${u}@example.com`;
  const sent = await api().auth.sendOtp({ destination: email, channel: "email" });
  const session = await api().auth.verifyOtp({ destination: email, code: sent.devCode!, name, consent: { smsUpdates: false, marketing: false } });
  const c = api(session.token);
  const album = await c.store.album(DEMO_CODES.personal);
  const shop = await c.store.shop(DEMO_CODES.personal);
  const pkg = shop.packages.find((p) => p.featured) ?? shop.packages[0]!;
  let cart = await c.carts.create({ albumCode: DEMO_CODES.personal });
  cart = await c.carts.update(cart.id, {
    items: [
      {
        id: `e2e-${u}`,
        kind: "package",
        refId: pkg.id,
        quantity: 1,
        albumCode: DEMO_CODES.personal,
        subjectId: album.subject?.id ?? null,
        photoIds: [album.photos[0]!.id],
        customization: null,
      },
    ],
    deliveryMethod: "home",
  });
  const result = await c.checkout.submit({
    cartId: cart.id,
    contact: { name, email, phone: null },
    delivery: { method: "home", address: { line1: "12 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" } },
    payment: { method: "card", paymentMethodId: null },
  });
  expect(result.status).toBe("paid");
  const order = await c.orders.get(result.orderId);
  return { order, name, email, child: `${album.subject?.firstName} ${album.subject?.lastName}` };
}
