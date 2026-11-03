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

describe("album access", () => {
  it("404s an unknown code with the AlbumAccessError shape", async () => {
    const res = await api.call("GET", "/albums/ZZZZZZ", { token: parent });
    assert.equal(res.status, 404);
    assert.equal(res.data.error, "invalid_code");
    assert.equal(res.data.studio, null);
    assert.equal(res.data.publishAt, null);
  });

  it("409s an album that isn't published yet, with the date and studio", async () => {
    const res = await api.call("GET", "/albums/DANCE7", { token: parent });
    assert.equal(res.status, 409);
    assert.equal(res.data.error, "not_published");
    assert.ok(Date.parse(res.data.publishAt) > Date.now());
    assert.equal(res.data.studio.name, "Brightside Photo Co.");
  });

  it("410s an expired album", async () => {
    const res = await api.call("GET", "/albums/SENR25", { token: parent });
    assert.equal(res.status, 410);
    assert.equal(res.data.error, "expired");
  });

  it("serves branding publicly for the code-entry screen", async () => {
    const res = await api.call("GET", "/albums/sample/branding");
    assert.equal(res.status, 200);
    assert.equal(res.data.name, "Brightside Photo Co.");
  });

  it("branding shows the album state before any sign-in (409 not yet published, 410 closed)", async () => {
    const notYet = await api.call("GET", "/albums/DANCE7/branding");
    assert.equal(notYet.status, 409);
    assert.equal(notYet.data.error, "not_published");
    assert.ok(notYet.data.publishAt);
    assert.equal(notYet.data.studio.name, "Brightside Photo Co.");

    const closed = await api.call("GET", "/albums/SENR25/branding");
    assert.equal(closed.status, 410);
    assert.equal(closed.data.error, "expired");
    assert.equal(closed.data.studio.name, "Brightside Photo Co.");
  });
});

describe("personal album (SAMPLE)", () => {
  it("shows only the child's confident matches and group photo; review-only matches stay hidden", async () => {
    const first = await api.call("GET", "/albums/SAMPLE", { token: parent });
    assert.equal(first.status, 200);
    assert.equal(first.data.subject.firstName, "Ava");
    assert.equal(first.data.job.albumType, "personal");
    const ids = new Set(first.data.photos.map((p) => p.id));
    assert.ok(first.data.photos.length >= 6);

    // A low-confidence match of someone else's photo to Ava must not appear.
    const ava = api.repo.subjects.find((s) => s.accessCode === "SAMPLE");
    const stranger = api.repo.photos.find((p) => p.jobId === "job_maple_fall" && !p.group && !p.subjectIds.includes(ava.id));
    api.repo.matches.insert({ id: "m_test_review", jobId: "job_maple_fall", photoId: stranger.id, subjectId: ava.id, confidence: 0.61, status: "review" });
    const second = await api.call("GET", "/albums/SAMPLE", { token: parent });
    assert.ok(!second.data.photos.some((p) => p.id === stranger.id), "review match leaked into the album");
    assert.equal(second.data.photos.length, ids.size);

    // Once the studio accepts it, it goes live.
    const staff = await staffToken(api.call);
    const accepted = await api.call("POST", "/matches/m_test_review/accept", { token: staff });
    assert.equal(accepted.data.status, "accepted");
    const third = await api.call("GET", "/albums/SAMPLE", { token: parent });
    assert.ok(third.data.photos.some((p) => p.id === stranger.id));
  });

  it("serves watermarked previews only through signed URLs", async () => {
    const album = await api.call("GET", "/albums/SAMPLE", { token: parent });
    const url = new URL(album.data.photos[0].previewUrl);
    assert.equal(url.searchParams.get("w"), "1");
    assert.match(url.searchParams.get("o"), /^Viewed by/);

    const ok = await api.call("GET", url.toString());
    assert.equal(ok.status, 200);
    assert.match(ok.headers.get("content-type"), /image\/svg\+xml/);
    assert.match(ok.text, /PROOF · Brightside Photo Co\./);

    const tamperedSig = new URL(url);
    tamperedSig.searchParams.set("sig", `${url.searchParams.get("sig").slice(0, -2)}xx`);
    const bad = await api.call("GET", tamperedSig.toString());
    assert.equal(bad.status, 403);
    assert.equal(bad.data.error, "invalid_signature");

    const noWatermark = new URL(url);
    noWatermark.searchParams.set("w", "0");
    assert.equal((await api.call("GET", noWatermark.toString())).status, 403);

    const otherId = album.data.photos[0].id === "ph_0002" ? "ph_0003" : "ph_0002";
    const otherPhoto = url.toString().replace(/\/media\/[^/]+\//, `/media/${otherId}/`);
    assert.equal((await api.call("GET", otherPhoto)).status, 403);
  });

  it("saves favorites and suggests a bundle", async () => {
    const album = await api.call("GET", "/albums/SAMPLE", { token: parent });
    const favs = album.data.photos.slice(0, 2).map((p) => p.id);
    const saved = await api.call("PUT", "/albums/SAMPLE/favorites", { token: parent, body: { photoIds: favs } });
    assert.deepEqual(saved.data.favorites, favs);
    const shop = await api.call("GET", "/albums/SAMPLE/shop", { token: parent });
    assert.equal(shop.status, 200);
    assert.deepEqual(shop.data.suggestedBundle.photoIds, favs);
    assert.ok(shop.data.packages[0].featured);
    assert.ok(shop.data.shippingOptions.some((o) => o.method === "school_pickup"));
  });
});

describe("team album (EAGLES)", () => {
  it("offers Find Me with consent and never without", async () => {
    const album = await api.call("GET", "/albums/EAGLES", { token: parent });
    assert.equal(album.status, 200);
    assert.equal(album.data.findMeAvailable, true);
    const image = Buffer.alloc(600, 7).toString("base64");
    const noConsent = await api.call("POST", "/albums/EAGLES/find-me", { token: parent, body: { imageBase64: image, consent: false } });
    assert.equal(noConsent.status, 400);
    const found = await api.call("POST", "/albums/EAGLES/find-me", { token: parent, body: { imageBase64: image, consent: true } });
    assert.equal(found.status, 200);
    assert.ok(found.data.photos.length > 0);
    const added = await api.call("POST", "/albums/EAGLES/photos", { token: parent, body: { photoIds: [found.data.photos[0].id] } });
    assert.equal(added.data.photos[0].id, found.data.photos[0].id);
  });
});
