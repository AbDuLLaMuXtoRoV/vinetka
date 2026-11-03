import { adminLogin, expect, parentSession, studioLogin, test } from "./fixtures";

// Checks the shared helpers themselves, so area tests can rely on them.
test.describe("test harness", () => {
  test("studio owner can log in", async ({ page }) => {
    await studioLogin(page, "owner");
    await expect(page).toHaveURL(/\/studio\/home/);
  });

  test("admin can log in", async ({ page }) => {
    await adminLogin(page);
    await expect(page).toHaveURL(/\/admin\//);
  });

  test("parent session cookie works in the shop", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Harness Parent" });
    await page.goto("/shop/account");
    await expect(page).toHaveURL(/\/shop\/account/);
    // The account page greets parents by first name.
    await expect(page.getByRole("heading", { level: 1, name: /Harness/ })).toBeVisible();
  });

  test("each test is its own visitor", async ({ visitor }) => {
    expect(visitor).toMatch(/^10\.\d+\.\d+\.\d+$/);
  });
});
