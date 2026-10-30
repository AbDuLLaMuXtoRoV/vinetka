#!/usr/bin/env node
/**
 * Cross-surface smoke test: drives the demo parent, studio and admin flows
 * through the running apps and the API. Start everything first:
 *
 *   pnpm build && pnpm start:all      (or `pnpm dev`)
 *   pnpm smoke
 *
 * Override URLs with API_URL, SITE_URL, STORE_URL, STUDIO_URL, ADMIN_URL.
 */
import { createClient, DEMO_CODES, DEMO_CREDENTIALS, DEMO_IDS } from "@snapbell/sdk";

const API = process.env.API_URL ?? "http://localhost:4000/v1";
const SITE = process.env.SITE_URL ?? "http://localhost:3000";
const STORE = process.env.STORE_URL ?? "http://localhost:3001";
const STUDIO = process.env.STUDIO_URL ?? "http://localhost:3002";
const ADMIN = process.env.ADMIN_URL ?? "http://localhost:3003";

let failures = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const fail = (msg) => {
  failures++;
  console.log(`  ✗ ${msg}`);
};
const check = (cond, msg) => (cond ? ok(msg) : fail(msg));

/** GET a page; returns { status, text, location }. Never follows redirects. */
async function page(url, cookie) {
  const res = await fetch(url, { redirect: "manual", headers: cookie ? { cookie } : {} });
  return { status: res.status, text: await res.text(), location: res.headers.get("location") };
}

async function expectPage(url, cookie, needle, label = url) {
  try {
    const { status, text } = await page(url, cookie);
    const found = needle ? text.includes(needle) : true;
    check(status === 200 && found, `${label} → ${status}${needle ? (found ? ` (has "${needle}")` : ` (missing "${needle}")`) : ""}`);
  } catch (e) {
    fail(`${label} → ${e.message}`);
  }
}

async function section(name, fn) {
  console.log(`\n${name}`);
  try {
    await fn();
  } catch (e) {
    fail(`${name} aborted: ${e.message}`);
  }
}

await section("API", async () => {
  const res = await fetch(`${API}/health`);
  check(res.ok, `health → ${res.status}`);
});

const parentApi = { client: null, token: null };

await section("Parent sign-in (one-time code)", async () => {
  const anon = createClient({ baseUrl: API });
  const dest = DEMO_CREDENTIALS.parent.email;
  const sent = await anon.auth.sendOtp({ destination: dest, channel: "email", albumCode: DEMO_CODES.personal });
  check(Boolean(sent.devCode), "devCode returned outside production");
  const session = await anon.auth.verifyOtp({ destination: dest, code: sent.devCode, consent: { smsUpdates: true, marketing: false } });
  check(Boolean(session.token), "verified, got parent token");
  parentApi.token = session.token;
  parentApi.client = createClient({ baseUrl: API, token: session.token });
});

await section("Family Store pages", async () => {
  const cookie = `sb_parent=${parentApi.token}`;
  await expectPage(`${STORE}/`, null, null, "/ (enter code)");
  const gated = await page(`${STORE}/a/${DEMO_CODES.personal}`);
  check(gated.status >= 300 && gated.status < 400 && gated.location?.includes("/verify"), `/a/SAMPLE without session redirects to /verify`);
  await expectPage(`${STORE}/a/${DEMO_CODES.personal}`, cookie, "Ava", "/a/SAMPLE (album)");
  await expectPage(`${STORE}/a/${DEMO_CODES.personal}/shop`, cookie, "Family Favorite", "/a/SAMPLE/shop");
  await expectPage(`${STORE}/a/${DEMO_CODES.team}`, cookie, null, "/a/EAGLES (team album)");
  await expectPage(`${STORE}/a/${DEMO_CODES.team}/find-me`, cookie, null, "/a/EAGLES/find-me");
  await expectPage(`${STORE}/a/${DEMO_CODES.notPublished}`, cookie, null, "/a/DANCE7 (not published state)");
  await expectPage(`${STORE}/account`, cookie, "Leo", "/account");
  await expectPage(`${STORE}/pass/${DEMO_IDS.lumen}`, null, "Winter Recital", "/pass/[job]");
});

let orderId = null;
let orderNumber = null;

await section("Album protection + order (API)", async () => {
  const c = parentApi.client;
  const album = await c.store.album(DEMO_CODES.personal);
  const photo = album.photos[0];
  const media = await fetch(photo.thumbUrl);
  const svg = await media.text();
  check(media.ok && svg.includes("PROOF"), "preview is watermarked");
  const tampered = await fetch(photo.thumbUrl.replace(/sig=[^&]+/, "sig=forged"));
  check(tampered.status === 403, `tampered signature → ${tampered.status}`);

  const shop = await c.store.shop(DEMO_CODES.personal);
  const pkg = shop.packages.find((p) => p.featured) ?? shop.packages[0];
  let cart = await c.carts.create({ albumCode: DEMO_CODES.personal });
  cart = await c.carts.update(cart.id, {
    items: [
      {
        id: "smoke-1",
        kind: "package",
        refId: pkg.id,
        quantity: 1,
        albumCode: DEMO_CODES.personal,
        subjectId: album.subject?.id ?? null,
        photoIds: [photo.id],
        customization: null,
      },
    ],
    promoCode: "FALL10",
    deliveryMethod: "home",
  });
  check(cart.totals.discountCents > 0, `promo FALL10 applied (−${cart.totals.discountCents}¢)`);
  const result = await c.checkout.submit({
    cartId: cart.id,
    contact: { name: "Elena Martinez", email: DEMO_CREDENTIALS.parent.email, phone: null },
    delivery: { method: "home", address: { line1: "12 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" } },
    payment: { method: "card", paymentMethodId: null },
  });
  check(result.status === "paid", `checkout → ${result.status}`);
  const order = await c.orders.get(result.orderId);
  const s = order.split;
  check(s.taxCents + s.labCostCents + s.platformFeeCents + s.cardFeeCents + s.studioPayoutCents === s.totalCents, `order ${order.number} money split adds up to the cent`);
  orderId = order.id;
  orderNumber = order.number;
  await expectPage(`${STORE}/orders/${orderId}`, `sb_parent=${parentApi.token}`, orderNumber, "/orders/[id] confirmation");
});

await section("Studio app", async () => {
  const owner = await createClient({ baseUrl: API }).auth.login(DEMO_CREDENTIALS.owner);
  const cookie = `sb_studio=${owner.token}`;
  const gated = await page(`${STUDIO}/home`);
  check(gated.status >= 300 && gated.status < 400, "/home without session redirects");
  await expectPage(`${STUDIO}/home`, cookie, "Brightside", "/home");
  await expectPage(`${STUDIO}/jobs`, cookie, "Fall Picture Day", "/jobs");
  await expectPage(`${STUDIO}/jobs/${DEMO_IDS.eagles}/matching`, cookie, null, "/jobs/[id]/matching");
  await expectPage(`${STUDIO}/jobs/${DEMO_IDS.maple}/roster`, cookie, "Ava", "/jobs/[id]/roster");
  await expectPage(`${STUDIO}/price-sheets/ps_fall_schools`, cookie, "8×10 Print", "/price-sheets/[id]");
  await expectPage(`${STUDIO}/reports`, cookie, null, "/reports (owner)");
  if (orderId) await expectPage(`${STUDIO}/orders/${orderId}`, cookie, orderNumber, "/orders/[id] (new order visible to studio)");

  const photographer = await createClient({ baseUrl: API }).auth.login(DEMO_CREDENTIALS.photographer);
  const blocked = await page(`${STUDIO}/reports`, `sb_studio=${photographer.token}`);
  check(blocked.status !== 200 || !blocked.text.includes("Payouts"), `photographer kept out of /reports (${blocked.status})`);
});

await section("Internal admin", async () => {
  const { token } = await createClient({ baseUrl: API }).admin.login(DEMO_CREDENTIALS.internalAdmin);
  await expectPage(`${ADMIN}/studios`, `sb_admin=${token}`, "Brightside", "/studios");
  await expectPage(`${ADMIN}/lab-queue`, `sb_admin=${token}`, null, "/lab-queue");
});

await section("Marketing site", async () => {
  for (const [path, needle] of [
    ["/", "Start free"],
    ["/pricing", "250"],
    ["/markets", null],
    ["/features/family-store", null],
    ["/find-my-photos", null],
    ["/signup", null],
    ["/blog", null],
    ["/help", null],
    ["/privacy", "Draft"],
    ["/sitemap.xml", "/pricing"],
  ]) {
    await expectPage(`${SITE}${path}`, null, needle, path);
  }
});

await section("Languages (en / ru / uz)", async () => {
  const cyrillic = /[А-Яа-яЁё]{4,}/;
  const lang = (html) => /<html[^>]*\slang="([^"]+)"/.exec(html)?.[1];

  const branding = await fetch(`${API}/albums/ZZZZZZ/branding`, { headers: { "Accept-Language": "ru" } });
  const body = await branding.json();
  check(branding.status === 404 && cyrillic.test(body.message ?? ""), `API error in Russian: "${body.message}"`);

  const home = await page(`${SITE}/`);
  // React renders the attribute as hrefLang; HTML attribute names are case-insensitive.
  check(/hreflang="ru"/i.test(home.text) && /hreflang="uz"/i.test(home.text), "marketing / has ru + uz hreflang alternates");
  for (const [path, want] of [["/ru/pricing", "ru-RU"], ["/uz/pricing", "uz-Latn-UZ"]]) {
    const p = await page(`${SITE}${path}`);
    check(p.status === 200 && lang(p.text) === want, `marketing ${path} → lang=${lang(p.text)}`);
  }

  const parent = `sb_parent=${parentApi.token}`;
  const ru = await page(`${STORE}/a/${DEMO_CODES.personal}`, `${parent}; sb_locale=ru`);
  check(ru.status === 200 && lang(ru.text) === "ru-RU" && cyrillic.test(ru.text), `store album in Russian (lang=${lang(ru.text)})`);
  const switchLang = await page(`${STORE}/?lang=uz`);
  check(switchLang.status >= 300 && switchLang.status < 400, `store ?lang=uz sets the language and redirects (${switchLang.status})`);

  const owner = await createClient({ baseUrl: API }).auth.login(DEMO_CREDENTIALS.owner);
  const uz = await page(`${STUDIO}/home`, `sb_studio=${owner.token}; sb_locale=uz`);
  check(uz.status === 200 && lang(uz.text) === "uz-Latn-UZ", `studio home in Uzbek (lang=${lang(uz.text)})`);

  const { token } = await createClient({ baseUrl: API }).admin.login(DEMO_CREDENTIALS.internalAdmin);
  const admin = await page(`${ADMIN}/studios`, `sb_admin=${token}; sb_locale=ru`);
  check(admin.status === 200 && lang(admin.text) === "ru-RU" && cyrillic.test(admin.text), `admin studios in Russian (lang=${lang(admin.text)})`);
});

console.log(failures === 0 ? "\nAll smoke checks passed." : `\n${failures} smoke check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
