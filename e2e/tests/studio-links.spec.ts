import { DEMO_CREDENTIALS, DEMO_IDS, expect, studioLogin, test, unique } from "./fixtures";

// Links the API sends (publish checklist, home to-dos) must open Studio pages, not the main site's 404.
test.describe("studio links that come from the API", () => {
  test("every publish-checklist item opens a studio page", async ({ page }) => {
    await studioLogin(page, "owner");
    // A draft job with no roster or photos, so the checklist has open items.
    await page.goto(`/studio/jobs/${DEMO_IDS.mapleSpring}`);
    // The job page streams in after a loading skeleton: wait for the checklist itself.
    await expect(page.getByRole("link", { name: /Roster imported/ })).toBeVisible();
    const items = page.locator("main ul li a").filter({ has: page.locator("svg") });
    const hrefs = await items.evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.length).toBeGreaterThanOrEqual(6);

    for (const href of hrefs) {
      expect(href, `checklist link ${href}`).toMatch(/^\/studio\//);
      const res = await page.goto(href);
      expect(res?.status(), `${href} status`).toBe(200);
      await expect(page).toHaveURL(new RegExp(`${href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      await expect(page.getByText("We couldn't find that page")).toHaveCount(0);
    }
  });

  test("the roster and photos checklist items open those tabs", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${DEMO_IDS.mapleSpring}`);
    await page.getByRole("link", { name: /Roster/ }).first().click();
    await expect(page).toHaveURL(new RegExp(`/studio/jobs/${DEMO_IDS.mapleSpring}/roster$`));
    await page.goto(`/studio/jobs/${DEMO_IDS.mapleSpring}`);
    await page.getByRole("link", { name: /Photos uploaded/ }).click();
    await expect(page).toHaveURL(new RegExp(`/studio/jobs/${DEMO_IDS.mapleSpring}/photos$`));
  });

  test("home to-do links open studio pages", async ({ page, api }) => {
    // Our own draft job dated soon guarantees an "unpublished" to-do, whatever other tests did.
    const owner = api((await api().auth.login(DEMO_CREDENTIALS.owner)).token);
    const [org] = await owner.organizations.list();
    const job = await owner.jobs.create({
      name: `Links test ${unique()}`,
      organizationId: org!.id,
      market: "schools",
      date: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      albumType: "personal",
      priceSheetId: "ps_fall_schools",
      shipping: { home: true, schoolPickup: false },
    });

    await studioLogin(page, "owner");
    await page.goto("/studio/home");
    const todo = page.locator(`main a[href$="/jobs/${job.id}"]`).first();
    await expect(todo).toHaveAttribute("href", `/studio/jobs/${job.id}`);
    await todo.click();
    await expect(page).toHaveURL(new RegExp(`/studio/jobs/${job.id}$`));
    await expect(page.getByText("We couldn't find that page")).toHaveCount(0);

    // Every other to-do link on Home is a studio page too.
    const hrefs = await page.goto("/studio/home").then(() =>
      page.locator('main a[href*="/jobs/"], main a[href*="/settings/"]').evaluateAll((links) => links.map((a) => a.getAttribute("href") ?? "")),
    );
    for (const href of hrefs) expect(href, `home link ${href}`).toMatch(/^\/studio\//);
  });
});
