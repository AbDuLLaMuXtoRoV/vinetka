import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startApi, staffToken } from "./helpers.mjs";

// Lets each test act as a different visitor IP (the web apps sign this header with the shared secret).
process.env.INTERNAL_PROXY_SECRET = "test-proxy-secret";
const asVisitor = (ip) => ({ "X-Snapbell-Client-IP": ip, "X-Snapbell-Proxy-Secret": "test-proxy-secret" });

let api;
let adminToken;

before(async () => {
  api = await startApi();
  const login = await api.call("POST", "/admin/login", { body: { email: "admin@snapbell.com", password: "admin-dev-only" } });
  adminToken = login.data.token;
});
after(() => api.close());

const tokenOf = (link) => new URL(link.url).searchParams.get("token");

async function createStudio(overrides = {}) {
  const res = await api.call("POST", "/admin/studios", {
    token: adminToken,
    body: { studioName: "Oydin Foto", ownerName: "Oydin Yusupova", ownerEmail: `oydin.${Date.now()}.${Math.random()}@oydinfoto.example`, ...overrides },
  });
  assert.equal(res.status, 201, JSON.stringify(res.data));
  return res.data;
}

describe("studios are created by Snapbell staff only", () => {
  it("rejects the removed self-signup routes", async () => {
    assert.equal((await api.call("POST", "/auth/signup", { body: { name: "X", email: "x@x.example", password: "12345678", studioName: "X" } })).status, 404);
    assert.equal((await api.call("POST", "/auth/handoff", { body: { code: "x" } })).status, 404);
  });

  it("only an internal admin can create a studio", async () => {
    const owner = await staffToken(api.call);
    const res = await api.call("POST", "/admin/studios", { token: owner, body: { studioName: "Sneaky", ownerName: "S", ownerEmail: "s@sneaky.example" } });
    assert.equal(res.status, 401);
    assert.equal((await api.call("GET", "/admin/contact-requests", { token: owner })).status, 401);
    assert.equal((await api.call("POST", "/admin/studios", { body: { studioName: "Anon", ownerName: "A", ownerEmail: "a@anon.example" } })).status, 401);
  });

  it("creates the studio and an invited owner, who sets a password and sees only their own business", async () => {
    const created = await createStudio({ ownerPhone: "90 123 45 00", markets: ["sports"] });
    assert.equal(created.owner.role, "owner");
    assert.equal(created.owner.status, "invited");
    assert.equal(created.studio.ownerStatus, "invited");
    assert.equal(created.studio.studio.onboardingDone, false);
    assert.deepEqual(created.studio.studio.markets, ["sports"]);
    assert.equal(api.repo.members.get(created.owner.id).phone, "+998901234500");
    assert.ok(!("phone" in created.owner), "phone stays internal");
    assert.match(created.setupLink.url, /^http:\/\/localhost:3000\/studio\/setup\?token=/);

    // The welcome email goes out, but the live link is never stored in the message log.
    const welcome = api.repo.messages.find((m) => m.template === "studio_welcome" && m.to === created.owner.email);
    assert.ok(welcome);
    assert.ok(!welcome.body.includes(tokenOf(created.setupLink)));

    const info = await api.call("GET", `/auth/setup/${encodeURIComponent(tokenOf(created.setupLink))}`);
    assert.equal(info.status, 200);
    assert.equal(info.data.studioName, "Oydin Foto");
    assert.equal(info.data.role, "owner");

    // Not yet active: password login fails.
    assert.equal((await api.call("POST", "/auth/login", { body: { email: created.owner.email, password: "oydin-password" } })).status, 401);

    const short = await api.call("POST", "/auth/setup", { body: { token: tokenOf(created.setupLink), password: "short" } });
    assert.equal(short.status, 400);

    const done = await api.call("POST", "/auth/setup", { body: { token: tokenOf(created.setupLink), password: "oydin-password" } });
    assert.equal(done.status, 200);
    assert.equal(done.data.member.status, "active");
    assert.equal(done.data.studio.id, created.studio.studio.id);

    const login = await api.call("POST", "/auth/login", { body: { email: created.owner.email, password: "oydin-password" } });
    assert.equal(login.status, 200);
    const token = login.data.token;
    assert.equal((await api.call("GET", "/studio", { token })).data.name, "Oydin Foto");
    assert.deepEqual((await api.call("GET", "/jobs", { token })).data, []);
    assert.deepEqual((await api.call("GET", "/orders", { token })).data, []);
    assert.deepEqual((await api.call("GET", "/organizations", { token })).data, []);
    assert.equal((await api.call("GET", "/jobs/job_maple_fall", { token })).status, 404);

    const rows = (await api.call("GET", "/admin/studios?q=oydin", { token: adminToken })).data;
    assert.equal(rows[0].ownerStatus, "active");
  });

  it("refuses a duplicate owner email and a bad phone", async () => {
    const dup = await api.call("POST", "/admin/studios", { token: adminToken, body: { studioName: "Dup", ownerName: "D", ownerEmail: "owner@brightside.photo" } });
    assert.equal(dup.status, 409);
    assert.equal(dup.data.error, "email_taken");
    const phone = await api.call("POST", "/admin/studios", { token: adminToken, body: { studioName: "P", ownerName: "P", ownerEmail: "p@p.example", ownerPhone: "12" } });
    assert.equal(phone.status, 400);
  });
});

describe("setup links", () => {
  it("are single use", async () => {
    const created = await createStudio();
    const token = tokenOf(created.setupLink);
    assert.equal((await api.call("POST", "/auth/setup", { body: { token, password: "first-password" } })).status, 200);
    const again = await api.call("POST", "/auth/setup", { body: { token, password: "second-password" } });
    assert.equal(again.status, 404);
    assert.equal(again.data.error, "setup_link_invalid");
    assert.equal((await api.call("GET", `/auth/setup/${token}`)).status, 404);
    // Active members can't get a new link.
    const relink = await api.call("POST", `/admin/members/${created.owner.id}/setup-link`, { token: adminToken });
    assert.equal(relink.status, 409);
  });

  it("are replaced by a newer link and expire after 7 days", async () => {
    const created = await createStudio();
    const fresh = await api.call("POST", `/admin/members/${created.owner.id}/setup-link`, { token: adminToken });
    assert.equal(fresh.status, 200);
    const old = await api.call("GET", `/auth/setup/${tokenOf(created.setupLink)}`, { headers: { "Accept-Language": "ru" } });
    assert.equal(old.status, 404);
    assert.match(old.data.message, /[А-Яа-я]/);

    const days = (Date.parse(fresh.data.expiresAt) - Date.now()) / 86_400_000;
    assert.ok(days > 6.9 && days <= 7, `expires in ${days} days`);
    for (const row of api.repo.setupTokens.filter((t) => t.memberId === created.owner.id)) row.expiresAt = Date.now() - 1;
    const expired = await api.call("POST", "/auth/setup", { body: { token: tokenOf(fresh.data), password: "late-password" } });
    assert.equal(expired.status, 410);
    assert.equal(expired.data.error, "setup_link_expired");
  });

  it("work for team members invited by a studio manager", async () => {
    const owner = await staffToken(api.call);
    const invite = await api.call("POST", "/studio/members", { token: owner, body: { email: "malika@brightside.photo", name: "Malika", role: "photographer" } });
    assert.equal(invite.status, 201);
    assert.equal(invite.data.member.status, "invited");
    const resent = await api.call("POST", `/studio/members/${invite.data.member.id}/setup-link`, { token: owner });
    assert.equal(resent.status, 200);
    assert.equal((await api.call("GET", `/auth/setup/${tokenOf(invite.data.setupLink)}`)).status, 404, "older invite link replaced");
    const done = await api.call("POST", "/auth/setup", { body: { token: tokenOf(resent.data), password: "malika-password" } });
    assert.equal(done.status, 200);
    assert.equal(done.data.member.role, "photographer");
    assert.equal(done.data.studio.name, "Brightside Photo Co.");

    const photographer = await staffToken(api.call, "sam@brightside.photo");
    const denied = await api.call("POST", `/studio/members/${invite.data.member.id}/setup-link`, { token: photographer });
    assert.equal(denied.status, 403);
  });
});

describe("contact requests", () => {
  it("are seeded for the demo", async () => {
    const all = (await api.call("GET", "/admin/contact-requests", { token: adminToken })).data;
    for (const id of ["cr_demo_tashkent", "cr_demo_samarkand", "cr_demo_preschools"]) assert.ok(all.some((r) => r.id === id), id);
    assert.deepEqual(
      all.map((r) => r.createdAt),
      [...all.map((r) => r.createdAt)].sort().reverse(),
      "newest first",
    );
  });

  it("are stored from the public form, in the visitor's language", async () => {
    const res = await api.call("POST", "/contact-requests", {
      headers: { ...asVisitor("203.0.113.10"), "Accept-Language": "uz" },
      body: { kind: "partner", name: "Sardor Aliyev", company: "Sardor Studio", phone: "+998 93 111 22 33", city: "Fargʻona", message: "Bogʻchalar uchun suratlar.", details: { market: "preschool" } },
    });
    assert.equal(res.status, 200);
    assert.equal(res.data.received, true);
    const stored = api.repo.contactRequests.get(res.data.id);
    assert.equal(stored.status, "new");
    assert.equal(stored.locale, "uz");
    assert.equal(stored.phone, "+998931112233");
    assert.deepEqual(stored.details, { market: "preschool" });
    assert.ok(api.repo.messages.find((m) => m.template === "contact_request" && m.to === "team@snapbell.com" && m.body.includes("Sardor")));
  });

  it("ignore the honeypot and validate input", async () => {
    const before = api.repo.contactRequests.size;
    const bot = await api.call("POST", "/contact-requests", {
      headers: asVisitor("203.0.113.20"),
      body: { kind: "contact", name: "Bot", email: "bot@spam.example", message: "Buy now", website: "http://spam.example" },
    });
    assert.equal(bot.status, 200);
    assert.equal(api.repo.contactRequests.size, before);

    const noReach = await api.call("POST", "/contact-requests", { headers: { ...asVisitor("203.0.113.21"), "Accept-Language": "ru" }, body: { kind: "demo", name: "No Reach", message: "" } });
    assert.equal(noReach.status, 400);
    assert.equal(noReach.data.error, "contact_required");
    assert.match(noReach.data.message, /[А-Яа-я]/);

    const noMessage = await api.call("POST", "/contact-requests", { headers: asVisitor("203.0.113.21"), body: { kind: "partner", name: "Quiet", email: "q@q.example", message: " " } });
    assert.equal(noMessage.status, 400);
    assert.equal(noMessage.data.error, "message_required");

    // A demo request doesn't need a message.
    const demo = await api.call("POST", "/contact-requests", { headers: asVisitor("203.0.113.21"), body: { kind: "demo", name: "Demo Person", email: "d@d.example" } });
    assert.equal(demo.status, 200);
    assert.equal(api.repo.contactRequests.size, before + 1);
  });

  it("are rate limited per visitor", async () => {
    const send = (ip) => api.call("POST", "/contact-requests", { headers: asVisitor(ip), body: { kind: "contact", name: "Flood", email: "flood@x.example", message: "hi" } });
    for (let i = 0; i < 5; i++) assert.equal((await send("203.0.113.30")).status, 200);
    assert.equal((await send("203.0.113.30")).status, 429);
    assert.equal((await send("203.0.113.31")).status, 200, "another visitor is unaffected");
  });

  it("can be filtered, updated and converted into a studio once", async () => {
    const res = await api.call("POST", "/contact-requests", {
      headers: asVisitor("203.0.113.40"),
      body: { kind: "partner", name: "Bekzod Karimov", company: "Bekzod Foto", email: "bekzod@bekzodfoto.example", message: "Sport suratlari." },
    });
    const id = res.data.id;
    const found = (await api.call("GET", "/admin/contact-requests?kind=partner&status=new&q=bekzod", { token: adminToken })).data;
    assert.equal(found.length, 1);
    const updated = await api.call("PATCH", `/admin/contact-requests/${id}`, { token: adminToken, body: { status: "contacted", note: "Called back" } });
    assert.equal(updated.data.status, "contacted");
    assert.equal(updated.data.note, "Called back");
    assert.equal((await api.call("PATCH", `/admin/contact-requests/${id}`, { token: adminToken, body: { note: null } })).data.note, null);

    const created = await createStudio({ studioName: "Bekzod Foto", ownerName: "Bekzod Karimov", contactRequestId: id });
    const converted = api.repo.contactRequests.get(id);
    assert.equal(converted.status, "converted");
    assert.equal(converted.studioId, created.studio.studio.id);
    const twice = await api.call("POST", "/admin/studios", { token: adminToken, body: { studioName: "Again", ownerName: "A", ownerEmail: "again@x.example", contactRequestId: id } });
    assert.equal(twice.status, 409);
    assert.equal((await api.call("PATCH", "/admin/contact-requests/cr_missing", { token: adminToken, body: { status: "archived" } })).status, 404);
  });
});

describe("shop accounts", () => {
  it("save the parent's name and keep consent when a sign-in omits it", async () => {
    const destination = "parent.signup@example.com";
    const sent = await api.call("POST", "/auth/otp/send", { headers: asVisitor("203.0.113.50"), body: { destination, channel: "email" } });
    const first = await api.call("POST", "/auth/otp/verify", {
      headers: asVisitor("203.0.113.50"),
      body: { destination, code: sent.data.devCode, name: "  Zarina Nurmatova ", consent: { smsUpdates: true, marketing: false } },
    });
    assert.equal(first.status, 200);
    assert.equal(first.data.parent.name, "Zarina Nurmatova");
    assert.equal(first.data.parent.consent.smsUpdates, true);

    // Ordinary sign-in later: no consent in the body keeps the earlier choice.
    api.repo.otps.remove(destination);
    const again = await api.call("POST", "/auth/otp/send", { headers: asVisitor("203.0.113.51"), body: { destination, channel: "email" } });
    const second = await api.call("POST", "/auth/otp/verify", { headers: asVisitor("203.0.113.51"), body: { destination, code: again.data.devCode } });
    assert.equal(second.status, 200);
    assert.equal(second.data.parent.consent.smsUpdates, true);
    assert.equal(second.data.parent.name, "Zarina Nurmatova");
  });

  it("start with both consents off for a new parent who signs in without them", async () => {
    const destination = "fresh.parent@example.com";
    const sent = await api.call("POST", "/auth/otp/send", { headers: asVisitor("203.0.113.60"), body: { destination, channel: "email" } });
    const res = await api.call("POST", "/auth/otp/verify", { headers: asVisitor("203.0.113.60"), body: { destination, code: sent.data.devCode } });
    assert.equal(res.status, 200);
    assert.deepEqual([res.data.parent.consent.smsUpdates, res.data.parent.consent.marketing], [false, false]);
  });
});
