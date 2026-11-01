import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { startApi, staffToken } from "./helpers.mjs";

let api;
before(async () => {
  api = await startApi();
});
after(async () => {
  await api.close();
});

describe("studio staff", () => {
  it("logs in and lists only its own studio's jobs", async () => {
    const token = await staffToken(api.call);
    const jobs = await api.call("GET", "/jobs", { token });
    assert.equal(jobs.status, 200);
    assert.ok(jobs.data.length >= 4);
    assert.ok(jobs.data.every((j) => j.studioId === "stu_brightside"));
    const maple = jobs.data.find((j) => j.id === "job_maple_fall");
    assert.equal(maple.stats.subjects, 24);
    assert.ok(maple.stats.salesCents > 0);

    const detail = await api.call("GET", "/jobs/job_maple_fall", { token });
    assert.equal(detail.status, 200);
    assert.ok(Array.isArray(detail.data.checklist));

    const other = await api.call("GET", "/jobs/job_gh_spring", { token });
    assert.equal(other.status, 404, "another studio's job is invisible");
  });

  it("rejects a wrong password with a JSON error body", async () => {
    const res = await api.call("POST", "/auth/login", { body: { email: "owner@brightside.photo", password: "nope" } });
    assert.equal(res.status, 401);
    assert.deepEqual(Object.keys(res.data).sort(), ["error", "message", "statusCode"]);
    assert.equal(res.data.error, "invalid_credentials");
  });

  it("validates bodies with field details", async () => {
    const token = await staffToken(api.call);
    const res = await api.call("POST", "/jobs", { token, body: { name: "" } });
    assert.equal(res.status, 400);
    assert.equal(res.data.error, "validation_failed");
    assert.ok(Array.isArray(res.data.details));
  });

  it("keeps photographers out of reports and refunds", async () => {
    const token = await staffToken(api.call, "sam@brightside.photo");
    assert.equal((await api.call("GET", "/jobs", { token })).status, 200);
    const report = await api.call("GET", "/reports", { token });
    assert.equal(report.status, 403);
    assert.equal(report.data.error, "forbidden");
    assert.equal((await api.call("POST", "/studio/stripe/connect", { token })).status, 403);

    const owner = await staffToken(api.call);
    const ok = await api.call("GET", "/reports", { token: owner });
    assert.equal(ok.status, 200);
    assert.ok(ok.data.totals.orders > 0);
    assert.equal(ok.data.byDay.length, 30);
  });

  it("has no self-signup: studios are only created by Snapbell staff", async () => {
    const before = api.repo.studios.size;
    const signup = await api.call("POST", "/auth/signup", {
      body: { name: "Robin Vale", email: "robin@valephoto.example", password: "long-enough-pw", studioName: "Vale Photo" },
    });
    assert.equal(signup.status, 404);
    assert.equal((await api.call("POST", "/auth/handoff", { body: { code: "anything" } })).status, 404);
    assert.equal(api.repo.studios.size, before);
  });
});

describe("parents", () => {
  it("verifies by one-time code (devCode outside production)", async () => {
    const destination = "90 555 01 99";
    const sent = await api.call("POST", "/auth/otp/send", { body: { destination, channel: "sms" } });
    assert.equal(sent.status, 200);
    assert.equal(sent.data.destination, "+998905550199");
    assert.match(sent.data.devCode, /^\d{6}$/);
    assert.equal(sent.data.resendAfterSec, 30);

    const wrong = await api.call("POST", "/auth/otp/verify", {
      body: { destination, code: sent.data.devCode === "000000" ? "111111" : "000000", consent: { smsUpdates: true, marketing: false } },
    });
    assert.equal(wrong.status, 400);
    assert.equal(wrong.data.error, "wrong_code");

    const ok = await api.call("POST", "/auth/otp/verify", {
      body: { destination, code: sent.data.devCode, consent: { smsUpdates: true, marketing: false } },
    });
    assert.equal(ok.status, 200);
    assert.equal(ok.data.parent.consent.smsUpdates, true);
    assert.equal(ok.data.parent.consent.marketing, false);
    const me = await api.call("GET", "/auth/me", { token: ok.data.token });
    assert.equal(me.data.kind, "parent");

    // The code is single-use.
    const reuse = await api.call("POST", "/auth/otp/verify", { body: { destination, code: sent.data.devCode } });
    assert.equal(reuse.status, 400);
  });

  it("rate-limits resends within 30 seconds", async () => {
    const body = { destination: "parent-resend@example.com", channel: "email" };
    assert.equal((await api.call("POST", "/auth/otp/send", { body })).status, 200);
    const again = await api.call("POST", "/auth/otp/send", { body });
    assert.equal(again.status, 429);
    assert.equal(again.data.error, "rate_limited");
    assert.ok(again.data.details.retryAfterSec > 0);
  });

  it("requires a parent session for albums", async () => {
    const res = await api.call("GET", "/albums/SAMPLE");
    assert.equal(res.status, 401);
  });
});

describe("internal admin", () => {
  it("needs an admin token", async () => {
    const staff = await staffToken(api.call);
    assert.equal((await api.call("GET", "/admin/studios", { token: staff })).status, 401);
    const login = await api.call("POST", "/admin/login", { body: { email: "admin@snapbell.com", password: "admin-dev-only" } });
    assert.equal(login.status, 200);
    const studios = await api.call("GET", "/admin/studios", { token: login.data.token });
    assert.equal(studios.status, 200);
    assert.ok(studios.data.length >= 3);
    const failed = await api.call("GET", "/admin/lab-queue?status=failed", { token: login.data.token });
    assert.equal(failed.data.length, 1);
    const retried = await api.call("POST", `/admin/lab-queue/${failed.data[0].id}/retry`, { token: login.data.token });
    assert.equal(retried.data.status, "submitted");
  });
});
