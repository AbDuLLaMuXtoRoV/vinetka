import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MockLab } from "./labs/adapter.js";
import { MockMatcher, classify } from "./matching/matcher.js";
import { expiredJobs, purgeFaceData } from "./retention/retention.js";

describe("matching", () => {
  it("sends anything below the job threshold to review", () => {
    assert.equal(classify(0.95, 0.9), "auto");
    assert.equal(classify(0.9, 0.9), "auto");
    assert.equal(classify(0.74, 0.9), "review");
  });

  it("mock matcher is deterministic and only returns indexed subjects", async () => {
    const m = new MockMatcher();
    await m.indexReference({ collectionId: "job_1", subjectId: "sub_a" });
    await m.indexReference({ collectionId: "job_1", subjectId: "sub_b" });
    const image = Buffer.from("same bytes every time");
    const a = await m.match({ collectionId: "job_1", image });
    assert.deepEqual(await m.match({ collectionId: "job_1", image }), a);
    for (const hit of a) assert.ok(["sub_a", "sub_b"].includes(hit.subjectId));
    await m.deleteCollection("job_1");
    assert.deepEqual(await m.match({ collectionId: "job_1", image }), []);
  });
});

describe("retention", () => {
  it("deletes face data only after the season plus the retention window", async () => {
    const now = new Date("2026-10-30T00:00:00Z");
    const jobs = [
      { jobId: "old", date: "2025-09-01T00:00:00Z", deadline: "2025-10-01T00:00:00Z" },
      { jobId: "recent", date: "2026-09-01T00:00:00Z", deadline: "2026-10-15T00:00:00Z" },
    ];
    assert.deepEqual(expiredJobs(jobs, now, 180).map((j) => j.jobId), ["old"]);
    const m = new MockMatcher();
    await m.indexReference({ collectionId: "old", subjectId: "s" });
    assert.deepEqual(await purgeFaceData(m, jobs, now), ["old"]);
    assert.deepEqual(await m.match({ collectionId: "old", image: Buffer.from("x") }), []);
  });
});

describe("labs", () => {
  it("mock lab accepts and can cancel", async () => {
    const lab = new MockLab("lab_cascade");
    const res = await lab.submit({ submissionId: "lab_1", orderId: "ord_1", orderNumber: "SB-1", lines: [], shipTo: null });
    assert.equal(res.status, "accepted");
    assert.match(res.externalRef, /^MOCK-/);
    await lab.cancel(res.externalRef);
    assert.equal(lab.submitted.size, 0);
  });
});
