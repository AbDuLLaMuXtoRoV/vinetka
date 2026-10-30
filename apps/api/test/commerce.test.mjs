import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { parentToken, staffToken, startApi } from "./helpers.mjs";

let api;
let parent;
before(async () => {
  api = await startApi();
  parent = await parentToken(api.call);
});
after(async () => {
  await api.close();
});

const contact = { name: "Elena Martinez", email: "parent@example.com", phone: "+15555550123" };
const address = { line1: "1 Valencia St", line2: null, city: "San Francisco", state: "CA", postalCode: "94110", country: "US" };

function balanced(split) {
  return split.taxCents + split.labCostCents + split.platformFeeCents + split.cardFeeCents + split.studioPayoutCents === split.totalCents;
}

async function fillCart() {
  const album = await api.call("GET", "/albums/SAMPLE", { token: parent });
  const shop = await api.call("GET", "/albums/SAMPLE/shop", { token: parent });
  const pkg = shop.data.packages.find((p) => p.featured);
  const print = shop.data.products.find((p) => p.name === "8×10 Print");
  const cart = await api.call("POST", "/carts", { token: parent, body: { albumCode: "SAMPLE" } });
  assert.equal(cart.status, 201);
  const photoId = album.data.photos[0].id;
  const updated = await api.call("PATCH", `/carts/${cart.data.id}`, {
    token: parent,
    body: {
      items: [
        { id: "line-1", kind: "package", refId: pkg.id, quantity: 1, albumCode: "SAMPLE", subjectId: null, photoIds: [photoId], customization: null },
        {
          id: "line-2",
          kind: "product",
          refId: print.id,
          quantity: 2,
          albumCode: "SAMPLE",
          subjectId: null,
          photoIds: [photoId],
          customization: { crop: null, background: null, theme: null, nameText: "Ava", retouch: true },
          // Client-sent prices are ignored.
          unitPriceCents: 1,
        },
      ],
      promoCode: "fall10",
      postalCode: "94110",
    },
  });
  return { cart: updated, pkg, print };
}

describe("cart → checkout → order", () => {
  it("prices the cart on the server and checks out an order that balances to the cent", async () => {
    const { cart, pkg, print } = await fillCart();
    assert.equal(cart.status, 200, JSON.stringify(cart.data));
    const line2 = cart.data.items.find((i) => i.id === "line-2");
    assert.equal(line2.unitPriceCents, print.priceCents + 800, "retouch add-on, client price ignored");
    assert.equal(line2.subjectName, "Ava Martinez");
    const subtotal = pkg.priceCents + 2 * (print.priceCents + 800);
    assert.equal(cart.data.totals.subtotalCents, subtotal);
    assert.equal(cart.data.totals.discountCents, Math.round(subtotal * 0.1));
    assert.equal(cart.data.promoError, null);

    const result = await api.call("POST", "/checkout", {
      token: parent,
      body: { cartId: cart.data.id, contact, delivery: { method: "home", address }, payment: { method: "card", paymentMethodId: null } },
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    assert.equal(result.data.status, "paid");

    const order = await api.call("GET", `/orders/${result.data.orderId}`, { token: parent });
    assert.equal(order.status, 200);
    const s = order.data.split;
    assert.ok(balanced(s), JSON.stringify(s));
    assert.equal(s.chargedCents + s.passCreditCents, s.totalCents);
    assert.equal(s.taxCents, Math.round((subtotal - s.discountCents + s.shippingCents) * 0.0725));
    assert.equal(s.shippingCents, 695);
    assert.ok(order.data.downloads.length > 0, "Family Favorite includes a digital file");
    assert.ok(order.data.messages.some((m) => m.template === "order_confirmation"));

    const emptied = await api.call("GET", `/carts/${cart.data.id}`, { token: parent });
    assert.equal(emptied.data.items.length, 0);

    const download = await api.call("GET", order.data.downloads[0].url);
    assert.equal(download.status, 200);
    assert.doesNotMatch(download.text, /PROOF/);

    // Staff see it; refunds are partial-capable and bounded.
    const staff = await staffToken(api.call);
    const staffView = await api.call("GET", `/orders/${result.data.orderId}`, { token: staff });
    assert.equal(staffView.status, 200);
    const partial = await api.call("POST", `/orders/${result.data.orderId}/refund`, { token: staff, body: { amountCents: 500, reason: "Smudged print" } });
    assert.equal(partial.status, 200);
    assert.equal(partial.data.status, "partially_refunded");
    const tooMuch = await api.call("POST", `/orders/${result.data.orderId}/refund`, { token: staff, body: { amountCents: s.chargedCents, reason: "x" } });
    assert.equal(tooMuch.status, 400);
    const photographer = await staffToken(api.call, "sam@brightside.photo");
    assert.equal((await api.call("POST", `/orders/${result.data.orderId}/refund`, { token: photographer, body: { reason: "x" } })).status, 403);
    const rest = await api.call("POST", `/orders/${result.data.orderId}/refund`, { token: staff, body: { reason: "Customer request" } });
    assert.equal(rest.data.status, "refunded");
  });

  it("simulates 3-D Secure and confirms afterwards", async () => {
    const { cart } = await fillCart();
    const result = await api.call("POST", "/checkout", {
      token: parent,
      body: { cartId: cart.data.id, contact: { ...contact, email: "parent+3ds@example.com" }, delivery: { method: "school_pickup", address: null }, payment: { method: "card" } },
    });
    assert.equal(result.data.status, "requires_action");
    assert.ok(result.data.clientSecret);
    const staff = await staffToken(api.call);
    assert.equal((await api.call("GET", `/orders/${result.data.orderId}`, { token: staff })).status, 404, "unpaid orders are hidden from the studio");
    const confirmed = await api.call("POST", `/checkout/${result.data.orderId}/confirm`, { token: parent });
    assert.equal(confirmed.data.status, "paid");
    const order = await api.call("GET", `/orders/${result.data.orderId}`, { token: staff });
    assert.equal(order.data.delivery.method, "school_pickup");
    assert.equal(order.data.split.shippingCents, 0);
    assert.ok(balanced(order.data.split));
    const batches = await api.call("GET", "/jobs/job_maple_fall/bulk-batches", { token: staff });
    assert.ok(batches.data[0].orders > 0);
  });

  it("rejects bad promo codes without failing the cart", async () => {
    const cart = await api.call("POST", "/carts", { token: parent, body: { albumCode: "SAMPLE" } });
    const res = await api.call("PATCH", `/carts/${cart.data.id}`, { token: parent, body: { promoCode: "SPRING25" } });
    assert.equal(res.status, 200);
    assert.match(res.data.promoError, /expired|active/);
  });

  it("refuses items from another studio in the same cart", async () => {
    const cart = await api.call("POST", "/carts", { token: parent, body: { albumCode: "SAMPLE" } });
    const gh = await api.call("PATCH", `/carts/${cart.data.id}`, {
      token: parent,
      body: { items: [{ id: "x", kind: "product", refId: "ps_sports_810", quantity: 1, albumCode: "RVRSDE", photoIds: [] }] },
    });
    assert.equal(gh.status, 409);
    assert.equal(gh.data.error, "different_studio");
  });
});
