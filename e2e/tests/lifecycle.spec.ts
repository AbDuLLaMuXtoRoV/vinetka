import type { Page } from "@playwright/test";
import { BASE_URL, DEMO_CREDENTIALS, adminLogin, expect, fixture, studioLogin, test, unique } from "./fixtures";

/**
 * The whole platform, start to finish, through the real UI:
 * a photographer asks to join → Snapbell admin creates the studio → the owner
 * sets a password and onboards → creates a job, roster, photos, matching,
 * publishes → a parent finds the album with the code and buys → the studio,
 * another studio and the admin each see exactly what they should.
 */
test.describe.configure({ mode: "serial" });

const ip = () => `10.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

async function newVisitor(browser: import("@playwright/test").Browser) {
  const context = await browser.newContext({ baseURL: BASE_URL, extraHTTPHeaders: { "X-Forwarded-For": ip() } });
  return { context, page: await context.newPage() };
}

/** Fills a 6-box CodeInput through its first box (paste-like). */
async function fillCode(page: Page, group: string, code: string) {
  await page.getByRole("group", { name: group }).locator("input").first().fill(code);
}

test("full lifecycle: request → studio → job → parent order → everyone sees the right data", async ({ browser, page, api }) => {
  test.setTimeout(6 * 60_000);
  const stamp = unique();
  const studioName = `Lifecycle Studio ${stamp}`;
  const ownerName = `Lifecycle Owner ${stamp}`;
  const ownerEmail = `lifecycle-${stamp}@example.com`;
  const ownerPassword = `lc-${stamp}-password`;
  const school = `School No. ${Math.floor(Math.random() * 900) + 100} ${stamp}`;
  const parentName = `Lifecycle Parent ${stamp}`;
  const parentPhone = `90 ${String(Math.floor(Math.random() * 900) + 100)} ${String(Math.floor(Math.random() * 90) + 10)} ${String(Math.floor(Math.random() * 90) + 10)}`;

  // a) A photographer sends the partner form on the main site.
  await test.step("a) photographer sends the /contact form", async () => {
    await page.goto("/contact");
    await page.locator("#f-role").selectOption("photographer");
    await page.locator("#f-name").fill(ownerName);
    await page.locator("#f-company").fill(studioName);
    await page.locator("#f-phone").fill("90 321 45 67");
    await page.locator("#f-email").fill(ownerEmail);
    await page.locator("#f-city").fill("Tashkent");
    await page.locator("label", { hasText: "Schools" }).first().click();
    await page.locator("#f-message").fill(`We shoot schools in Tashkent. ${stamp}`);
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Thanks — we've got your request")).toBeVisible();
  });

  // b) Snapbell admin creates the studio from that request.
  let setupUrl = "";
  await test.step("b) admin creates the studio from the request", async () => {
    const admin = await newVisitor(browser);
    await adminLogin(admin.page);
    await admin.page.goto(`/admin/requests?q=${stamp}`);
    const card = admin.page.locator("main").locator("div.rounded-card", { hasText: ownerName }).first();
    await expect(card).toContainText("Partner");
    await expect(card).toContainText("+998 90 321 45 67");
    await card.getByRole("button", { name: "Create studio" }).click();
    const dialog = admin.page.getByRole("dialog", { name: "Create a studio" });
    await expect(dialog.getByLabel("Studio name")).toHaveValue(studioName);
    await dialog.getByRole("button", { name: "Create studio" }).click();
    const linkInput = admin.page.getByRole("dialog", { name: `${studioName} is ready` }).getByLabel("Setup link");
    // BUG (app): the link dialog disappears when the request becomes "converted" (see admin.spec.ts).
    await expect.soft(linkInput, "setup link dialog after creating from a request").toBeVisible({ timeout: 8_000 });
    if (await linkInput.isVisible()) {
      setupUrl = await linkInput.inputValue();
    } else {
      // WORKAROUND for the bug above: get a fresh owner link from Studios → New setup link.
      await expect(admin.page.locator("main").locator("div.rounded-card", { hasText: ownerName }).first()).toContainText("Converted");
      await admin.page.goto(`/admin/studios?q=${encodeURIComponent(studioName)}`);
      await admin.page.locator("tr", { hasText: studioName }).getByRole("button", { name: "New setup link" }).click();
      setupUrl = await admin.page.getByRole("dialog").getByLabel("Setup link").inputValue();
    }
    expect(setupUrl).toContain("/studio/setup?token=");
    await admin.context.close();
  });

  // c) The owner sets a password and completes onboarding.
  const owner = await newVisitor(browser);
  let jobId = "";
  await test.step("c) owner sets a password and completes onboarding", async () => {
    const p = owner.page;
    await p.goto(setupUrl.replace(/^https?:\/\/[^/]+/, BASE_URL));
    await expect(p.getByText(studioName).first()).toBeVisible();
    await p.locator("#setup-password").fill(ownerPassword);
    await p.locator("#setup-confirm").fill(ownerPassword);
    await p.getByRole("button", { name: "Set password and continue" }).click();
    await p.waitForURL(/\/studio\/onboarding/);

    await expect(p.locator("#ob-name")).toHaveValue(studioName);
    await p.getByRole("button", { name: "Continue" }).click(); // studio
    await p.getByRole("heading", { name: "Add your brand" }).waitFor();
    await p.getByRole("button", { name: "Continue" }).click(); // brand
    await p.getByRole("heading", { name: "Which markets do you shoot?" }).waitFor();
    await p.getByRole("button", { name: "Continue" }).click(); // markets
    await p.getByRole("heading", { name: "Get paid with Stripe" }).waitFor();
    await p.getByRole("button", { name: "Connect Stripe" }).click();
    await expect(p.getByText("Stripe is connected")).toBeVisible();
    await p.getByRole("button", { name: "Continue" }).click(); // stripe
    await p.getByRole("heading", { name: "Pick your default lab" }).waitFor();
    await p.getByRole("button", { name: "Continue" }).click(); // lab
    await p.getByRole("heading", { name: "Start with a price sheet" }).waitFor();
    await p.getByRole("button", { name: "Finish setup" }).click();
    await expect(p.getByRole("heading", { name: "You're set up" })).toBeVisible();
  });

  // d) Job, roster, photos, matching, publish.
  const subjects = [
    { first: "Aziz", last: `Karimov${stamp}` },
    { first: "Madina", last: `Yusupova${stamp}` },
  ];
  await test.step("d1) owner creates a job for a new school", async () => {
    const p = owner.page;
    await p.getByRole("button", { name: "Create your first job" }).click();
    await p.waitForURL(/\/studio\/jobs\/new/);
    await p.locator("#job-org").fill(school);
    const pictureDay = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    await p.locator("#job-date").fill(pictureDay);
    await p.getByRole("button", { name: "Create job" }).click();
    await p.waitForURL(/\/studio\/jobs\/[^/]+\/roster/);
    jobId = p.url().match(/\/studio\/jobs\/([^/]+)\/roster/)![1]!;
  });

  await test.step("d2) owner adds two subjects in the roster", async () => {
    const p = owner.page;
    for (const s of subjects) {
      await p.getByRole("button", { name: "Add subject" }).first().click();
      const dialog = p.getByRole("dialog", { name: "Add subject" });
      await dialog.locator("#sub-first").fill(s.first);
      await dialog.locator("#sub-last").fill(s.last);
      await dialog.locator("#sub-group").fill("3-A");
      await dialog.getByRole("button", { name: "Save" }).click();
      await expect(p.locator("tr", { hasText: s.last })).toBeVisible();
    }
  });

  await test.step("d3) owner uploads two photos", async () => {
    const p = owner.page;
    await p.goto(`/studio/jobs/${jobId}/photos`);
    await p.locator('input[type="file"]').first().setInputFiles([fixture("photo-1.jpg"), fixture("photo-2.jpg")]);
    // Processing is simulated (~2 s per photo); wait until the API reports both ready.
    const session = await api().auth.login({ email: ownerEmail, password: ownerPassword });
    await expect
      .poll(async () => (await api(session.token).photos.list(jobId)).filter((ph) => ph.status === "ready").length, { timeout: 60_000 })
      .toBe(2);
  });

  await test.step("d4) owner reviews matching: accepts review items, assigns unmatched photos", async () => {
    const p = owner.page;
    await p.goto(`/studio/jobs/${jobId}/matching`);
    await expect(p.getByText("Nothing low-confidence goes live")).toBeVisible();

    // Accept anything waiting for review.
    await p.getByRole("tab", { name: /Needs review/ }).click();
    for (let i = 0; i < 4; i++) {
      const acceptAll = p.getByRole("button", { name: /^Accept all \d+/ }).first();
      if (!(await acceptAll.isVisible().catch(() => false))) break;
      await acceptAll.click();
      await expect(p.getByText(/^Accepted for /).first()).toBeVisible();
      await p.waitForTimeout(500);
    }

    // Assign every unmatched photo, alternating between the two subjects.
    await p.getByRole("tab", { name: /Unmatched photos/ }).click();
    for (let i = 0; i < 4; i++) {
      const select = p.getByRole("tabpanel").getByLabel("Choose subject").first();
      if (!(await select.isVisible().catch(() => false))) break;
      const options = await select.locator("option").allTextContents();
      const pick = options.find((o) => o.includes(subjects[i % 2]!.last))!;
      await select.selectOption({ label: pick });
      await p.getByRole("tabpanel").getByRole("button", { name: "Match", exact: true }).first().click();
      await expect(p.getByText("Photo matched").first()).toBeVisible();
      await p.waitForTimeout(500);
    }
    await expect(p.getByRole("tab", { name: /Unmatched photos/ })).toContainText("0");
    await expect(p.getByRole("tab", { name: /Needs review/ })).toContainText("0");
  });

  let accessCode = "";
  let pickedSubject = subjects[0]!;
  await test.step("d5) owner publishes; the roster shows codes and matched counts", async () => {
    const p = owner.page;
    await p.goto(`/studio/jobs/${jobId}`);
    await p.getByRole("button", { name: /^Publish/ }).click();
    await expect(p.getByText("Job published")).toBeVisible();
    await expect(p.getByText("Live", { exact: true }).first()).toBeVisible();

    await p.goto(`/studio/jobs/${jobId}/roster`);
    for (const s of subjects) {
      const row = p.locator("tr", { hasText: s.last });
      const matched = Number((await row.locator("td").nth(4).textContent())?.trim() ?? "0");
      if (matched > 0) {
        pickedSubject = s;
        accessCode = (await row.locator("td.font-mono").textContent())!.trim();
        break;
      }
    }
    expect(accessCode).toMatch(/^[A-Z0-9]{6}$/);
  });

  // e) A parent opens the shop, enters the code, verifies, buys.
  const parent = await newVisitor(browser);
  let orderNumber = "";
  await test.step("e) parent enters the code, verifies with +998, sees photos and buys", async () => {
    const p = parent.page;
    await p.goto("/shop");
    // Both code boxes submit on their own once all 6 characters are in.
    await fillCode(p, "Album code", accessCode);
    await p.waitForURL(/\/shop\/verify/);

    await p.locator("#verify-phone").fill(parentPhone);
    await p.getByRole("button", { name: "Send my code" }).click();
    const devCode = (await p.locator("code").filter({ hasText: /^\d{6}$/ }).first().textContent())!.trim();
    await fillCode(p, "One-time code", devCode);
    await p.waitForURL(new RegExp(`/shop/a/${accessCode}`));
    await expect(p.getByText(pickedSubject.first).first()).toBeVisible();
    expect(await p.locator("main img").count()).toBeGreaterThan(0);

    await p.goto(`/shop/a/${accessCode}/shop`);
    // The new studio's starter sheet has single products; with one photo they add directly ("Add"),
    // with several a photo picker opens ("Choose photo").
    await p.getByRole("button", { name: /^(Add|Choose photo)$/ }).first().click();
    const picker = p.getByRole("dialog").getByRole("button", { name: /^Add to cart/ });
    if (await picker.isVisible({ timeout: 2_000 }).catch(() => false)) await picker.click();
    await expect(p.getByText(/Added/).first()).toBeVisible();

    await p.goto("/shop/cart");
    await p.getByRole("link", { name: /^Checkout/ }).click();
    await p.waitForURL(/\/shop\/checkout/);
    await p.locator("#co-name").fill(parentName);
    await p.locator("#co-email").fill(`lifecycle-parent-${stamp}@example.com`);
    if (await p.locator("#co-line1").isVisible()) {
      await p.locator("#co-line1").fill("12 Alder St");
      await p.locator("#co-city").fill("Portland");
      await p.locator("#co-state").fill("OR");
      await p.locator("#co-postalCode").fill("97204");
      await p.locator("#co-postalCode").blur();
    }
    // Test mode offers card, Apple Pay and Google Pay; pay by card.
    await p.getByRole("button", { name: /^Pay \$[\d.,]+$/ }).click();
    await p.waitForURL(/\/shop\/orders\//);
    orderNumber = (await p.getByText(/SB-\d+/).first().textContent())!.match(/SB-\d+/)![0];
    expect(orderNumber).toMatch(/^SB-\d+$/);
  });

  // f) The studio sees the order and the client; another studio does not.
  await test.step("f) studio sees the order and the client; Brightside does not", async () => {
    const p = owner.page;
    await p.goto(`/studio/orders?q=${encodeURIComponent(orderNumber)}`);
    await expect(p.getByText(orderNumber).first()).toBeVisible();
    await p.goto("/studio/clients");
    await expect(p.locator("tr", { hasText: parentName })).toBeVisible();
    await expect(p.locator("tr", { hasText: parentName })).toContainText(pickedSubject.first);

    const other = await newVisitor(browser);
    await studioLogin(other.page, "owner");
    await other.page.goto(`/studio/clients?q=${encodeURIComponent(parentName)}`);
    await expect(other.page.locator("tr", { hasText: parentName })).toHaveCount(0);
    const brightside = await api().auth.login(DEMO_CREDENTIALS.owner);
    expect(await api(brightside.token).studio.clients({ q: parentName })).toHaveLength(0);
    await other.context.close();
  });

  // g) Snapbell admin sees the client and the order.
  await test.step("g) admin sees the client and the order", async () => {
    const admin = await newVisitor(browser);
    await adminLogin(admin.page);
    await admin.page.goto(`/admin/clients?q=${encodeURIComponent(parentName)}`);
    const clientRow = admin.page.locator("tr", { hasText: parentName });
    await expect(clientRow).toBeVisible();
    await expect(clientRow).toContainText(studioName);
    await admin.page.goto(`/admin/orders?q=${encodeURIComponent(orderNumber)}`);
    await expect(admin.page.locator("tr", { hasText: orderNumber })).toContainText(studioName);
    await admin.context.close();
  });

  await owner.context.close();
  await parent.context.close();
});
