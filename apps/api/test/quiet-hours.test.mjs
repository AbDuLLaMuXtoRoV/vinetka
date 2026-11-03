import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";

const require = createRequire(import.meta.url);
require("reflect-metadata");
const { inQuietHours } = require("../dist/services/messaging.service.js");

test("quiet hours are 21:00–08:00 in Tashkent by default", () => {
  // Tashkent is UTC+5 all year.
  assert.equal(inQuietHours(new Date("2026-11-03T17:00:00Z")), true, "22:00 in Tashkent");
  assert.equal(inQuietHours(new Date("2026-11-03T02:30:00Z")), true, "07:30 in Tashkent");
  assert.equal(inQuietHours(new Date("2026-11-03T03:00:00Z")), false, "08:00 in Tashkent");
  assert.equal(inQuietHours(new Date("2026-11-03T15:59:00Z")), false, "20:59 in Tashkent");
});

test("the time zone can be changed (QUIET_HOURS_TZ)", () => {
  // 2026-11-03 05:00 UTC is 21:00 the day before in Los Angeles (PST), but 10:00 in Tashkent.
  const at = new Date("2026-11-03T05:00:00Z");
  assert.equal(inQuietHours(at), false);
  assert.equal(inQuietHours(at, "America/Los_Angeles"), true);
});
