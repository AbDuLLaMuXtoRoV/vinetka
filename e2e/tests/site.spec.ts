import type { Page } from "@playwright/test";
import type { ContactRequest, SnapbellClient } from "@snapbell/sdk";
import { BASE_URL, DEMO_CREDENTIALS, expect, test, unique } from "./fixtures";

/**
 * Main site (/, /ru, /uz): every page and function through a real browser.
 * Lead forms are checked end to end: submitted in the UI, then found in Admin
 * through the API.
 */

type ApiFactory = (token?: string | null) => SnapbellClient;

async function findRequests(api: ApiFactory, q: string): Promise<ContactRequest[]> {
  const { token } = await api().admin.login(DEMO_CREDENTIALS.internalAdmin);
  return api(token).admin.contactRequests({ q });
}

/** Types into the 6-box CodeInput labelled `label`. */
async function typeCode(page: Page, label: string | RegExp, code: string) {
  const group = page.getByRole("group", { name: label });
  await group.getByRole("textbox").first().click();
  await page.keyboard.type(code);
}

/** Reads the one-time code shown on screen in demo mode. */
async function shownDevCode(page: Page): Promise<string> {
  const code = page.locator("p", { hasText: /Demo code:|Демо-код:|Demo kod:/ }).locator("code");
  await expect(code).toHaveText(/^\d{6}$/);
  return (await code.textContent())!.trim();
}

const htmlLang = (page: Page) => page.locator("html").getAttribute("lang");

// ---------------------------------------------------------------------------
// 1. Home
// ---------------------------------------------------------------------------

test.describe("home", () => {
  test("renders every section and never offers self-signup", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1, name: "From picture day to paid orders, without the paper." })).toBeVisible();
    for (const title of [
      "Four steps. Most of them happen on their own.",
      "One platform, set up the way your picture day actually runs.",
      "Run the day, fill the store, remind the families.",
      "Families see proofs. Nobody walks away with the originals.",
      "What changes when ordering gets easy",
      "Your next picture day can sell itself.",
    ]) {
      await expect(page.getByRole("heading", { name: title })).toBeVisible();
    }
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Start free");
    // Studios can't sign themselves up: no link to a studio signup anywhere on the page.
    const hrefs = await page.locator("a[href]").evaluateAll((as) => as.map((a) => a.getAttribute("href") ?? ""));
    expect(hrefs.filter((h) => /studio.*signup|signup.*studio/i.test(h))).toEqual([]);
  });

  test("hero 'Become a partner' goes to the contact page", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("main").getByRole("link", { name: /Become a partner/ }).first().click();
    await expect(page).toHaveURL(/\/contact$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("'See a sample store' opens the SAMPLE album flow in the shop", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "See a sample store" }).click();
    // Signed out: the shop asks for a one-time code before showing the album.
    await expect(page).toHaveURL(/\/shop\/verify\?code=SAMPLE/);
  });

  test("market tabs switch content and link to the market's workflow", async ({ page }) => {
    await page.goto("/");
    const tabs = page.getByRole("tablist").first();
    await tabs.getByRole("tab", { name: "Sports" }).click();
    await expect(tabs.getByRole("tab", { name: "Sports" })).toHaveAttribute("aria-selected", "true");
    const panel = page.getByRole("tabpanel");
    await expect(panel).toBeVisible();
    await panel.getByRole("link", { name: /sports workflow/i }).click();
    await expect(page).toHaveURL(/\/markets#sports$/);
    await expect(page.getByRole("tab", { name: "Sports" })).toHaveAttribute("aria-selected", "true");
  });
});

// ---------------------------------------------------------------------------
// 2. Navigation
// ---------------------------------------------------------------------------

test.describe("navigation", () => {
  test("desktop Product mega-menu reaches every feature page", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const items: Array<[string, RegExp]> = [
      ["Check-in app", /\/features\/check-in$/],
      ["Family Store", /\/features\/family-store$/],
      ["Marketing", /\/features\/marketing$/],
      ["Markets", /\/markets$/],
    ];
    for (const [label, url] of items) {
      await page.goto("/");
      const header = page.getByRole("banner");
      await header.getByRole("button", { name: "Product" }).click();
      await header.getByRole("link", { name: new RegExp(`^${label}`) }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Product" }).click();
    await page.getByRole("banner").getByRole("link", { name: "All features" }).click();
    await expect(page).toHaveURL(/\/features$/);
  });

  test("desktop top links: Resources (Blog, Help, Switch) and Contact; no Pricing link", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    const header = page.getByRole("banner");
    // Partner terms are discussed privately: there is no public pricing page or link.
    await expect(header.getByRole("link", { name: "Pricing" })).toHaveCount(0);
    await expect(page.getByRole("contentinfo").getByRole("link", { name: "Pricing" })).toHaveCount(0);
    for (const [label, url] of [
      ["Blog", /\/blog$/],
      ["Help center", /\/help$/],
      ["Switch to Snapbell", /\/switch$/],
    ] as const) {
      await header.getByRole("button", { name: "Resources" }).click();
      await header.getByRole("link", { name: new RegExp(`^${label}`) }).click();
      await expect(page).toHaveURL(url);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }
    await header.getByRole("link", { name: "Contact" }).click();
    await expect(page).toHaveURL(/\/contact$/);
  });

  test("Product menu 'Open sample store' goes to the shop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: "Product" }).click();
    await page.getByRole("link", { name: "Open sample store" }).click();
    await expect(page).toHaveURL(/\/shop\/verify\?code=SAMPLE/);
  });

  test("mobile menu at 390px: parents' Sign up / Sign in, Find my photos and studio login", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await expect(menu.getByRole("link", { name: /Find my photos/ })).toBeVisible();
    await expect(menu.getByText("For parents")).toBeVisible();
    await expect(menu.getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(menu.getByText("For photographers")).toBeVisible();
    await expect(menu.getByRole("link", { name: "Become a partner" })).toHaveAttribute("href", "/contact");
    await expect(menu.getByRole("link", { name: "Studio login" })).toHaveAttribute("href", /\/studio\/login\?lang=en$/);
    await menu.getByRole("link", { name: "Sign up" }).click();
    await expect(page).toHaveURL(/\/signup$/);
    await expect(page.getByRole("heading", { level: 1, name: "Create your account" })).toBeVisible();
  });

  test("header 'Find my photos' and footer 'Studio login'", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");
    await page.getByRole("banner").getByRole("link", { name: /Find my photos/ }).click();
    await expect(page).toHaveURL(/\/find-my-photos$/);
    await page.getByRole("contentinfo").getByRole("link", { name: "Studio login" }).click();
    await expect(page).toHaveURL(/\/studio\/login/);
    await expect(page.locator("#email")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 3. Languages
// ---------------------------------------------------------------------------

test.describe("languages", () => {
  test("footer switcher en → ru → uz → en changes URL, text and <html lang>, and the choice persists", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/features");
    expect(await htmlLang(page)).toBe("en-US");
    const switcher = () => page.getByRole("contentinfo").getByRole("combobox", { name: /Language|Язык|Til/ });

    await switcher().selectOption("ru");
    await expect(page).toHaveURL(/\/ru\/features$/);
    await expect.poll(() => htmlLang(page)).toBe("ru-RU");
    await expect(page.getByRole("banner").getByRole("link", { name: "Контакты" })).toBeVisible();

    // The choice persists: an unprefixed URL now opens in Russian.
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
    await expect(page.getByRole("heading", { level: 1, name: "От дня съёмки до оплаченных заказов — без бумажек." })).toBeVisible();

    await switcher().selectOption("uz");
    await expect(page).toHaveURL(/\/uz$/);
    await expect.poll(() => htmlLang(page)).toBe("uz-Latn-UZ");
    await expect(page.getByRole("heading", { level: 1, name: "Suratga olish kunidan toʻlangan buyurtmalargacha — qogʻozsiz." })).toBeVisible();
    await page.goto("/contact");
    await expect(page).toHaveURL(/\/uz\/contact$/);

    await switcher().selectOption("en");
    await expect(page).toHaveURL(/localhost:\d+\/contact$|\/contact$/);
    await expect(page).not.toHaveURL(/\/(ru|uz)\//);
    await expect.poll(() => htmlLang(page)).toBe("en-US");
  });

  test("hreflang alternates are present and /en/… redirects to the unprefixed URL", async ({ page }) => {
    await page.goto("/features");
    for (const [lang, href] of [
      ["en", /\/features$/],
      ["ru", /\/ru\/features$/],
      ["uz", /\/uz\/features$/],
      ["x-default", /\/features$/],
    ] as const) {
      await expect(page.locator(`link[rel="alternate"][hreflang="${lang}"]`)).toHaveAttribute("href", href);
    }
    const res = await page.goto("/en/features");
    expect(res?.status()).toBe(200);
    await expect(page).toHaveURL(`${BASE_URL}/features`);
  });
});

// ---------------------------------------------------------------------------
// 3b. No public studio pricing (partner terms are discussed privately)
// ---------------------------------------------------------------------------

test.describe("no public studio pricing", () => {
  test("the old pricing URLs redirect permanently to the contact page in the same language", async ({ request }) => {
    for (const [path, expected] of [
      ["/pricing", "/contact"],
      ["/en/pricing", "/contact"],
      ["/ru/pricing", "/ru/contact"],
      ["/uz/pricing", "/uz/contact"],
      ["/help/fees-and-payouts", "/help/payouts"],
      ["/ru/help/fees-and-payouts", "/ru/help/payouts"],
    ] as const) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(308);
      expect(new URL(res.headers()["location"]!, BASE_URL).pathname, path).toBe(expected);
    }
  });

  // Fee wording that must never come back. A bare "8%" would also match results such as
  // "68% of families ordered", so percentages only count when they stand alone.
  const FORBIDDEN: Array<string | RegExp> = [
    /(^|[^\d.,])[86] ?%/,
    /platform fee/i,
    /monthly fee/i,
    /pay only when you sell/i,
    /card processing/i,
    // The old fee-tier threshold. (The demo form asks for the visitor's own yearly volume,
    // e.g. "Over $250K": that is their sales, not our fee.)
    /\$250,000|250 000 \$|250 000 US\$|250 000 dollar/i,
    /комисси[яюи] платформы/i,
    /абонентск/i,
    /эквайринг/i,
    /platforma komissiya/i,
    /oylik toʻlov/i,
    /karta orqali toʻlov/i,
    /calculator|калькулятор|kalkulyator/i,
  ];

  for (const prefix of ["", "/ru", "/uz"]) {
    test(`no studio fees anywhere on the main pages (${prefix || "/en"})`, async ({ page }) => {
      for (const path of ["", "/features", "/features/marketing", "/contact", "/switch", "/demo", "/about", "/help", "/help/payouts", "/terms", "/blog"]) {
        await page.goto(`${prefix}${path}` || "/");
        const text = await page.locator("body").innerText();
        for (const pattern of FORBIDDEN) {
          const hit = typeof pattern === "string" ? text.includes(pattern) : pattern.exec(text)?.[0];
          expect(hit ? `${prefix}${path}: "${hit}"` : null, `${prefix}${path} ${pattern}`).toBeNull();
        }
      }
    });
  }

  test("the payouts help article points to the contact page for partner terms", async ({ page }) => {
    // The same sentence also closes every page in the CTA band, so match the article's paragraph.
    for (const [path, paragraph] of [
      ["/help/payouts", /^Partner terms are agreed with each studio.*Contact us and we'll walk you through partner terms\./],
      ["/ru/help/payouts", /^Условия партнёрства мы согласуем.*Свяжитесь с нами — расскажем об условиях партнёрства\./],
      ["/uz/help/payouts", /^Hamkorlik shartlarini.*Biz bilan bogʻlaning — hamkorlik shartlari haqida aytib beramiz\./],
    ] as const) {
      await page.goto(path);
      await expect(page.locator("p").filter({ hasText: paragraph })).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Interactive pages
// ---------------------------------------------------------------------------

test.describe("interactive sections", () => {
  test("markets: #sports selects Sports, clicking a tab updates the hash", async ({ page }) => {
    await page.goto("/markets#sports");
    await expect(page.getByRole("tab", { name: "Sports" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Dance" }).click();
    await expect(page.getByRole("tab", { name: "Dance" })).toHaveAttribute("aria-selected", "true");
    await expect(page).toHaveURL(/\/markets#dance$/);
  });

  test("check-in FAQ accordion opens and closes", async ({ page }) => {
    await page.goto("/features/check-in");
    const firstQuestion = page.locator("[data-state] > h3 button, h3 > button[aria-expanded]").first();
    await firstQuestion.scrollIntoViewIfNeeded();
    await expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute("aria-expanded", "true");
    const panelId = await firstQuestion.getAttribute("aria-controls");
    await expect(page.locator(`[id="${panelId}"]`)).toBeVisible();
    await firstQuestion.click();
    await expect(firstQuestion).toHaveAttribute("aria-expanded", "false");
  });

  test("family-store interactive phone demo taps through to checkout and back", async ({ page }) => {
    await page.goto("/features/family-store");
    const steps = page.getByRole("list", { name: "Demo steps" });
    await expect(steps.getByRole("button", { name: /Album/ })).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: "Favorite sample photo 1" }).click();
    await page.getByRole("button", { name: "Shop these photos" }).click();
    await expect(steps.getByRole("button", { name: /Shop/ })).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: /^Add bundle · / }).click();
    await expect(steps.getByRole("button", { name: /Checkout/ })).toHaveAttribute("aria-current", "step");
    await page.getByRole("button", { name: /^Pay / }).click();
    await expect(page.getByText("Thank you, Elena!")).toBeVisible();
    await page.getByRole("button", { name: "Order more" }).click();
    await expect(steps.getByRole("button", { name: /Album/ })).toHaveAttribute("aria-current", "step");
  });

  test("check-in page: offline badge and the 3-frame Smart Match explainer", async ({ page }) => {
    await page.goto("/features/check-in");
    await expect(page.getByText("Works offline").first()).toBeVisible();
    const match = page.getByRole("list", { name: "How Smart Match works" }).or(page.getByLabel("How Smart Match works"));
    await expect(match.first()).toBeVisible();
    for (const label of ["Reference photo", "Pro photo", "Matched"]) {
      await expect(match.first().getByRole("img", { name: new RegExp(`^${label}: `) })).toBeVisible();
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Forms that reach Snapbell (checked in Admin through the API)
// ---------------------------------------------------------------------------

test.describe("forms reach Admin", () => {
  test("contact as a photographer → partner request with +998 phone, city and markets", async ({ page, api }) => {
    const company = `E2E Partner Studio ${unique()}`;
    await page.goto("/contact");
    await page.locator("#f-role").selectOption("photographer");
    await page.locator("#f-name").fill("Dilshod Tester");
    await page.locator("#f-company").fill(company);
    await page.locator("#f-phone").fill("90 123 45 67");
    await page.locator("#f-city").fill("Tashkent");
    await page.locator("label", { hasText: /^Schools$/ }).click();
    await page.locator("label", { hasText: /^Sports$/ }).click();
    await page.locator("#f-message").fill("We shoot 20 schools a year and want to try Snapbell.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Thanks — we've got your request")).toBeVisible();

    const [req] = await findRequests(api, company);
    expect(req).toBeTruthy();
    expect(req!.kind).toBe("partner");
    expect(req!.phone).toBe("+998901234567");
    expect(req!.city).toBe("Tashkent");
    expect(req!.details.role).toBe("photographer");
    expect(req!.details.markets?.split(",").sort()).toEqual(["schools", "sports"]);
    expect(req!.status).toBe("new");
  });

  test("contact as a parent → general contact request", async ({ page, api }) => {
    const name = `E2E Parent Question ${unique()}`;
    await page.goto("/contact");
    await page.locator("#f-role").selectOption("parent");
    await page.locator("#f-name").fill(name);
    await page.locator("#f-email").fill(`parent-${unique()}@example.com`);
    await page.locator("#f-message").fill("When will my daughter's photos arrive?");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByRole("status").or(page.getByRole("alert")).filter({ hasText: "Thanks" }).first()).toBeVisible();

    const [req] = await findRequests(api, name);
    expect(req?.kind).toBe("contact");
    expect(req?.details.role).toBe("parent");
  });

  test("contact without phone or email shows an error and sends nothing", async ({ page, api }) => {
    const name = `E2E No Contact ${unique()}`;
    await page.goto("/contact");
    await page.locator("#f-role").selectOption("photographer");
    await page.locator("#f-name").fill(name);
    await page.locator("#f-message").fill("No way to reach me.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Give us an email or a phone number so we can reach you.")).toBeVisible();
    await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
    expect(await findRequests(api, name)).toHaveLength(0);
    // What the visitor typed must still be there so they can just add an email.
    await expect(page.locator("#f-name")).toHaveValue(name);
    await expect(page.locator("#f-message")).toHaveValue("No way to reach me.");
  });

  test("book a demo → demo request with market, volume and slot", async ({ page, api }) => {
    const studio = `E2E Demo Studio ${unique()}`;
    await page.goto("/demo");
    await page.locator("#f-name").fill("Nodira Tester");
    await page.locator("#f-studio").fill(studio);
    await page.locator("#f-email").fill(`demo-${unique()}@example.com`);
    await page.locator("#f-market").selectOption("schools");
    await page.locator("#f-volume").selectOption("50-150k");
    // exact: the fieldset "Pick a 30-minute slot (your time zone)" would also match "Time".
    await page.getByRole("group", { name: "Day", exact: true }).getByRole("button").nth(1).click();
    const time = page.getByRole("group", { name: "Time", exact: true }).getByRole("button").first();
    await time.click();
    await expect(time).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Book my demo" }).click();
    await expect(page.getByText("Your demo is booked")).toBeVisible();

    const [req] = await findRequests(api, studio);
    expect(req?.kind).toBe("demo");
    expect(req?.details.market).toBe("schools");
    expect(req?.details.volume).toBe("50-150k");
    expect(req?.details.slot).toBeTruthy();
  });

  test("switch → migration request", async ({ page, api }) => {
    const studio = `E2E Switch Studio ${unique()}`;
    await page.goto("/switch");
    await page.locator("#f-name").fill("Bekzod Tester");
    await page.locator("#f-email").fill(`switch-${unique()}@example.com`);
    await page.locator("#f-studio").fill(studio);
    await page.locator("#f-current").selectOption("paper");
    await page.locator("#f-jobs").fill("12");
    await page.getByRole("button", { name: "Plan my free migration" }).click();
    await expect(page.getByText(/migration specialist will email you/)).toBeVisible();

    const [req] = await findRequests(api, studio);
    expect(req?.kind).toBe("switch");
    expect(req?.details.current).toBe("paper");
    expect(req?.details.jobsPerYear).toBe("12");
  });

  test("about page contact form → contact request", async ({ page, api }) => {
    const studio = `E2E About Studio ${unique()}`;
    await page.goto("/about");
    await page.locator("#f-name").fill("Laylo Tester");
    await page.locator("#f-email").fill(`about-${unique()}@example.com`);
    await page.locator("#f-studio").fill(studio);
    await page.locator("#f-message").fill("Hello from the about page.");
    await page.getByRole("button", { name: "Send message" }).click();
    await expect(page.getByText("Thanks — we'll reply within one business day.")).toBeVisible();

    const [req] = await findRequests(api, studio);
    expect(req?.kind).toBe("contact");
    expect(req?.company).toBe(studio);
  });

  test("data request → data_request with the request type", async ({ page, api }) => {
    const name = `E2E Data Person ${unique()}`;
    await page.goto("/data-request");
    await page.locator("#f-name").fill(name);
    await page.locator("#f-email").fill(`data-${unique()}@example.com`);
    await page.locator("#f-type").selectOption("access");
    await page.locator("#f-child").fill("Ava Martinez, Maple Grove");
    await page.getByRole("button", { name: "Submit request" }).click();
    await expect(page.getByText(/Request received/).first()).toBeVisible();

    const [req] = await findRequests(api, name);
    expect(req?.kind).toBe("data_request");
    expect(req?.details.type).toBe("access");
    expect(req?.details.child).toBe("Ava Martinez, Maple Grove");
  });

  test("newsletter signup shows the success message", async ({ page }) => {
    await page.goto("/");
    await page.locator("#newsletter-email").fill(`news-${unique()}@example.com`);
    await page.getByRole("button", { name: "Subscribe" }).click();
    await expect(page.getByText("You're subscribed. One useful email a month, no fluff.")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Content
// ---------------------------------------------------------------------------

test.describe("content", () => {
  test("blog list → article → related post", async ({ page }) => {
    await page.goto("/blog");
    const firstPost = page.getByRole("main").locator('a[href^="/blog/"]').first();
    const href = await firstPost.getAttribute("href");
    await firstPost.click();
    await expect(page).toHaveURL(new RegExp(`${href}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const related = page.getByRole("region", { name: "Related posts" }).or(page.locator("section[aria-labelledby='related-heading']"));
    await expect(related.first()).toBeVisible();
    const next = related.first().locator('a[href^="/blog/"]').first();
    const nextHref = await next.getAttribute("href");
    expect(nextHref).not.toBe(href);
    await next.click();
    await expect(page).toHaveURL(new RegExp(`${nextHref}$`));
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("help search finds an article and opens it", async ({ page }) => {
    await page.goto("/help");
    await page.locator("#help-q").fill("code");
    await page.locator("#help-q").press("Enter");
    await expect(page).toHaveURL(/\/help\?q=code$/);
    const result = page.getByRole("main").locator('a[href^="/help/"]').first();
    await expect(result).toBeVisible();
    await result.click();
    await expect(page).toHaveURL(/\/help\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });

  test("every legal page shows the draft banner in en, ru and uz", async ({ page }) => {
    const banner = { en: "Draft: pending legal review", ru: "Черновик: ожидает юридической проверки", uz: "Qoralama: yuridik tekshiruv kutilmoqda" };
    for (const [locale, text] of Object.entries(banner)) {
      for (const slug of ["terms", "terms-parents", "privacy", "biometrics", "cookies", "data-request"]) {
        const path = locale === "en" ? `/${slug}` : `/${locale}/${slug}`;
        const res = await page.goto(path);
        expect(res?.status(), path).toBe(200);
        await expect(page.getByText(text), path).toBeVisible();
      }
    }
  });
});

// ---------------------------------------------------------------------------
// 7. Find my photos
// ---------------------------------------------------------------------------

test.describe("find my photos", () => {
  test("entering SAMPLE takes a signed-out visitor into that album's shop flow", async ({ page }) => {
    await page.goto("/find-my-photos");
    await typeCode(page, "Album code", "SAMPLE");
    await page.getByRole("button", { name: "View my photos" }).click();
    await expect(page).toHaveURL(/\/shop\/verify\?code=SAMPLE/);
  });

  test("the submit button stays disabled until all 6 characters are entered", async ({ page }) => {
    await page.goto("/find-my-photos");
    await typeCode(page, "Album code", "SAMP");
    await expect(page.getByRole("button", { name: "View my photos" })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// 8. Parent account on the main site
// ---------------------------------------------------------------------------

test.describe("parent account on the main site", () => {
  test("sign up, stay on the main site, open My account in the shop, sign out, sign in again", async ({ page }) => {
    test.slow();
    await page.setViewportSize({ width: 1280, height: 900 });
    const name = `E2E Parent ${unique()}`;
    const digits = String(Math.floor(1000 + Math.random() * 9000));
    const phone = `90 555 ${digits.slice(0, 2)} ${digits.slice(2)}`;

    // Sign up
    await page.goto("/signup");
    await page.locator("#pa-name").fill(name);
    await page.locator("#pa-phone").fill(phone);
    const firstSend = Date.now();
    await page.getByRole("button", { name: "Send my code" }).click();
    await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
    await expect(page.getByText(`+998 90 555 ${digits.slice(0, 2)} ${digits.slice(2)}`)).toBeVisible();
    await typeCode(page, "One-time code", await shownDevCode(page));

    // Stays on the main site, with a welcome note and the account in the header.
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByRole("status").filter({ hasText: `Welcome, ${name}! You're signed in.` })).toBeVisible();
    const accountButton = page.getByRole("banner").getByRole("button", { name: `Account menu: ${name}` });
    await expect(accountButton).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign up" })).toHaveCount(0);

    // My account → the shop, already signed in.
    await accountButton.click();
    await page.getByRole("menuitem", { name: "My account" }).click();
    await expect(page).toHaveURL(/\/shop\/account/);
    await expect(page.getByRole("heading", { level: 1, name: new RegExp(name.split(" ")[0]!) })).toBeVisible();

    // Back on the main site: sign out.
    await page.goto("/");
    await page.getByRole("banner").getByRole("button", { name: `Account menu: ${name}` }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
    await page.goto("/shop/account");
    await expect(page).toHaveURL(/\/shop\/signin/);

    // Sign in again with the same phone (no name field). The API allows a new code after 30 s.
    const wait = 31_000 - (Date.now() - firstSend);
    if (wait > 0) await page.waitForTimeout(wait);
    await page.goto("/signin");
    await expect(page.locator("#pa-name")).toHaveCount(0);
    await page.locator("#pa-phone").fill(phone);
    await page.getByRole("button", { name: "Send my code" }).click();
    await typeCode(page, "One-time code", await shownDevCode(page));
    await expect(page).toHaveURL(`${BASE_URL}/`);
    await expect(page.getByRole("banner").getByRole("button", { name: `Account menu: ${name}` })).toBeVisible();
  });

  test("Russian sign-up by email works end to end and stays on /ru", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const name = `Тест Родитель ${unique()}`;
    await page.goto("/ru/signup");
    expect(await htmlLang(page)).toBe("ru-RU");
    await page.locator("#pa-name").fill(name);
    await page.getByRole("radio", { name: "По email" }).click();
    await page.locator("#pa-email").fill(`ru-${unique()}@example.com`);
    await page.getByRole("button", { name: "Получить код" }).click();
    await expect(page.getByRole("heading", { name: "Введите код" })).toBeVisible();
    await typeCode(page, "Одноразовый код", await shownDevCode(page));
    await expect(page).toHaveURL(`${BASE_URL}/ru`);
    await expect(page.getByRole("status").filter({ hasText: `Добро пожаловать, ${name}!` })).toBeVisible();
    await expect(page.getByRole("banner").getByRole("button", { name: new RegExp(name) })).toBeVisible();
  });

  test("sign-up validation: name and a full phone number are required", async ({ page }) => {
    await page.goto("/signup");
    await page.getByRole("button", { name: "Send my code" }).click();
    await expect(page.getByText("Enter your name.")).toBeVisible();
    await page.locator("#pa-name").fill("Short Phone");
    await page.locator("#pa-phone").fill("90 12");
    await page.getByRole("button", { name: "Send my code" }).click();
    await expect(page.getByText("Enter your mobile number, like 90 123 45 67.")).toBeVisible();
  });

  test("a wrong one-time code is rejected", async ({ page }) => {
    await page.goto("/signin");
    await page.getByRole("radio", { name: "Email me" }).click();
    await page.locator("#pa-email").fill(`wrong-${unique()}@example.com`);
    await page.getByRole("button", { name: "Send my code" }).click();
    const real = await shownDevCode(page);
    const wrong = real === "000000" ? "111111" : "000000";
    await typeCode(page, "One-time code", wrong);
    // (Next.js adds its own empty role=alert route announcer, so match the message.)
    await expect(page.getByRole("alert").filter({ hasText: /code|attempt/i })).toBeVisible();
    await expect(page).toHaveURL(/\/signin$/);
  });
});

// ---------------------------------------------------------------------------
// 9. 404s and sitemap
// ---------------------------------------------------------------------------

test.describe("404 and sitemap", () => {
  test("unknown URLs return 404 with a localized page (en, ru)", async ({ page }) => {
    const en = await page.goto("/this-page-does-not-exist-e2e");
    expect(en?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "We couldn't find that page" })).toBeVisible();

    const ru = await page.goto("/ru/takoy-stranitsy-net-e2e");
    expect(ru?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Мы не нашли эту страницу" })).toBeVisible();
  });

  test("sitemap.xml lists /contact with ru and uz alternates", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toMatch(/<loc>[^<]*\/contact<\/loc>/);
    expect(xml).toContain("/ru/contact");
    expect(xml).toContain("/uz/contact");
    expect(xml).toMatch(/hreflang="ru"/);
  });
});
