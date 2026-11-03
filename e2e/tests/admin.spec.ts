import { ApiError } from "@snapbell/sdk";
import { BASE_URL, DEMO_CREDENTIALS, adminLogin, expect, parentSession, setLanguage, studioLogin, test, unique } from "./fixtures";
import { createOwnOrder, setupToken, submitRequest } from "./helpers/admin";

/**
 * Snapbell admin (/admin): every screen and action, through the real UI.
 * Data created here is unique per run; only the `ai_retouch` flag is toggled.
 */

test.describe("admin: login", () => {
  test("wrong password shows an error and keeps you on the login page", async ({ page }) => {
    await page.goto("/admin/login");
    await page.locator("#email").fill(DEMO_CREDENTIALS.internalAdmin.email);
    await page.locator("#password").fill("not-the-password");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByRole("alert").filter({ hasText: "Wrong email or password." })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("correct login lands on Requests, log out ends the session", async ({ page }) => {
    await adminLogin(page);
    await expect(page).toHaveURL(/\/admin\/requests/);
    await expect(page.getByRole("heading", { level: 1, name: "Requests" })).toBeVisible();
    await page.getByRole("button", { name: "Log out" }).click();
    await expect(page).toHaveURL(/\/admin\/login/);
    await page.goto("/admin/requests");
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test("/admin redirects to Requests when signed in", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/requests/);
  });
});

test.describe("admin: requests", () => {
  test("new-requests badge matches the API count", async ({ page, api }) => {
    await submitRequest(api); // make sure at least one is new
    await adminLogin(page);
    const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
    const newCount = (await api(token).admin.contactRequests({ status: "new" })).length;
    await page.reload();
    const badge = page.getByRole("navigation", { name: "Admin" }).getByLabel(/\d+ new/);
    await expect(badge).toBeVisible();
    // Other test runs may add requests at the same time; the badge is never lower than what we counted.
    expect(Number(await badge.textContent())).toBeGreaterThanOrEqual(newCount);
  });

  test("seeded requests are listed (Tashkent, Samarkand, demo)", async ({ page }) => {
    await adminLogin(page);
    // Seeded in their own languages: Russian (Ташкент) and Uzbek (Samarqand).
    await page.goto(`/admin/requests?q=${encodeURIComponent("Ташкент")}`);
    await expect(page.locator("main").getByText(/Ташкент/).first()).toBeVisible();
    await page.goto("/admin/requests?q=Samarqand");
    await expect(page.locator("main").getByText(/Samarqand/).first()).toBeVisible();
    await page.goto("/admin/requests?kind=demo");
    const demoCards = page.locator("main").locator("div.rounded-card");
    expect(await demoCards.count()).toBeGreaterThan(0);
    for (const kind of await demoCards.locator("p").first().allTextContents()) expect(kind).toContain("Demo");
  });

  test("search, status and type filters", async ({ page, api }) => {
    const { stamp } = await submitRequest(api, { kind: "partner" });
    await submitRequest(api, { kind: "demo", name: `E2E Demo ${stamp}`, company: null, message: `Demo ${stamp}` });
    await adminLogin(page);

    // Search through the form.
    await page.getByRole("searchbox").or(page.getByLabel("Search")).first().fill(stamp);
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(new RegExp(`q=${stamp}`));
    await expect(page.getByText(`E2E Admin ${stamp}`)).toBeVisible();
    await expect(page.getByText(`E2E Demo ${stamp}`)).toBeVisible();

    // Type filter.
    await page.getByLabel("Type").selectOption("demo");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByText(`E2E Demo ${stamp}`)).toBeVisible();
    await expect(page.getByText(`E2E Admin ${stamp}`)).toHaveCount(0);

    // Status filter: both are new; "contacted" shows neither.
    await page.getByLabel("Type").selectOption("");
    await page.getByLabel("Status").selectOption("contacted");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page.getByText("No requests match.")).toBeVisible();
  });

  test("mark contacted, internal note persists, archive and reopen", async ({ page, api }) => {
    const { stamp } = await submitRequest(api);
    await adminLogin(page);
    await page.goto(`/admin/requests?q=${stamp}`);
    const card = page.locator("main").locator("div.rounded-card", { hasText: `E2E Admin ${stamp}` }).first();
    await expect(card.getByText("New", { exact: true })).toBeVisible();

    await card.getByRole("button", { name: "Mark contacted" }).click();
    await expect(page.getByText("Marked as contacted")).toBeVisible();
    await expect(card.getByText("Contacted", { exact: true })).toBeVisible();

    const note = `Called ${stamp}, wants a demo`;
    await card.getByLabel("Internal note").fill(note);
    await card.getByRole("button", { name: "Save note" }).click();
    await expect(page.getByText("Note saved")).toBeVisible();
    await page.reload();
    await expect(page.locator("main").getByLabel("Internal note").first()).toHaveValue(note);

    const card2 = page.locator("main").locator("div.rounded-card", { hasText: `E2E Admin ${stamp}` }).first();
    await card2.getByRole("button", { name: "Archive" }).click();
    await expect(card2.getByText("Archived", { exact: true })).toBeVisible();
    await card2.getByRole("button", { name: "Reopen" }).click();
    await expect(card2.getByText("New", { exact: true })).toBeVisible();
  });

  test("create studio from a request: prefilled form, setup link, converted", async ({ page, context, api }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    const { stamp, input } = await submitRequest(api, { phone: "90 444 55 66" });
    await adminLogin(page);
    await page.goto(`/admin/requests?q=${stamp}`);
    const card = page.locator("main").locator("div.rounded-card", { hasText: `E2E Admin ${stamp}` }).first();
    await card.getByRole("button", { name: "Create studio" }).click();

    const dialog = page.getByRole("dialog", { name: "Create a studio" });
    await expect(dialog.getByLabel("Studio name")).toHaveValue(input.company!);
    await expect(dialog.getByLabel("Owner's name")).toHaveValue(input.name);
    await expect(dialog.getByLabel("Owner's email")).toHaveValue(input.email!);
    await expect(dialog.getByLabel(/Owner's phone/)).toHaveValue("90 444 55 66");
    await dialog.getByLabel("Schools").click();
    await dialog.getByRole("button", { name: "Create studio" }).click();

    // BUG (app): the setup link must be shown right after creating the studio from a request.
    // Today the request turns "converted", its Create button unmounts and takes the link dialog with it.
    const linkDialog = page.getByRole("dialog", { name: `${input.company} is ready` });
    const linkInput = linkDialog.getByLabel("Setup link");
    await expect.soft(linkInput, "setup link dialog after creating a studio from a request").toHaveValue(/\/studio\/setup\?token=/, { timeout: 8_000 });
    if (await linkInput.isVisible()) {
      // The dialog sometimes flashes and vanishes (same bug): copying must still be possible.
      const url = await linkInput.inputValue({ timeout: 3_000 }).catch(() => "");
      const copied = await linkDialog
        .getByRole("button", { name: "Copy" })
        .click({ timeout: 3_000 })
        .then(() => true)
        .catch(() => false);
      expect.soft(copied, "setup link dialog stays open long enough to copy the link").toBe(true);
      if (copied) {
        expect(setupToken(url)).toBeTruthy();
        await expect(linkDialog.getByRole("button", { name: "Copied" })).toBeVisible();
        expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(url);
        await linkDialog.getByRole("button", { name: "Done" }).click();
      }
    }

    const after = page.locator("main").locator("div.rounded-card", { hasText: `E2E Admin ${stamp}` }).first();
    await expect(after.getByText("Converted", { exact: true }).first()).toBeVisible();
    const open = after.getByRole("link", { name: `Open ${input.company}` });
    await expect(open).toBeVisible();
    await open.click();
    await expect(page).toHaveURL(/\/admin\/studios/);
    const row = page.locator("tr", { hasText: input.company! });
    await expect(row).toBeVisible();
    await expect(row.getByText("Invited", { exact: true })).toBeVisible();
  });
});

test.describe("admin: studios", () => {
  test("list shows owners with status and setup badges", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/studios");
    const brightside = page.locator("tr", { hasText: "Brightside Photo Co." });
    await expect(brightside).toContainText("Jordan Ellis");
    await expect(brightside).toContainText(DEMO_CREDENTIALS.owner.email);
    await expect(brightside.getByText("Active", { exact: true }).first()).toBeVisible();
    await expect(brightside.getByText("Done", { exact: true })).toBeVisible();
    const sprouts = page.locator("tr", { hasText: "Little Sprouts Portraits" });
    await expect(sprouts.getByText("Not finished", { exact: true })).toBeVisible();
  });

  test("create a studio, new setup link replaces the old one, owner becomes active", async ({ page, context, browser, api }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE_URL });
    const stamp = unique();
    const studioName = `E2E Created ${stamp}`;
    const ownerEmail = `e2e-owner-${stamp}@example.com`;
    await adminLogin(page);
    await page.goto("/admin/studios");
    await page.getByRole("button", { name: "Create studio" }).click();
    const dialog = page.getByRole("dialog", { name: "Create a studio" });
    await dialog.getByLabel("Studio name").fill(studioName);
    await dialog.getByLabel("Owner's name").fill(`Owner ${stamp}`);
    await dialog.getByLabel("Owner's email").fill(ownerEmail);
    await dialog.getByLabel(/Owner's phone/).fill("90 777 12 34");
    await expect(dialog.getByLabel(/Owner's phone/)).toHaveValue("90 777 12 34");
    await dialog.getByLabel("Sports").click();
    await dialog.getByLabel("Events").click();
    await dialog.getByRole("button", { name: "Create studio" }).click();
    const created = page.getByRole("dialog", { name: `${studioName} is ready` });
    const firstLink = await created.getByLabel("Setup link").inputValue();
    expect(firstLink).toContain("/studio/setup?token=");
    await created.getByRole("button", { name: "Copy" }).click();
    await expect(created.getByRole("button", { name: "Copied" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(firstLink);
    await page.getByRole("button", { name: "Done" }).click();

    const row = page.locator("tr", { hasText: studioName });
    await expect(row.getByText("Invited", { exact: true })).toBeVisible();
    await expect(row.getByText("Not finished", { exact: true })).toBeVisible();

    const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
    const listed = (await api(token).admin.studios({ q: studioName }))[0];
    expect(listed?.studio.markets.sort()).toEqual(["events", "sports"]);

    // New link: the old one stops working.
    await row.getByRole("button", { name: "New setup link" }).click();
    await expect(page.getByText("New setup link created. The previous one no longer works.")).toBeVisible();
    const secondLink = await page.getByRole("dialog").getByLabel("Setup link").inputValue();
    expect(secondLink).not.toBe(firstLink);
    await page.getByRole("button", { name: "Done" }).click();
    const old = await api().auth.setupInfo(setupToken(firstLink)).catch((e: unknown) => e);
    expect(old).toBeInstanceOf(ApiError);
    expect((old as ApiError).status).toBe(404);
    await expect(api().auth.setupInfo(setupToken(secondLink))).resolves.toMatchObject({ email: ownerEmail, studioName });

    // The owner opens the link in their own browser and sets a password.
    const owner = await browser.newContext({ extraHTTPHeaders: { "X-Forwarded-For": `10.200.${Math.floor(Math.random() * 250)}.7` } });
    const ownerPage = await owner.newPage();
    await ownerPage.goto(secondLink.replace(/^https?:\/\/[^/]+/, BASE_URL));
    await expect(ownerPage.getByText(studioName).first()).toBeVisible();
    await ownerPage.locator("#setup-password").fill(`pw-${stamp}-secret`);
    await ownerPage.locator("#setup-confirm").fill(`pw-${stamp}-secret`);
    await ownerPage.getByRole("button", { name: "Set password and continue" }).click();
    await ownerPage.waitForURL(/\/studio\/onboarding/);
    await owner.close();

    await page.reload();
    await expect(page.locator("tr", { hasText: studioName }).getByText("Active", { exact: true }).first()).toBeVisible();
    await expect(page.locator("tr", { hasText: studioName }).getByRole("button", { name: "New setup link" })).toHaveCount(0);
  });
});

test.describe("admin: clients", () => {
  test("stat cards, a new parent appears, search finds them", async ({ page, context, api }) => {
    const name = `E2E Client ${unique()}`;
    await parentSession(context, api, { name });
    await adminLogin(page);
    await page.goto("/admin/clients");
    for (const label of ["Clients", "Have ordered", "New in the last 7 days"]) {
      await expect(page.locator("main").getByText(label, { exact: true }).first()).toBeVisible();
    }
    await page.getByLabel("Search").fill(name);
    await page.getByRole("button", { name: "Filter" }).click();
    const row = page.locator("tr", { hasText: name });
    await expect(row).toBeVisible();
    await expect(page.locator("tbody tr")).toHaveCount(1);
  });
});

test.describe("admin: jobs", () => {
  test("cross-studio list and status filter", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/jobs");
    // Other tests create jobs with the default name too, so match the seeded Brightside job specifically.
    await expect(page.locator("tr", { hasText: "Brightside Photo Co." }).filter({ hasText: "Fall Picture Day" }).first()).toBeVisible();
    await expect(page.locator("tr", { hasText: "Spring League Photos" })).toContainText("Golden Hour Sports Photo");
    await page.getByLabel("Status").selectOption("draft");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/status=draft/);
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const status of await rows.locator("td:nth-child(4)").allTextContents()) expect(status.trim()).toBe("Draft");
  });
});

test.describe("admin: orders and refunds", () => {
  test("find our own order, open it, partial then full refund", async ({ page, api }) => {
    const { order } = await createOwnOrder(api);
    await adminLogin(page);
    await page.goto("/admin/orders");
    await page.getByLabel("Search").fill(order.number);
    await page.getByRole("button", { name: "Filter" }).click();
    await page.getByRole("link", { name: order.number }).click();
    await expect(page.getByRole("heading", { level: 1, name: `Order ${order.number}` })).toBeVisible();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

    // Partial refund of $1.00.
    await page.getByRole("button", { name: "Refund" }).click();
    let dialog = page.getByRole("dialog");
    await dialog.getByLabel("Amount ($)").fill("1.00");
    await dialog.getByLabel(/Reason/).fill("E2E partial refund");
    await dialog.getByRole("button", { name: /^Refund \$1\.00$/ }).click();
    await expect(page.getByText("Refunded $1.00")).toBeVisible();
    await expect(page.getByText("Partly refunded").first()).toBeVisible();
    await expect(page.getByText("−$1.00")).toBeVisible();

    // Refund the rest.
    const rest = ((order.split.chargedCents - 100) / 100).toFixed(2);
    await page.getByRole("button", { name: "Refund" }).click();
    dialog = page.getByRole("dialog");
    // BUG (app): reopening the dialog must offer the remaining refundable amount, not the last typed one.
    await expect.soft(dialog.getByLabel("Amount ($)"), "refund amount defaults to what is still refundable").toHaveValue(rest);
    await dialog.getByLabel("Amount ($)").fill(rest);
    await dialog.getByLabel(/Reason/).fill("E2E rest of the refund");
    await dialog.getByRole("button", { name: `Refund $${rest}` }).click();
    await expect(page.getByText(`Refunded $${rest}`)).toBeVisible();
    await expect(page.getByRole("heading", { name: /Status\s*Refunded/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Refund" })).toBeDisabled();
  });
});

test.describe("admin: lab queue", () => {
  test("the failed submission can be retried", async ({ page, api }) => {
    const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
    const failed = await api(token).admin.labQueue({ status: "failed" });
    test.skip(failed.length === 0, "No failed submission left: it was retried earlier in this API run (resets on restart).");
    const target = failed[0]!;

    await adminLogin(page);
    await page.goto("/admin/lab-queue");
    await expect(page.locator("main").getByText("Lab submission queue")).toBeVisible();
    await page.getByRole("link", { name: "Failed", exact: true }).click();
    await expect(page).toHaveURL(/status=failed/);
    const row = page.locator("tr", { hasText: target.orderNumber });
    await expect(row).toContainText(target.lastError ?? "");
    await row.getByRole("button", { name: "Retry" }).click();
    await expect(page.getByText("Resubmitted to the lab")).toBeVisible();
    await expect(page.locator("tr", { hasText: target.orderNumber })).toHaveCount(0);
    const after = (await api(token).admin.labQueue()).find((l) => l.id === target.id);
    expect(after?.status).not.toBe("failed");
  });
});

test.describe("admin: message log", () => {
  test("channel and status filters, search, order links", async ({ page }) => {
    await adminLogin(page);
    await page.goto("/admin/messages");
    await page.getByLabel("Channel").selectOption("sms");
    await page.getByLabel("Status").selectOption("delivered");
    await page.getByRole("button", { name: "Filter" }).click();
    await expect(page).toHaveURL(/channel=sms/);
    const rows = page.locator("tbody tr");
    expect(await rows.count()).toBeGreaterThan(0);
    for (const c of await rows.locator("td:nth-child(2)").allTextContents()) expect(c.trim()).toBe("SMS");
    for (const s of await rows.locator("td:nth-child(6)").allTextContents()) expect(s.trim()).toBe("Delivered");

    await page.getByLabel("Channel").selectOption("");
    await page.getByLabel("Status").selectOption("");
    await page.getByLabel("Search").fill("shipped");
    await page.getByRole("button", { name: "Filter" }).click();
    expect(await page.locator("tbody tr").count()).toBeGreaterThan(0);

    // Message rows that belong to an order link to that order in the admin.
    const orderLink = page.locator("tbody").getByRole("link", { name: "order" }).first();
    await expect(orderLink).toHaveAttribute("href", /^\/admin\/orders\//);
    await orderLink.click();
    await expect(page.getByRole("heading", { level: 1, name: /^Order SB-/ })).toBeVisible();
  });
});

test.describe("admin: feature flags", () => {
  test("toggle ai_retouch on, persisted, then off again", async ({ page, api }) => {
    const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
    const original = (await api(token).admin.flags()).find((f) => f.key === "ai_retouch")!.enabled;
    try {
      await adminLogin(page);
      await page.goto("/admin/flags");
      const toggle = page.locator("#flag-ai_retouch");
      await expect(toggle).toHaveAttribute("aria-checked", String(original));
      await toggle.click();
      await expect(page.getByText(`ai_retouch ${original ? "off" : "on"}`)).toBeVisible();
      await page.reload();
      await expect(page.locator("#flag-ai_retouch")).toHaveAttribute("aria-checked", String(!original));
      await page.locator("#flag-ai_retouch").click();
      await expect(page.getByText(`ai_retouch ${original ? "on" : "off"}`)).toBeVisible();
      await page.reload();
      await expect(page.locator("#flag-ai_retouch")).toHaveAttribute("aria-checked", String(original));
    } finally {
      await api(token).admin.updateFlag("ai_retouch", { enabled: original });
    }
  });
});

test.describe("admin: languages and access", () => {
  for (const [locale, lang, requests, studios] of [
    ["ru", "ru-RU", "Заявки", "Студии"],
    ["uz", "uz-Latn-UZ", "Soʻrovlar", "Studiyalar"],
  ] as const) {
    test(`Requests and Studios in ${locale}`, async ({ page, context }) => {
      await adminLogin(page);
      await setLanguage(context, locale);
      await page.goto("/admin/requests");
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      const nav = page.getByRole("navigation").first();
      await expect(nav.getByRole("link", { name: new RegExp(requests) })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1, name: requests })).toBeVisible();
      await nav.getByRole("link", { name: studios }).click();
      await expect(page.getByRole("heading", { level: 1, name: studios })).toBeVisible();
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    });
  }

  test("a studio staff session cannot open admin pages", async ({ page, context, api }) => {
    await studioLogin(page, "owner");
    await page.goto("/admin/requests");
    await expect(page).toHaveURL(/\/admin\/login/);

    // Even a staff token placed in the admin cookie is refused.
    const staff = await api().auth.login(DEMO_CREDENTIALS.owner);
    await context.addCookies([{ name: "sb_admin", value: staff.token, url: BASE_URL }]);
    await page.goto("/admin/studios");
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
