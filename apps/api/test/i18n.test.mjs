import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { formatters } from "@snapbell/sdk";
import { parentToken, startApi } from "./helpers.mjs";

const RU = { "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8" };
const UZ = { "Accept-Language": "uz" };
const CYRILLIC = /[Ѐ-ӿ]/;

let api;
let parent;
before(async () => {
  api = await startApi();
  parent = await parentToken(api.call);
});
after(async () => {
  await api.close();
});

describe("localized messages", () => {
  it("stays in English without Accept-Language", async () => {
    const res = await api.call("GET", "/albums/ZZZZZZ", { token: parent });
    assert.equal(res.data.message, "We couldn't find photos for that code. Check the code on your flyer or text.");
  });

  it("returns a Russian invalid_code message, keeping the English error code", async () => {
    const res = await api.call("GET", "/albums/ZZZZZZ", { token: parent, headers: RU });
    assert.equal(res.status, 404);
    assert.equal(res.data.error, "invalid_code");
    assert.match(res.data.message, CYRILLIC);
    assert.match(res.data.message, /не нашли фотографии/);
  });

  it("returns an Uzbek not_published message with the date formatted in Uzbek", async () => {
    const res = await api.call("GET", "/albums/DANCE7", { token: parent, headers: UZ });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, "not_published");
    const date = formatters("uz").date(res.data.publishAt, { month: "long", day: "numeric", year: "numeric" });
    assert.match(res.data.message, /hali tayyor emas/);
    assert.ok(res.data.message.includes(date), `${res.data.message} should include ${date}`);
  });

  it("localizes promo errors on the cart", async () => {
    const cart = await api.call("POST", "/carts", { token: parent, headers: RU, body: { albumCode: "SAMPLE" } });
    assert.equal(cart.status, 201);
    const expired = await api.call("PATCH", `/carts/${cart.data.id}`, { token: parent, headers: RU, body: { promoCode: "SPRING25" } });
    assert.equal(expired.status, 200);
    assert.equal(expired.data.promoError, "Этот промокод больше не действует.");
    const unknown = await api.call("PATCH", `/carts/${cart.data.id}`, { token: parent, headers: UZ, body: { promoCode: "NOPE99" } });
    assert.equal(unknown.data.promoError, "Bunday promokod topilmadi.");
  });

  it("localizes validation errors with field names", async () => {
    const res = await api.call("POST", "/auth/login", { headers: UZ, body: {} });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, "validation_failed");
    assert.match(res.data.message, /Parol: Bu maydon toʻldirilishi shart\./);
    const bad = await api.call("POST", "/auth/otp/send", { headers: RU, body: { destination: "not-an-email@", channel: "email" } });
    assert.equal(bad.status, 400);
    assert.equal(bad.data.message, "Введите корректный адрес электронной почты.");
  });

  it("localizes framework errors and rate limits", async () => {
    const missing = await api.call("GET", "/no-such-route", { headers: RU });
    assert.equal(missing.status, 404);
    assert.equal(missing.data.message, "Такой страницы или ресурса не существует.");

    const destination = "+15555550777";
    const first = await api.call("POST", "/auth/otp/send", { headers: RU, body: { destination, channel: "sms" } });
    assert.equal(first.status, 200);
    const again = await api.call("POST", "/auth/otp/send", { headers: RU, body: { destination, channel: "sms" } });
    assert.equal(again.status, 429);
    assert.match(again.data.message, /^Подождите \d+ секунд/);
  });
});

describe("parent language", () => {
  const destination = "+15555550888";

  it("texts the one-time code in the requested language and remembers it at verify", async () => {
    const sent = await api.call("POST", "/auth/otp/send", { headers: RU, body: { destination, channel: "sms" } });
    assert.equal(sent.status, 200);
    const log = api.repo.messages.filter((m) => m.to === destination && m.template === "otp").at(-1);
    assert.equal(log.body, "Ваш код Snapbell: ••••••.");

    const verified = await api.call("POST", "/auth/otp/verify", {
      headers: RU,
      body: { destination, code: sent.data.devCode, consent: { smsUpdates: true, marketing: false } },
    });
    assert.equal(verified.status, 200);
    assert.equal(verified.data.parent.locale, "ru");

    // A request without a language preference doesn't reset it…
    const account = await api.call("GET", "/account", { token: verified.data.token });
    assert.equal(account.data.parent.locale, "ru");
    // …a request in another supported language updates it…
    const uz = await api.call("GET", "/account", { token: verified.data.token, headers: UZ });
    assert.equal(uz.data.parent.locale, "uz");
    // …and the account page can set it explicitly.
    const patched = await api.call("PATCH", "/account", { token: verified.data.token, body: { locale: "ru" } });
    assert.equal(patched.data.locale, "ru");
  });

  it("sends the order receipt in the parent's language", async () => {
    const album = await api.call("GET", "/albums/SAMPLE", { token: parent, headers: RU });
    const shop = await api.call("GET", "/albums/SAMPLE/shop", { token: parent, headers: RU });
    const pkg = shop.data.packages[0];
    const cart = await api.call("POST", "/carts", { token: parent, headers: RU, body: { albumCode: "SAMPLE" } });
    await api.call("PATCH", `/carts/${cart.data.id}`, {
      token: parent,
      headers: RU,
      body: {
        items: [{ id: "ru-1", kind: "package", refId: pkg.id, quantity: 1, albumCode: "SAMPLE", subjectId: null, photoIds: [album.data.photos[0].id], customization: null }],
        deliveryMethod: "school_pickup",
      },
    });
    // Checkout from a client that sends no language: the receipt still follows the parent's saved choice.
    const result = await api.call("POST", "/checkout", {
      token: parent,
      body: {
        cartId: cart.data.id,
        contact: { name: "Elena Martinez", email: "parent@example.com", phone: null },
        delivery: { method: "school_pickup", address: null },
        payment: { method: "card", paymentMethodId: null },
      },
    });
    assert.equal(result.status, 200, JSON.stringify(result.data));
    const receipt = api.repo.messages.filter((m) => m.orderId === result.data.orderId && m.template === "order_confirmation").at(-1);
    assert.match(receipt.body, /^Спасибо, Elena! Студия «Brightside Photo Co\.» получила заказ SB-\d+/);
  });
});
