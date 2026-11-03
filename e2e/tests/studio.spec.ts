import { BASE_URL, DEMO_CREDENTIALS, DEMO_IDS, expect, fixture, setLanguage, studioLogin, test, unique } from "./fixtures";
import { adminCreatedStudio, dateInput, ownerClient, placeSampleOrder, readyStudio, staffToken, toast, useStaffSession } from "./helpers/studio";

// Studio app (/studio): every function, driven through the real UI.
// Data is created per test where possible; demo data is only changed in ways other tests tolerate.

test.describe("1. Login and logout", () => {
  test("wrong password shows an error and stays on login", async ({ page }) => {
    await page.goto("/studio/login");
    await page.locator("#email").fill(DEMO_CREDENTIALS.owner.email);
    await page.locator("#password").fill("not-the-password");
    await page.locator('form button[type="submit"]').click();
    await expect(page.getByText("That email and password don't match.")).toBeVisible();
    await expect(page).toHaveURL(/\/studio\/login/);
  });

  test("owner logs in with email and password", async ({ page }) => {
    await studioLogin(page, "owner");
    await expect(page.getByRole("heading", { level: 1, name: "Hi Jordan" })).toBeVisible();
  });

  test("magic link (dev link shown in demo) logs the owner in", async ({ page }) => {
    await page.goto("/studio/login");
    await page.locator("#email").fill(DEMO_CREDENTIALS.owner.email);
    await page.getByRole("button", { name: "Email me a sign-in link" }).click();
    await expect(page.getByText("Check your inbox")).toBeVisible();
    await page.getByRole("link", { name: "open the link" }).click();
    // Must land on the site's own origin (not the server's bind address, e.g. http://0.0.0.0:3000).
    await page.waitForURL((url) => url.origin === new URL(BASE_URL).origin && url.pathname === "/studio/home", { timeout: 15_000 });
    await expect(page.getByRole("heading", { level: 1, name: "Hi Jordan" })).toBeVisible();
  });

  test("logout ends the session", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.getByRole("button", { name: /Jordan Ellis/ }).click();
    await page.getByRole("menuitem", { name: "Log out" }).click();
    await page.waitForURL(/\/studio\/login/);
    await page.goto("/studio/home");
    await expect(page).toHaveURL(/\/studio\/login/);
  });
});

test.describe("2. Home", () => {
  test("shows sales stats, open jobs with countdowns and recent orders", async ({ page }) => {
    await studioLogin(page, "owner");
    for (const label of ["Sales today", "Sales this week", "Open jobs", "To-dos"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    const openJob = page.getByRole("link", { name: /Maple Grove Elementary · Fall Picture Day/ });
    await expect(openJob).toBeVisible();
    await expect(openJob.getByText(/days? left|hours? left|Closes within the hour/)).toBeVisible();
    await expect(page.getByRole("heading", { name: /^Recent orders/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /SB-\d+/ }).first()).toBeVisible();
  });
});

test.describe("3. Jobs list", () => {
  test("filters by status and searches", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/jobs");
    await page.getByRole("navigation", { name: "Filter by status" }).getByRole("link", { name: "Draft" }).click();
    await expect(page).toHaveURL(/status=draft/);
    const rows = page.locator("tbody tr");
    await expect(rows.first()).toBeVisible();
    for (const badge of await rows.locator("td:nth-child(4)").allInnerTexts()) expect(badge).toContain("Draft");

    await page.goto("/studio/jobs");
    await page.getByRole("searchbox", { name: "Search jobs" }).or(page.getByLabel("Search jobs")).fill("Eagles");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/q=Eagles/);
    await expect(page.getByRole("link", { name: /U12 Fall Season/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Fall Picture Day/ })).toHaveCount(0);
  });

  test("duplicates a job from the row menu", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/jobs?q=Spring");
    await page.getByRole("button", { name: "Job actions" }).first().click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(toast(page, "Job duplicated")).toBeVisible();
    await page.waitForURL((url) => /\/studio\/jobs\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith(DEMO_IDS.mapleSpring));
    await expect(page.getByText("Draft").first()).toBeVisible();
  });
});

test.describe("4–12. Job lifecycle: wizard → roster → photos → publish → settings → marketing → exports", () => {
  test.describe.configure({ mode: "serial" });
  const u = unique();
  const org = `E2E School ${u}`;
  const jobName = `E2E Picture Day ${u}`;
  let jobId = "";

  test("4a. new-job wizard creates a job with a new free-text school name", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/jobs/new");
    await page.locator("#job-org").fill(org);
    await page.locator("#job-name").fill(jobName);
    await page.locator("#job-date").fill(dateInput(2));
    await page.locator("#ship-bulk").click();
    await page.locator("#job-publish").fill(dateInput(3));
    await page.locator("#job-deadline").fill(dateInput(14));
    await page.getByRole("button", { name: "Create job" }).click();
    await expect(toast(page, "Job created")).toBeVisible();
    await page.waitForURL(/\/studio\/jobs\/[^/]+\/roster$/);
    jobId = page.url().split("/jobs/")[1]!.split("/")[0]!;
    await expect(page.getByRole("heading", { level: 1, name: `${org} · ${jobName}` })).toBeVisible();
  });

  test("4b. overview shows the publish checklist; publishing is blocked while items are missing", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}`);
    await expect(page.getByText("Checklist to publish")).toBeVisible();
    await expect(page.getByText(/\d of \d done/)).toBeVisible();
    await page.getByRole("button", { name: /^Publish/ }).click();
    await expect(toast(page, "That didn't work")).toBeVisible();
    await expect(page.locator("main").getByText("Draft").first()).toBeVisible();
  });

  test("4c. the wizard suggests the name and a second job reuses the same school", async ({ page, context, api }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/jobs/new");
    await expect(page.locator(`#job-org-options option[value="${org}"]`)).toHaveCount(1);
    await page.locator("#job-org").fill(`  ${org.toUpperCase()} `);
    await page.locator("#job-name").fill(`${jobName} retake`);
    await page.locator("#job-date").fill(dateInput(20));
    await page.getByRole("button", { name: "Create job" }).click();
    await page.waitForURL(/\/studio\/jobs\/[^/]+\/roster$/);
    const secondId = page.url().split("/jobs/")[1]!.split("/")[0]!;
    const c = api(await staffToken(context));
    const [first, second] = await Promise.all([c.jobs.get(jobId), c.jobs.get(secondId)]);
    expect(second.organizationId).toBe(first.organizationId);
  });

  test("5a. roster: add a subject manually", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/roster`);
    await page.getByRole("button", { name: "Add subject" }).first().click();
    await page.locator("#sub-first").fill("Lola");
    await page.locator("#sub-last").fill("Testova");
    await page.locator("#sub-group").fill("3-A");
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Subject added")).toBeVisible();
    await expect(page.getByRole("cell", { name: /Lola Testova/ }).first()).toBeVisible();
  });

  test("5b. roster: CSV import with column mapping, then per-row errors", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/roster`);
    await page.getByRole("button", { name: "Import CSV" }).first().click();
    const sheet = page.getByRole("dialog");
    await sheet.locator('input[type="file"]').first().setInputFiles(fixture("roster.csv"));
    await expect(sheet.locator("#map-firstName")).toHaveValue("First name");
    await expect(sheet.locator("#map-lastName")).toHaveValue("Last name");
    await expect(sheet.locator("#map-group")).toHaveValue("Class");
    await sheet.getByRole("button", { name: "Import 3 rows" }).click();
    await expect(sheet.getByText("3 added, 0 updated")).toBeVisible();

    await sheet.getByRole("button", { name: "Import another file" }).click();
    await sheet.locator('input[type="file"]').first().setInputFiles({
      name: "bad.csv",
      mimeType: "text/csv",
      buffer: Buffer.from("First name,Last name,Class\nNodira,,3-B\nBobur,Aliyev,3-B\n"),
    });
    await sheet.getByRole("button", { name: "Import 2 rows" }).click();
    await expect(sheet.getByText(/1 row needs attention/)).toBeVisible();
    await expect(sheet.locator("tbody tr")).toHaveCount(1);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("cell", { name: /Aziz Karimov/ }).first()).toBeVisible();
    await expect(page.getByRole("cell", { name: /Bobur Aliyev/ }).first()).toBeVisible();
  });

  test("5c. roster: regenerate codes and print code cards", async ({ page, context, api }) => {
    await studioLogin(page, "owner");
    const c = api(await staffToken(context));
    const before = new Map((await c.subjects.list(jobId)).map((s) => [s.id, s.accessCode]));
    await page.goto(`/studio/jobs/${jobId}/roster`);
    await page.getByRole("button", { name: "Regenerate codes" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Regenerate" }).click();
    await expect(toast(page, "Codes regenerated")).toBeVisible();
    const after = await c.subjects.list(jobId);
    expect(after.every((s) => before.get(s.id) !== s.accessCode)).toBe(true);

    await page.goto(`/studio/jobs/${jobId}/roster/print`);
    for (const s of after) await expect(page.getByText(s.accessCode, { exact: true }).first()).toBeVisible();
  });

  test("6. photos: upload two files, they process to ready; a re-upload is flagged as duplicate", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/photos`);
    await page.locator('input[type="file"]').first().setInputFiles([fixture("photo-1.jpg"), fixture("photo-2.jpg")]);
    await expect(page.getByText("2 of 2 uploaded")).toBeVisible({ timeout: 60_000 });
    await expect(async () => {
      await page.reload();
      await expect(page.getByText("2 photos").first()).toBeVisible({ timeout: 2_000 });
      await expect(page.getByText(/processing…/)).toHaveCount(0, { timeout: 2_000 });
    }).toPass({ timeout: 30_000 });

    await page.locator('input[type="file"]').first().setInputFiles(fixture("photo-1.jpg"));
    await expect(page.getByText("1 of 1 uploaded")).toBeVisible({ timeout: 60_000 });
    await expect(async () => {
      await page.reload();
      await expect(page.getByRole("button", { name: "Duplicates (1)" })).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    await expect(page.getByText("Duplicate", { exact: true }).first()).toBeVisible();
  });

  test("8. publish once roster, photos and price sheet are ready → Live", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}`);
    await page.getByRole("button", { name: /^Publish/ }).click();
    await expect(toast(page, "Job published")).toBeVisible();
    await expect(page.getByRole("button", { name: "Close job" })).toBeVisible();
    await expect(page.locator("main").getByText("Live", { exact: true }).first()).toBeVisible();
  });

  test("9. settings: album-access change asks for confirmation; protection toggles save", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/settings`);
    await page.locator("#set-album-team").click();
    await page.getByRole("button", { name: "Save settings" }).click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByText("Change album access to Team?")).toBeVisible();
    await expect(dialog.getByText("No messages are sent until you confirm.")).toBeVisible();
    await dialog.getByRole("button", { name: "Confirm change" }).click();
    await expect(toast(page, "Settings saved")).toBeVisible();
    await expect(page.getByText("Team album")).toBeVisible();

    const blur = page.locator("#p-blur");
    await expect(blur).toHaveAttribute("data-state", "checked");
    await blur.click();
    await page.getByRole("button", { name: "Save settings" }).click();
    await expect(toast(page, "Settings saved")).toBeVisible();
    await page.reload();
    await expect(page.locator("#p-blur")).toHaveAttribute("data-state", "unchecked");
  });

  test("10. marketing: edit a message, send a test, open the flyer", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/marketing`);
    const text = `E2E reminder ${u}: order {{child}}'s photos by {{deadline}}.`;
    // Already-sent messages (e.g. "Photos are ready" after publishing) are locked; edit the next one.
    await page.getByRole("button", { name: "Edit", disabled: false }).first().click();
    await page.locator("#msg-body").fill(text);
    await page.getByRole("dialog").getByRole("button", { name: "Save" }).click();
    await expect(toast(page, "Message saved")).toBeVisible();
    await expect(page.getByText(text)).toBeVisible();

    await page.getByRole("button", { name: "Send test" }).first().click();
    await page.locator("#test-to").fill("+998901112233");
    await page.getByRole("dialog").getByRole("button", { name: "Send test" }).click();
    await expect(toast(page, "Test sent")).toBeVisible();

    await page.getByRole("link", { name: "Download flyer (PDF)" }).click();
    await page.waitForURL(/roster\/print\?view=flyer/);
    await expect(page.locator("main, body").getByText(/\/shop|SAMPLE|photos/).first()).toBeVisible();
  });

  test("12. exports: a subject CSV export becomes ready and downloads", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${jobId}/exports`);
    await page.getByRole("button", { name: "Start export" }).first().click();
    await expect(toast(page, "Export started")).toBeVisible();
    const download = page.getByRole("link", { name: "Download" }).first();
    await expect(async () => {
      await page.reload();
      await expect(download).toBeVisible({ timeout: 2_000 });
    }).toPass({ timeout: 30_000 });
    const href = await download.getAttribute("href");
    const res = await page.request.get(href!);
    expect(res.status()).toBe(200);
    const csv = await res.text();
    expect(csv).toContain("Karimov");
    expect(csv).toContain("Testova");
  });
});

test.describe("10b. Marketing quiet-hours note", () => {
  test("states the real quiet hours (API defers texts 9pm–8am)", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${DEMO_IDS.maple}/marketing`);
    const banner = page.getByText(/never between/);
    await expect(banner).toBeVisible();
    // apps/api messaging.service inQuietHours(): h >= 21 || h < 8.
    await expect(banner).toContainText(/9\s?pm/);
  });
});

test.describe("7. Matching on the EAGLES team job", () => {
  test.describe.configure({ mode: "serial" });
  const url = `/studio/jobs/${DEMO_IDS.eagles}/matching`;

  test("banner: nothing low-confidence goes live", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(url);
    await expect(page.getByText("Nothing low-confidence goes live")).toBeVisible();
  });

  test("accept, reassign and bulk-accept review matches; assign an unmatched photo", async ({ page, api }) => {
    const owner = await ownerClient(api);
    const queue = await owner.matches.queue(DEMO_IDS.eagles);
    const reviewCount = queue.groups.reduce((n, g) => n + g.review.length, 0);
    test.skip(reviewCount < 3 || queue.unmatched.length < 1, `Demo review queue already used up on this server (${reviewCount} review, ${queue.unmatched.length} unmatched). Restart the server for fresh demo data.`);

    await studioLogin(page, "owner");
    await page.goto(url);
    await page.getByRole("button", { name: "Accept", exact: true }).first().click();
    await expect(toast(page, "Match accepted")).toBeVisible();

    await page.getByRole("button", { name: "Reassign to another subject" }).first().click();
    const dialog = page.getByRole("dialog");
    const target = dialog.locator("#reassign-target");
    await target.selectOption({ index: 1 });
    await dialog.getByRole("button", { name: "Reassign" }).click();
    await expect(toast(page, "Photo reassigned")).toBeVisible();

    await page.getByRole("tab", { name: /Needs review/ }).click();
    await page.getByRole("button", { name: /^Select IMG_/ }).first().click();
    await page.getByRole("button", { name: "Accept selected" }).click();
    await expect(toast(page, "1 match accepted")).toBeVisible();

    await page.getByRole("tab", { name: /Unmatched photos/ }).click();
    const first = page.getByRole("tabpanel").locator("li").first();
    await first.locator("select").selectOption({ index: 1 });
    await first.getByRole("button", { name: "Match" }).click();
    await expect(toast(page, "Photo matched")).toBeVisible();

    const after = await owner.matches.queue(DEMO_IDS.eagles);
    expect(after.groups.reduce((n, g) => n + g.review.length, 0)).toBe(reviewCount - 3);
    expect(after.unmatched.length).toBe(queue.unmatched.length - 1);
  });
});

test.describe("11. Job orders (Maple Grove)", () => {
  test("lists orders, exports CSV and releases the bulk batch", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/jobs/${DEMO_IDS.maple}/orders`);
    await expect(page.getByRole("link", { name: /SB-\d+/ }).first()).toBeVisible();
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);

    const release = page.getByRole("button", { name: "Release to lab" });
    if (await release.count()) {
      await release.first().click();
      await page.getByRole("dialog").getByRole("button", { name: "Release batch" }).click();
      await expect(toast(page, "Batch released to the lab")).toBeVisible();
    }
  });
});

test.describe("13. Price sheets", () => {
  test("editor shows live profit; duplicate, below-cost warning, save and package builder", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/price-sheets/ps_fall_schools");
    await expect(page.getByRole("textbox", { name: "Price for 8×10 Print" })).toHaveValue("22.00");
    await expect(page.getByText("Your profit").first()).toBeVisible();

    await page.goto("/studio/price-sheets");
    await page.getByRole("button", { name: "Actions for Fall Schools 2026", exact: true }).click();
    await page.getByRole("menuitem", { name: "Duplicate" }).click();
    await expect(toast(page, "Price sheet duplicated")).toBeVisible();
    await page.waitForURL((url) => /\/studio\/price-sheets\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith("ps_fall_schools"));

    const price = page.getByRole("textbox", { name: "Price for 8×10 Print" });
    await price.fill("1.00");
    await expect(page.getByText("1 product is priced below lab cost plus fees")).toBeVisible();
    await expect(page.getByLabel("Below cost").first()).toBeVisible();
    await price.fill("25.00");
    await expect(page.getByText(/priced below lab cost plus fees/)).toHaveCount(0);

    const pack = `E2E Pack ${unique()}`;
    await page.getByRole("button", { name: "Add package" }).click();
    const names = page.getByRole("textbox", { name: "Package name" });
    await names.last().fill(pack);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(toast(page, "Price sheet saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("textbox", { name: "Price for 8×10 Print" })).toHaveValue("25.00");
    await expect(page.getByRole("textbox", { name: "Package name" }).last()).toHaveValue(pack);
  });
});

test.describe("14. Promos and Picture Day Pass offers", () => {
  test("creates a percent promo code and a Pass offer", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/promos");
    const code = `E2E${unique().toUpperCase()}`.slice(0, 20);
    await page.getByRole("button", { name: "New promo code" }).click();
    await page.locator("#pc-code").fill(code);
    await page.locator("#pc-value").fill("15");
    await page.getByRole("dialog").getByRole("button", { name: "Create code" }).click();
    await expect(toast(page, `${code} created`)).toBeVisible();
    await expect(page.getByRole("cell", { name: code }).first()).toBeVisible();

    const passTab = page.getByRole("tab", { name: /Picture Day Pass/ });
    const before = Number((await passTab.innerText()).match(/\((\d+)\)/)?.[1] ?? 0);
    await passTab.click();
    await page.getByRole("button", { name: "New Pass offer" }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Create offer" }).click();
    await expect(toast(page, "Pass offer created")).toBeVisible();
    await expect(passTab).toHaveText(new RegExp(`\\(${before + 1}\\)`));
  });
});

test.describe("15. Orders, refunds and reprints", () => {
  test.describe.configure({ mode: "serial" });
  let placed: Awaited<ReturnType<typeof placeSampleOrder>>;

  test.beforeAll(async ({ api }) => {
    placed = await placeSampleOrder(api);
  });

  test("search by child and by parent name", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/orders?q=${encodeURIComponent(placed.child)}`);
    await expect(page.getByRole("link", { name: placed.order.number })).toBeVisible();
    await page.goto(`/studio/orders?q=${encodeURIComponent(placed.name)}`);
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("link", { name: placed.order.number })).toBeVisible();
  });

  test("order detail shows items, money split, lab status and messages", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/orders/${placed.order.id}`);
    await expect(page.getByRole("heading", { level: 1, name: `Order ${placed.order.number}` })).toBeVisible();
    await expect(page.getByText(placed.order.items[0]!.name).first()).toBeVisible();
    await expect(page.getByText("Payment and payout")).toBeVisible();
    await expect(page.getByText("Your payout").first()).toBeVisible();
    await expect(page.getByText("Lab status")).toBeVisible();
    await expect(page.getByText("Messages", { exact: true })).toBeVisible();
    await expect(page.getByText(`received order ${placed.order.number}`, { exact: false }).first()).toBeVisible();
  });

  test("partial refund → Partly refunded; reprint request", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto(`/studio/orders/${placed.order.id}`);
    await page.getByRole("button", { name: "Refund", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByText("Partial refund").click();
    await dialog.locator("#rf-amount").fill("1.00");
    await dialog.locator("#rf-reason").fill("E2E partial refund");
    await dialog.getByRole("button", { name: "Refund $1.00" }).click();
    await expect(toast(page, "Refunded $1.00")).toBeVisible();
    await expect(page.getByText("Partly refunded").first()).toBeVisible();

    await page.getByRole("button", { name: "Request reprint" }).click();
    const reprint = page.getByRole("dialog");
    await reprint.getByRole("checkbox").first().click();
    await reprint.locator("#rp-reason").fill("Print arrived creased");
    await reprint.getByRole("button", { name: "Send to lab" }).click();
    await expect(toast(page, "Reprint requested")).toBeVisible();
    await expect(page.getByText("Reprints")).toBeVisible();
  });
});

test.describe("16. Reports", () => {
  test("totals, chart and CSV download", async ({ page }) => {
    await studioLogin(page, "owner");
    await page.goto("/studio/reports");
    for (const label of ["Sales", "Average order", "Fees", "Your payout"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expect(page.getByText("Sales by day").first()).toBeVisible();
    await expect(page.locator("figure")).toHaveCount(1);
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download CSV" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/\.csv$/);
  });
});

test.describe("17. Clients (buyers only) and photographer restrictions", () => {
  test("a new buyer appears in Clients and search finds them", async ({ page, api }) => {
    const placed = await placeSampleOrder(api);
    await studioLogin(page, "owner");
    await page.goto("/studio/clients");
    await expect(page.getByText("Only parents who have placed an order with you appear here.", { exact: false })).toBeVisible();
    await page.getByLabel("Search clients").fill(placed.name);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.getByRole("link", { name: placed.name }).first()).toBeVisible();
    await expect(page.getByText(placed.email)).toBeVisible();
  });

  test("a parent who only signed up (no order) never appears", async ({ page, api }) => {
    const u = unique();
    const email = `browser-${u}@example.com`;
    const sent = await api().auth.sendOtp({ destination: email, channel: "email" });
    await api().auth.verifyOtp({ destination: email, code: sent.devCode!, name: `Browser Only ${u}`, consent: { smsUpdates: false, marketing: false } });
    await studioLogin(page, "owner");
    await page.goto(`/studio/clients?q=${encodeURIComponent(`Browser Only ${u}`)}`);
    await expect(page.getByText("No clients match your search.")).toBeVisible();
  });

  test("photographer sees no Clients, Reports, Price sheets, Promos or Payments", async ({ page }) => {
    await studioLogin(page, "photographer");
    const nav = page.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link", { name: "Jobs" })).toBeVisible();
    for (const name of ["Clients", "Reports", "Price sheets", "Promos"]) await expect(nav.getByRole("link", { name })).toHaveCount(0);
    for (const path of ["/studio/clients", "/studio/reports", "/studio/price-sheets", "/studio/promos", "/studio/settings/payments"]) {
      await page.goto(path);
      await expect(page).toHaveURL(/\/studio\/home\?denied=1/);
      await expect(page.getByText("That page is for owners and admins")).toBeVisible();
    }
    await page.goto("/studio/settings/studio");
    await expect(page.getByRole("link", { name: "Payments and tax" })).toHaveCount(0);
  });
});

test.describe("18. Settings → Studio: brand and team", () => {
  test.describe.configure({ mode: "serial" });
  let studio: Awaited<ReturnType<typeof readyStudio>>;

  test.beforeAll(async ({ api }) => {
    studio = await readyStudio(api);
  });

  test("change the brand color and save", async ({ page, context }) => {
    await useStaffSession(context, studio.session.token);
    await page.goto("/studio/settings/studio");
    await page.getByRole("button", { name: "Use #7C3AED" }).first().click();
    await page.getByRole("button", { name: "Save brand" }).click();
    await expect(toast(page, "Studio saved")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Use #7C3AED" }).first()).toHaveAttribute("aria-pressed", "true");
  });

  test("invite → setup link → the photographer sets a password and has restricted access", async ({ page, context, browser }) => {
    await useStaffSession(context, studio.session.token);
    await page.goto("/studio/settings/studio");
    const name = `Photog ${studio.u}`;
    const email = `photog-${studio.u}@example.com`;
    await page.getByRole("button", { name: "Invite" }).click();
    await page.locator("#inv-name").fill(name);
    await page.locator("#inv-email").fill(email);
    await page.getByRole("dialog").getByText("Photographer", { exact: true }).click();
    await page.getByRole("dialog").getByRole("button", { name: "Send invite" }).click();
    const linkDialog = page.getByRole("dialog", { name: `Setup link for ${name}` });
    await expect(linkDialog).toBeVisible();
    const link = await linkDialog.getByRole("textbox", { name: "Setup link" }).inputValue();
    await linkDialog.getByRole("button", { name: "Done" }).click();
    await expect(page.getByRole("listitem").filter({ hasText: name }).getByText("Invited")).toBeVisible();

    const invitee = await browser.newContext();
    const p2 = await invitee.newPage();
    await p2.goto(new URL(link).pathname + new URL(link).search);
    await expect(p2.getByRole("heading", { name: `Welcome, ${name}` })).toBeVisible();
    await p2.locator("#setup-password").fill("photog-secret-1");
    await p2.locator("#setup-confirm").fill("photog-secret-1");
    await p2.getByRole("button", { name: "Set password and continue" }).click();
    await p2.waitForURL(/\/studio\/home/);
    const nav = p2.getByRole("navigation", { name: "Main" }).first();
    await expect(nav.getByRole("link", { name: "Jobs" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Reports" })).toHaveCount(0);
    await invitee.close();

    await page.reload();
    await expect(page.getByRole("listitem").filter({ hasText: name }).getByText("Invited")).toHaveCount(0);
  });

  test("“New setup link” replaces an invited member's old link", async ({ page, context, browser }) => {
    await useStaffSession(context, studio.session.token);
    await page.goto("/studio/settings/studio");
    const name = `Second ${studio.u}`;
    await page.getByRole("button", { name: "Invite" }).click();
    await page.locator("#inv-name").fill(name);
    await page.locator("#inv-email").fill(`second-${studio.u}@example.com`);
    await page.getByRole("dialog").getByRole("button", { name: "Send invite" }).click();
    let dialog = page.getByRole("dialog", { name: `Setup link for ${name}` });
    const oldLink = await dialog.getByRole("textbox", { name: "Setup link" }).inputValue();
    await dialog.getByRole("button", { name: "Done" }).click();

    await page.getByRole("listitem").filter({ hasText: name }).getByRole("button", { name: "New setup link" }).click();
    await expect(toast(page, /New setup link created/)).toBeVisible();
    dialog = page.getByRole("dialog", { name: `Setup link for ${name}` });
    const newLink = await dialog.getByRole("textbox", { name: "Setup link" }).inputValue();
    expect(newLink).not.toBe(oldLink);

    const other = await browser.newContext();
    const p2 = await other.newPage();
    await p2.goto(new URL(oldLink).pathname + new URL(oldLink).search);
    await expect(p2.getByText("This setup link doesn't work")).toBeVisible();
    await other.close();
  });
});

test.describe("19. Settings → Payments", () => {
  test("connect Stripe (mock) on a new studio → Active", async ({ page, context, api }) => {
    const studio = await readyStudio(api);
    await useStaffSession(context, studio.session.token);
    await page.goto("/studio/settings/payments");
    await expect(page.getByText("Not connected").first()).toBeVisible();
    await page.getByRole("button", { name: "Connect Stripe" }).click();
    await expect(toast(page, "Stripe connected")).toBeVisible();
    await expect(page.getByText("Active", { exact: true }).first()).toBeVisible();
  });
});

test.describe("20. Onboarding a studio created by Snapbell", () => {
  test("owner opens the setup link, sets a password and completes the wizard", async ({ page, api }) => {
    const studio = await adminCreatedStudio(api);
    await page.goto(studio.setupPath);
    await expect(page.getByRole("heading", { name: `Welcome, ${studio.owner.name}` })).toBeVisible();
    await expect(page.getByText(`You're joining ${studio.studio.studio.name} as Owner.`)).toBeVisible();
    await page.locator("#setup-password").fill(studio.password);
    await page.locator("#setup-confirm").fill(studio.password);
    await page.getByRole("button", { name: "Set password and continue" }).click();
    await page.waitForURL(/\/studio\/onboarding/);

    await expect(page.locator("#ob-name")).toHaveValue(studio.studio.studio.name);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Add your brand" })).toBeVisible();
    await page.getByRole("button", { name: "Use #1D4ED8" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Which markets do you shoot?" })).toBeVisible();
    await page.getByRole("button", { name: "Sports" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Get paid with Stripe" })).toBeVisible();
    await page.getByRole("button", { name: "Skip for now" }).click();
    await expect(page.getByRole("heading", { name: "Pick your default lab" })).toBeVisible();
    await page.getByText("Cascade Pro Lab").click();
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByRole("heading", { name: "Start with a price sheet" })).toBeVisible();
    await page.getByRole("button", { name: /Finish setup|Continue/ }).click();
    await expect(page.getByRole("heading", { name: "You're set up" })).toBeVisible();
    await page.getByRole("button", { name: "Go to Home" }).click();
    await page.waitForURL(/\/studio\/home/);
    await expect(page.getByText(studio.studio.studio.name).first()).toBeVisible();
  });
});

test.describe("21. Languages and removed pages", () => {
  test("home and jobs in Russian and Uzbek", async ({ page, context }) => {
    await studioLogin(page, "owner");
    await setLanguage(context, "ru");
    await page.goto("/studio/home");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    await expect(page.getByRole("navigation", { name: /Главное|Основн/ }).or(page.locator("aside nav")).first().getByRole("link", { name: "Съёмки" })).toBeVisible();
    await page.goto("/studio/jobs");
    await expect(page.getByRole("heading", { level: 1, name: "Съёмки" })).toBeVisible();

    await setLanguage(context, "uz");
    await page.goto("/studio/jobs");
    await expect(page.locator("html")).toHaveAttribute("lang", "uz-Latn-UZ");
    await expect(page.locator("aside nav").getByRole("link", { name: "Suratga olishlar" })).toBeVisible();
    await expect(page.locator("aside nav").getByRole("link", { name: "Mijozlar" })).toBeVisible();
  });

  test("/studio/organizations is gone (404)", async ({ page }) => {
    await studioLogin(page, "owner");
    const res = await page.goto("/studio/organizations");
    expect(res?.status()).toBe(404);
  });
});
