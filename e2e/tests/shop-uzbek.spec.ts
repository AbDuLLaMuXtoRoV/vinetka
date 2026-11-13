import { DEMO_CODES, DEMO_IDS, expect, parentSession, setLanguage, test } from "./fixtures";

// Chromium has no Uzbek locale data: dates and prices must not fall back to
// "2026 M11 24", English weekdays or "$ 19.99". Runs on every device project.
const BROKEN = /\bM(1[0-2]|[1-9])\b|\b(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\b|(?<!US)\$ ?\d/;

test.describe("Uzbek dates and prices", () => {
  test("Picture Day Pass, album and shop show Uzbek dates and prices", async ({ page, context, api }) => {
    await setLanguage(context, "uz");
    await parentSession(context, api, { name: "Dilnoza Karimova" });

    for (const path of [`/shop/pass/${DEMO_IDS.lumen}`, `/shop/a/${DEMO_CODES.personal}`, `/shop/a/${DEMO_CODES.personal}/shop`]) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const text = await page.locator("main").innerText();
      expect(text, `${path} has a fallback date or price`).not.toMatch(BROKEN);
    }
    // Uzbek month names and US$ suffix are actually used.
    await page.goto(`/shop/pass/${DEMO_IDS.lumen}`);
    await expect(page.locator("main")).toContainText(/\d+-(yan|fev|mar|apr|may|iyn|iyl|avg|sen|okt|noy|dek)/);
    await expect(page.locator("main")).toContainText(/US\$/);
  });
});
