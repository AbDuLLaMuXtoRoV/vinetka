import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startApi, staffToken } from "./helpers.mjs";

// Each simulated parent comes from its own visitor IP so per-IP code limits don't interfere.
process.env.INTERNAL_PROXY_SECRET = "test-proxy-secret";
const asVisitor = (ip) => ({ "X-Snapbell-Client-IP": ip, "X-Snapbell-Proxy-Secret": "test-proxy-secret" });

let api;
let adminToken;
let owner;
let visitor = 0;

before(async () => {
  api = await startApi();
  adminToken = (await api.call("POST", "/admin/login", { body: { email: "admin@snapbell.com", password: "admin-dev-only" } })).data.token;
  owner = await staffToken(api.call);
});
after(() => api.close());

/** Signs up a brand-new parent through the one-time code flow. */
async function newParent(name) {
  const headers = asVisitor(`198.51.100.${++visitor}`);
  const destination = `90 7${String(visitor).padStart(2, "0")} ${String(Date.now()).slice(-2)} ${String(visitor).padStart(2, "0")}`;
  const sent = await api.call("POST", "/auth/otp/send", { headers, body: { destination, channel: "sms" } });
  assert.equal(sent.status, 200, JSON.stringify(sent.data));
  const verified = await api.call("POST", "/auth/otp/verify", { headers, body: { destination, code: sent.data.devCode, name } });
  assert.equal(verified.status, 200, JSON.stringify(verified.data));
  return { token: verified.data.token, parent: verified.data.parent, headers };
}

/** Puts the featured SAMPLE package in a fresh cart for this parent. */
async function cartFor(token) {
  const album = await api.call("GET", "/albums/SAMPLE", { token });
  const shop = await api.call("GET", "/albums/SAMPLE/shop", { token });
  const pkg = shop.data.packages.find((p) => p.featured);
  const cart = await api.call("POST", "/carts", { token, body: { albumCode: "SAMPLE" } });
  const filled = await api.call("PATCH", `/carts/${cart.data.id}`, {
    token,
    body: {
      items: [{ id: "line-1", kind: "package", refId: pkg.id, quantity: 1, albumCode: "SAMPLE", subjectId: null, photoIds: [album.data.photos[0].id], customization: null }],
      deliveryMethod: "school_pickup",
    },
  });
  assert.equal(filled.status, 200, JSON.stringify(filled.data));
  return cart.data.id;
}

async function checkout(token, cartId, email) {
  const res = await api.call("POST", "/checkout", {
    token,
    body: { cartId, contact: { name: "Test Parent", email, phone: null }, delivery: { method: "school_pickup", address: null }, payment: { method: "card" } },
  });
  assert.ok(res.status < 300, JSON.stringify(res.data));
  return res.data;
}

const studioClients = async (token, q) => api.call("GET", `/studio/clients${q ? `?q=${encodeURIComponent(q)}` : ""}`, { token });

describe("studio client list (privacy)", () => {
  it("lists only parents with a paid order at this studio", async () => {
    const res = await studioClients(owner);
    assert.equal(res.status, 200);
    assert.ok(res.data.length > 0);
    for (const row of res.data) {
      const paidHere = api.repo.orders.filter((o) => o.parentId === row.id && o.studioId === "stu_brightside" && o.paymentState === "paid");
      assert.ok(paidHere.length > 0, `${row.id} has no paid Brightside order`);
      assert.equal(row.orders, paidHere.length);
      assert.ok(row.children.length > 0);
    }
    // Parents who only bought from another studio never appear.
    const otherStudioOnly = api.repo.parents.filter(
      (p) => !!api.repo.orders.find((o) => o.parentId === p.id && o.studioId !== "stu_brightside") && !api.repo.orders.find((o) => o.parentId === p.id && o.studioId === "stu_brightside"),
    );
    assert.ok(otherStudioOnly.length > 0);
    for (const p of otherStudioOnly) assert.ok(!res.data.some((r) => r.id === p.id));
  });

  it("never shows a parent who only opened an album", async () => {
    const { token, parent } = await newParent("Album Only");
    assert.equal((await api.call("GET", "/albums/SAMPLE", { token })).status, 200);
    const res = await studioClients(owner);
    assert.ok(!res.data.some((r) => r.id === parent.id));
  });

  it("shows a 3-D Secure order only once payment is confirmed", async () => {
    const { token, parent } = await newParent("Pending Payer");
    const result = await checkout(token, await cartFor(token), "pending+3ds@example.com");
    assert.equal(result.status, "requires_action");
    assert.ok(!(await studioClients(owner)).data.some((r) => r.id === parent.id), "pending payment is not a purchase");

    assert.equal((await api.call("POST", `/checkout/${result.orderId}/confirm`, { token })).data.status, "paid");
    const row = (await studioClients(owner)).data.find((r) => r.id === parent.id);
    assert.ok(row, "listed after payment");
    assert.equal(row.name, "Pending Payer");
    assert.equal(row.orders, 1);
    assert.deepEqual(row.children, ["Ava Martinez"]);
    assert.ok(row.spentCents > 0);
    assert.equal(row.marketingOptIn, false);
    assert.equal(row.firstOrderAt, row.lastOrderAt);

    // Search by child name finds the client.
    assert.ok((await studioClients(owner, "ava martinez")).data.some((r) => r.id === parent.id));
  });

  it("subtracts refunds from what the client spent", async () => {
    const { token, parent } = await newParent("Refunded Buyer");
    const result = await checkout(token, await cartFor(token), "refunded.buyer@example.com");
    const before = (await studioClients(owner)).data.find((r) => r.id === parent.id);
    const refund = await api.call("POST", `/orders/${result.orderId}/refund`, { token: owner, body: { amountCents: 500, reason: "Test" } });
    assert.ok(refund.status < 300, JSON.stringify(refund.data));
    const afterRefund = (await studioClients(owner)).data.find((r) => r.id === parent.id);
    assert.equal(afterRefund.spentCents, before.spentCents - 500);
  });

  it("is for owners and admins only", async () => {
    const photographer = await staffToken(api.call, "sam@brightside.photo");
    assert.equal((await studioClients(photographer)).status, 403);
    assert.equal((await api.call("GET", "/studio/clients")).status, 401);
  });

  it("starts empty for a new studio", async () => {
    const created = await api.call("POST", "/admin/studios", {
      token: adminToken,
      body: { studioName: "Bahor Foto", ownerName: "Bahor Karimova", ownerEmail: `bahor.${Date.now()}@bahorfoto.example` },
    });
    const token = new URL(created.data.setupLink.url).searchParams.get("token");
    const session = await api.call("POST", "/auth/setup", { body: { token, password: "bahor-foto-2026" } });
    assert.equal(session.status, 200);
    const res = await studioClients(session.data.token);
    assert.equal(res.status, 200);
    assert.deepEqual(res.data, []);
  });
});

describe("admin client list", () => {
  it("includes customers who signed up but never ordered", async () => {
    const { parent } = await newParent("Just Signed Up");
    const res = await api.call("GET", "/admin/clients", { token: adminToken });
    assert.equal(res.status, 200);
    const row = res.data.find((r) => r.parent.id === parent.id);
    assert.ok(row);
    assert.equal(row.orders, 0);
    assert.equal(row.spentCents, 0);
    assert.deepEqual(row.studios, []);
    assert.equal(row.lastOrderAt, null);
    // Newest accounts first.
    assert.ok(res.data[0].parent.createdAt >= res.data[res.data.length - 1].parent.createdAt);

    const elena = res.data.find((r) => r.parent.email === "parent@example.com");
    assert.ok(elena.orders > 0);
    assert.deepEqual(elena.studios.map((s) => s.id), ["stu_brightside"]);
    assert.ok(elena.children >= 2);

    const search = await api.call("GET", "/admin/clients?q=just%20signed", { token: adminToken });
    assert.deepEqual(search.data.map((r) => r.parent.id), [parent.id]);
  });

  it("is for the internal admin only", async () => {
    assert.equal((await api.call("GET", "/admin/clients", { token: owner })).status, 401);
    assert.equal((await api.call("GET", "/admin/clients")).status, 401);
  });
});

describe("parent handoff (main site → shop)", () => {
  it("issues a one-time code that becomes a shop session", async () => {
    const { token, parent, headers } = await newParent("Handoff Parent");
    const issued = await api.call("POST", "/auth/parent-handoff", { token });
    assert.equal(issued.status, 200);
    assert.equal(issued.data.expiresInSec, 60);
    assert.ok(issued.data.code.length >= 20);
    assert.ok(!api.repo.parentHandoffs.all().some((h) => h.id === issued.data.code), "only a hash is stored");

    const redeemed = await api.call("POST", "/auth/parent-handoff/redeem", { headers, body: { code: issued.data.code } });
    assert.equal(redeemed.status, 200);
    assert.equal(redeemed.data.parent.id, parent.id);
    const account = await api.call("GET", "/account", { token: redeemed.data.token });
    assert.equal(account.status, 200);
    assert.equal(account.data.parent.name, "Handoff Parent");

    const again = await api.call("POST", "/auth/parent-handoff/redeem", { headers, body: { code: issued.data.code } });
    assert.equal(again.status, 404);
    assert.equal(again.data.error, "handoff_invalid");
  });

  it("keeps the parent's consent untouched", async () => {
    const { token, parent, headers } = await newParent("Consent Keeper");
    api.repo.parents.get(parent.id).consent.marketing = true;
    const { code } = (await api.call("POST", "/auth/parent-handoff", { token })).data;
    await api.call("POST", "/auth/parent-handoff/redeem", { headers, body: { code } });
    assert.equal(api.repo.parents.get(parent.id).consent.marketing, true);
  });

  it("expires after a minute", async () => {
    const { token, parent, headers } = await newParent("Slow Clicker");
    const { code } = (await api.call("POST", "/auth/parent-handoff", { token })).data;
    const row = api.repo.parentHandoffs.find((h) => h.parentId === parent.id && h.usedAt === null);
    row.expiresAt = Date.now() - 1;
    const res = await api.call("POST", "/auth/parent-handoff/redeem", { headers, body: { code } });
    assert.equal(res.status, 410);
    assert.equal(res.data.error, "handoff_expired");
  });

  it("needs a signed-in parent and a real code", async () => {
    assert.equal((await api.call("POST", "/auth/parent-handoff")).status, 401);
    assert.equal((await api.call("POST", "/auth/parent-handoff", { token: owner })).status, 401);
    const bogus = await api.call("POST", "/auth/parent-handoff/redeem", { body: { code: "not-a-real-code" }, headers: { "Accept-Language": "uz" } });
    assert.equal(bogus.status, 404);
    assert.match(bogus.data.message, /havola/i);
  });
});

describe("parent accounts", () => {
  it("record when they were created", async () => {
    const started = Date.now();
    const { parent } = await newParent("New Account");
    assert.ok(parent.createdAt);
    assert.ok(Date.parse(parent.createdAt) >= started - 1000);
    // Demo parents keep their seeded dates instead of "now".
    const elena = api.repo.parents.find((p) => p.email === "parent@example.com");
    assert.ok(Date.parse(elena.createdAt) < started - 30 * 86_400_000);
  });
});
