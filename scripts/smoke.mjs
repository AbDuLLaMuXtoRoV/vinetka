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

  const orgs = await page(`${STUDIO}/organizations`, cookie);
  check(orgs.status === 404, `/organizations removed (${orgs.status})`);
  const clients = await createClient({ baseUrl: API, token: owner.token }).studio.clients();
  check(clients.length > 0 && clients.every((c) => c.orders > 0), `studio clients are buyers only (${clients.length})`);
  await expectPage(`${STUDIO}/clients`, cookie, clients[0]?.name ?? "", "/clients (studio buyers)");

  const photographer = await createClient({ baseUrl: API }).auth.login(DEMO_CREDENTIALS.photographer);
  const blockedClients = await page(`${STUDIO}/clients`, `sb_studio=${photographer.token}`);
  check(blockedClients.status !== 200 || blockedClients.text.includes("NEXT_REDIRECT"), `photographer kept out of /clients (${blockedClients.status})`);
  const blocked = await page(`${STUDIO}/reports`, `sb_studio=${photographer.token}`);
  check(blocked.status !== 200 || !blocked.text.includes("Payouts"), `photographer kept out of /reports (${blocked.status})`);
});

await section("Internal admin", async () => {
  const { token } = await createClient({ baseUrl: API }).admin.login(DEMO_CREDENTIALS.internalAdmin);
  await expectPage(`${ADMIN}/studios`, `sb_admin=${token}`, "Brightside", "/studios");
  await expectPage(`${ADMIN}/lab-queue`, `sb_admin=${token}`, null, "/lab-queue");
  await expectPage(`${ADMIN}/requests`, `sb_admin=${token}`, null, "/requests (contact requests)");
  await expectPage(`${ADMIN}/clients`, `sb_admin=${token}`, "Elena", "/clients (all customer accounts)");
});

await section("Marketing site", async () => {
  for (const [path, needle] of [
    ["/", "/contact"],
    ["/pricing", "250"],
    ["/markets", null],
    ["/features/family-store", null],
    ["/find-my-photos", null],
    ["/contact", null],
    ["/blog", null],
    ["/help", null],
    ["/privacy", "Draft"],
    ["/sitemap.xml", "/contact"],
  ]) {
    await expectPage(`${SITE}${path}`, null, needle, path);
  }
  const home = await page(`${SITE}/`);
  check(!home.text.includes("Start free"), 'no studio self-signup ("Start free") on the home page');
  // /signup on the main site is for parents (shop customers); studios have no self-signup.
  for (const path of ["/signin", "/signup", "/uz/signup"]) await expectPage(`${SITE}${path}`, null, null, `main-site ${path} (parents)`);
});

await section("Studios are created by Snapbell only", async () => {
  const anon = createClient({ baseUrl: API });
  const selfSignup = await fetch(`${API}/auth/signup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  check(selfSignup.status === 404, `self-signup endpoint is gone (${selfSignup.status})`);

  const stamp = Date.now().toString(36);
  const sent = await anon.contact.submit({
    kind: "partner",
    name: `Smoke Tester ${stamp}`,
    company: `Smoke Test Studio ${stamp}`,
    phone: "90 555 12 34",
    city: "Tashkent",
    message: "Automated smoke test: please ignore.",
  });
  check(sent.received === true, "contact form request accepted");

  const { token: adminToken } = await anon.admin.login(DEMO_CREDENTIALS.internalAdmin);
  const admin = createClient({ baseUrl: API, token: adminToken }).admin;
  const [request] = await admin.contactRequests({ q: stamp });
  check(request?.kind === "partner" && request.phone === "+998905551234", "request visible in Admin with +998 phone");

  const created = await admin.createStudio({
    studioName: `Smoke Test Studio ${stamp}`,
    ownerName: `Smoke Tester ${stamp}`,
    ownerEmail: `smoke-${stamp}@example.com`,
    contactRequestId: request?.id ?? null,
  });
  const setupToken = new URL(created.setupLink.url).searchParams.get("token");
  check(Boolean(setupToken) && created.owner.status === "invited", "Admin created the studio and an owner setup link");
  const [converted] = await admin.contactRequests({ q: stamp });
  check(converted?.status === "converted", "request marked converted");

  await expectPage(`${STUDIO}/setup?token=${setupToken}`, null, `Smoke Test Studio ${stamp}`, "/setup page shows the new studio");
  const session = await anon.auth.completeSetup({ token: setupToken, password: `smoke-${stamp}-password` });
  check(session.studio.name === `Smoke Test Studio ${stamp}`, "owner chose a password and is signed in");
  const reuse = await fetch(`${API}/auth/setup/${setupToken}`);
  check(reuse.status === 404 || reuse.status === 410, `setup link works only once (${reuse.status})`);
  const owner = createClient({ baseUrl: API, token: session.token });
  check((await owner.jobs.list()).length === 0 && (await owner.orders.list()).length === 0, "new studio sees only its own (empty) data");
  check((await owner.studio.clients()).length === 0, "new studio sees no clients until someone buys from it");
  const onboarding = await page(`${STUDIO}/onboarding`, `sb_studio=${session.token}`);
  check(onboarding.status === 200, `new owner lands in the setup wizard (${onboarding.status})`);

  if (request) await admin.updateContactRequest(request.id, { status: "archived", note: "Smoke test" });
});

await section("Shop accounts for parents", async () => {
  const go = await page(`${SITE}/go/store?to=/account&lang=en`, `sb_parent=${parentApi.token}`);
  const handoff = go.location ?? "";
  check(go.status >= 300 && go.status < 400 && handoff.includes("/auth/continue?code="), "signed-in main-site link hands the login to the shop");
  if (handoff.includes("/auth/continue")) {
    const cont = await fetch(handoff, { redirect: "manual" });
    const setCookie = cont.headers.get("set-cookie") ?? "";
    check(cont.status >= 300 && cont.status < 400 && setCookie.includes("sb_parent="), `shop accepted the handoff (${cont.status})`);
    const reused = await fetch(handoff, { redirect: "manual" });
    check((reused.headers.get("location") ?? "").includes("/signin"), "a handoff code works only once");
  }
  const anon = await page(`${SITE}/go/store?to=/&lang=en`);
  check((anon.location ?? "").startsWith(STORE) && !(anon.location ?? "").includes("/auth/continue"), "signed-out link goes straight to the shop");
  await expectPage(`${STORE}/signin`, null, null, "/signin");
  await expectPage(`${STORE}/signup`, null, null, "/signup");
  const gated = await page(`${STORE}/account`);
  check(gated.status >= 300 && gated.status < 400 && gated.location?.includes("/signin"), `/account without session → ${gated.location ?? gated.status}`);
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
