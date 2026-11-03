import { defineConfig, devices } from "@playwright/test";

/**
 * Browser end-to-end tests. Start the site first (`pnpm build && pnpm start:all`),
 * then `pnpm e2e`. BASE_URL points elsewhere, e.g. the live demo.
 *
 * Every area runs on desktop Chrome. The shop (parents' flow) also runs on an
 * Android phone (Pixel 7, Chromium) and an iPhone (WebKit, Safari's engine), as
 * the launch checklist requires.
 */
export default defineConfig({
  testDir: "tests",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: process.env.CI ? 2 : 3,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    locale: "en-US",
    timezoneId: "Asia/Tashkent",
    actionTimeout: 15_000,
    navigationTimeout: 60_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
    { name: "android-chrome", use: { ...devices["Pixel 7"] }, testMatch: /shop.*\.spec\.ts/ },
    { name: "iphone-safari", use: { ...devices["iPhone 14"] }, testMatch: /shop.*\.spec\.ts/ },
  ],
});
