import { BASE_URL, DEMO_CODES, expect, fixture, parentSession, setLanguage, test, unique } from "./fixtures";
import { addFirstPackage, allowSecureCookiesOverHttp, completeOneTimeCode, enterAlbumCode, fillCheckout, payButton, placeOrderViaApi, randomPhone, ready } from "./helpers/shop";

// Family Store (/shop): every parent-facing function, on desktop Chrome, an Android
// phone and an iPhone. Each test creates its own parent and cart.
test.describe.configure({ mode: "parallel" });

test.beforeEach(async ({ context, browserName }) => {
  if (browserName === "webkit" && BASE_URL.startsWith("http://")) await allowSecureCookiesOverHttp(context, BASE_URL);
});

// ---------------------------------------------------------------------------
// 1. Code entry
// ---------------------------------------------------------------------------

test.describe("1. code entry", () => {
  test("an unknown code shows an error", async ({ page }) => {
    await page.goto("/shop");
    await enterAlbumCode(page, "ZZZZZ9");
    await expect(page.getByRole("alert").filter({ hasText: "We couldn't find that code" })).toBeVisible();
  });

  test("an expired album says it has closed", async ({ page }) => {
    await page.goto("/shop");
    await enterAlbumCode(page, DEMO_CODES.expired);
    await expect(page.getByText("This album has closed")).toBeVisible();
  });

  test("an unpublished album shows the date and accepts 'notify me'", async ({ page }) => {
    await page.goto("/shop");
    await enterAlbumCode(page, DEMO_CODES.notPublished);
    await expect(page.getByText("Photos aren't ready yet")).toBeVisible();
    await expect(page.getByText(/will publish this album on .+/)).toBeVisible();
    await page.locator("#notify-dest").fill(`notify-${unique()}@example.com`);
    await page.getByRole("button", { name: "Notify me" }).click();
    await expect(page.getByText("We'll let you know the moment they're ready.")).toBeVisible();
  });

  test("a whole code inserted at once (paste / SMS autofill) is accepted", async ({ page }) => {
    // iOS fills one-time codes from SMS in one go; the boxes must split it.
    await page.goto("/shop");
    await ready(page);
    // "networkidle" doesn't mean React has hydrated; under load WebKit can get the paste
    // before the boxes are interactive. Repeat the paste until they are; the assertion
    // (the whole code split across all six boxes) is unchanged.
    await expect(async () => {
      await page.getByLabel("Album code, character 1 of 6").fill("ZZZZZ9");
      await expect(page.getByLabel("Album code, character 6 of 6")).toHaveValue("9", { timeout: 2_000 });
    }).toPass({ timeout: 20_000 });
    await expect(page.getByRole("alert").filter({ hasText: "We couldn't find that code" })).toBeVisible();
  });

  test("a valid code without a session asks to verify", async ({ page }) => {
    await page.goto("/shop");
    await enterAlbumCode(page, DEMO_CODES.personal);
    await expect(page).toHaveURL(/\/shop\/verify\?code=SAMPLE/);
    await expect(page.getByRole("heading", { name: "Quick check that it's you" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 2. Full parent flow: verify → album → favorites → viewer
// ---------------------------------------------------------------------------

test.describe("2. album", () => {
  test("verify by phone, then album, filters, favorites and viewer", async ({ page }) => {
    await page.goto(`/shop/verify?code=${DEMO_CODES.personal}`);
    await completeOneTimeCode(page, { phone: randomPhone() });
    await expect(page).toHaveURL(/\/shop\/a\/SAMPLE$/);

    // Header: child and deadline countdown.
    await expect(page.getByRole("heading", { level: 1, name: "Ava Martinez" })).toBeVisible();
    await expect(page.getByText(/(days?|hours?) left to order/)).toBeVisible();

    // Filter chip narrows the grid.
    const grid = page.getByRole("list", { name: "Photos" });
    const all = await grid.getByRole("listitem").count();
    expect(all).toBeGreaterThan(1);
    await page.getByRole("toolbar", { name: "Filter photos" }).getByRole("button", { name: "Classic", exact: true }).click();
    await expect(grid.getByRole("listitem")).toHaveCount(1);
    await page.getByRole("toolbar", { name: "Filter photos" }).getByRole("button", { name: /^All/ }).click();
    await expect(grid.getByRole("listitem")).toHaveCount(all);

    // Favorite heart toggles and survives a reload.
    const heart = page.getByRole("button", { name: "Add Classic 1 to favorites" });
    await heart.click();
    const saved = page.getByRole("button", { name: "Remove Classic 1 from favorites" });
    await expect(saved).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText(/1\s*favorite saved/)).toBeVisible();
    await page.waitForTimeout(800); // let the save request finish before reloading
    await page.reload();
    await expect(page.getByRole("button", { name: "Remove Classic 1 from favorites" })).toHaveAttribute("aria-pressed", "true");

    // Viewer: open, move to the next photo, "Use in a product".
    await page.getByRole("button", { name: "Open Classic 1" }).click();
    const viewer = page.getByRole("dialog", { name: new RegExp(`Photo 1 of ${all}`) });
    await expect(viewer).toBeVisible();
    await expect(viewer.getByText(`1 / ${all}`)).toBeVisible();
    await page.keyboard.press("ArrowRight");
    await expect(page.getByRole("dialog").getByText(`2 / ${all}`)).toBeVisible();
    await page.getByRole("link", { name: "Use in a product" }).click();
    await expect(page).toHaveURL(/\/shop\/a\/SAMPLE\/shop\?photo=/);
  });
});

// ---------------------------------------------------------------------------
// 3. Shop
// ---------------------------------------------------------------------------

test.describe("3. shop", () => {
  test("suggested bundle, packages with savings, single products, add a package", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Shop Parent" });
    await page.goto(`/shop/a/${DEMO_CODES.personal}/shop`);
    await expect(page.getByRole("heading", { name: "Shop Ava's photos" })).toBeVisible();

    // Suggested / most popular bundle with a price and savings.
    const bundle = page.locator("section[aria-labelledby='bundle-title']");
    await expect(bundle.getByText(/Most popular|Built from your favorites/)).toBeVisible();
    await expect(bundle.getByRole("button", { name: "Buy this bundle" })).toBeVisible();
    await expect(bundle.getByText(/Save \$/)).toBeVisible();

    // Packages and single products by category.
    await expect(page.getByRole("heading", { name: "Packages" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Choose photo" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Prints" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Digital" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Digital" }).getByText("Download All", { exact: true })).toBeVisible();

    // Add a package through the photo picker.
    await page.getByRole("button", { name: "Choose photo" }).first().click();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await sheet.getByRole("button", { name: /^Add to cart · \$/ }).click();
    await expect(page.getByText("Added to cart").first()).toBeVisible();
    await page.goto("/shop/cart");
    await expect(page.getByRole("region", { name: "Items for Ava Martinez" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. Customize a print
// ---------------------------------------------------------------------------

test.describe("4. customize", () => {
  test("8×10 print: zoom, retouch, name text, live preview, add to cart at the right price", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Custom Parent" });
    await page.goto(`/shop/a/${DEMO_CODES.personal}/shop`);
    await page.getByRole("listitem").filter({ hasText: "8×10 Print" }).getByRole("link", { name: "Customize" }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: "8×10 Print" })).toBeVisible();

    const add = page.getByRole("button", { name: /^Add to cart · \$/ });
    await expect(add).toHaveText(/\$22\.00/);

    // Crop: zoom with the slider (keyboard works on every device).
    await page.getByRole("tab", { name: "Crop" }).click();
    const zoom = page.getByRole("slider", { name: "Zoom" });
    await zoom.focus();
    await page.keyboard.press("ArrowRight");
    await expect(zoom).toHaveAttribute("aria-valuetext", "105%");

    // Style: retouch add-on raises the price by $8.
    await page.getByRole("tab", { name: "Style" }).click();
    await page.getByRole("switch", { name: /Retouch/ }).click();
    await expect(add).toHaveText(/\$30\.00/);

    // Name text appears in the live preview.
    await page.getByRole("tab", { name: "Name" }).click();
    await page.locator("#name-text").fill("Ava 2-A");
    await expect(page.getByRole("img", { name: "Drag to reposition the photo" })).toContainText("Ava 2-A");

    await add.click();
    await expect(page).toHaveURL(/\/shop\/cart$/);
    const line = page.getByRole("listitem").filter({ hasText: "8×10 Print" });
    await expect(line.getByText("Customized · «Ava 2-A» · Retouch")).toBeVisible();
    await expect(line.getByText("$30.00")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 5. Cart
// ---------------------------------------------------------------------------

test.describe("5. cart", () => {
  test("siblings in one cart, quantity, remove, promo codes", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Cart Parent" });
    await addFirstPackage(page, DEMO_CODES.personal);
    await addFirstPackage(page, DEMO_CODES.sibling);

    await page.goto("/shop/cart");
    const ava = page.getByRole("region", { name: "Items for Ava Martinez" });
    const leo = page.getByRole("region", { name: "Items for Leo Martinez" });
    await expect(ava).toBeVisible();
    await expect(leo).toBeVisible();

    // Quantity up changes the line total.
    const avaLine = ava.getByRole("listitem").first();
    const before = await avaLine.locator("p.font-medium.tabular-nums").textContent();
    await ava.getByRole("button", { name: "Increase quantity" }).first().click();
    await expect(ava.getByRole("group").first().getByText("2", { exact: true })).toBeVisible();
    await expect(avaLine.locator("p.font-medium.tabular-nums")).not.toHaveText(before!);

    // An invalid promo shows an error; FALL10 applies a discount.
    await page.locator("#promo").fill("NOPE99");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.locator("#promo-error")).toBeVisible();
    await page.locator("#promo").fill("FALL10");
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText("FALL10", { exact: true })).toBeVisible();
    await expect(page.getByText("Discount (FALL10)")).toBeVisible();

    // Remove Leo's line.
    await leo.getByRole("button", { name: /^Remove / }).first().click();
    await expect(page.getByRole("region", { name: "Items for Leo Martinez" })).toHaveCount(0);
    await expect(ava).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 6. Checkout
// ---------------------------------------------------------------------------

test.describe("6. checkout", () => {
  test("home delivery with the test card → confirmation and timeline", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Checkout Parent" });
    await addFirstPackage(page, DEMO_CODES.personal);
    await page.goto("/shop/checkout");
    await page.getByRole("radio", { name: /Ship to home/ }).click();
    await fillCheckout(page, { name: "Elena Testova" });
    await payButton(page).click();

    // ?placed=1 is tidied out of the address bar once the confirmation loads.
    await expect(page).toHaveURL(/\/shop\/orders\/ord_[^/?]+/);
    await expect(page.getByRole("heading", { name: "Thank you, Elena!" })).toBeVisible();
    await expect(page.getByText(/Order\s+SB-\d+/)).toBeVisible();
    for (const step of ["Paid", "At the lab", "Shipped", "Delivered"]) {
      await expect(page.getByText(step, { exact: false }).filter({ visible: true }).first()).toBeVisible();
    }
  });

  test("school pickup for the Maple job", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Pickup Parent" });
    await addFirstPackage(page, DEMO_CODES.personal);
    await page.goto("/shop/checkout");
    await page.getByRole("radio", { name: /School pickup/ }).click();
    await expect(page.locator("#co-line1")).toHaveCount(0);
    await fillCheckout(page, { name: "Pat Pickup", home: false });
    await payButton(page).click();
    // ?placed=1 is tidied out of the address bar once the confirmation loads.
    await expect(page).toHaveURL(/\/shop\/orders\/ord_[^/?]+/);
    await expect(page.getByText("Delivering to school")).toBeVisible();
  });

  test("3-D Secure: confirm with the bank, then paid", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Secure Parent" });
    await addFirstPackage(page, DEMO_CODES.personal);
    await page.goto("/shop/checkout");
    await page.getByRole("radio", { name: /Ship to home/ }).click();
    await fillCheckout(page, { name: "Sam Secure", email: `e2e+3ds-${unique()}@example.com` });
    await payButton(page).click();
    const bank = page.getByRole("dialog", { name: "Confirm with your bank" });
    await expect(bank).toBeVisible();
    await bank.getByRole("button", { name: "Approve payment" }).click();
    // ?placed=1 is tidied out of the address bar once the confirmation loads.
    await expect(page).toHaveURL(/\/shop\/orders\/ord_[^/?]+/);
    await expect(page.getByRole("heading", { name: "Thank you, Sam!" })).toBeVisible();
  });

  test("a form error keeps the cart and the typed values", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Error Parent" });
    await addFirstPackage(page, DEMO_CODES.personal);
    await page.goto("/shop/checkout");
    await page.getByRole("radio", { name: /Ship to home/ }).click();
    await page.locator("#co-email").fill("kept@example.com");
    await payButton(page).click();
    await expect(page.getByText("Please check the highlighted fields.")).toBeVisible();
    await expect(page.locator("#co-email")).toHaveValue("kept@example.com");
    await expect(page).toHaveURL(/\/shop\/checkout$/);
    await page.goto("/shop/cart");
    await expect(page.getByRole("region", { name: "Items for Ava Martinez" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 7. Account
// ---------------------------------------------------------------------------

test.describe("7. account", () => {
  test("orders, notification switches, language, data export and delete dialog", async ({ page, context, api }) => {
    const session = await parentSession(context, api, { name: "Account Parent" });
    const order = await placeOrderViaApi(api(session.token));

    await page.goto("/shop/account");
    await expect(page.getByRole("heading", { level: 1, name: "Hi, Account" })).toBeVisible();
    await expect(page.getByRole("region", { name: "Orders" }).getByText(order.number)).toBeVisible();

    // A notification switch persists after reload.
    const reminders = page.getByRole("switch", { name: "Ordering deadline reminders" });
    await expect(reminders).toHaveAttribute("aria-checked", "true");
    await reminders.click();
    await expect(reminders).toHaveAttribute("aria-checked", "false");
    await page.waitForTimeout(800);
    await page.reload();
    await expect(page.getByRole("switch", { name: "Ordering deadline reminders" })).toHaveAttribute("aria-checked", "false");

    // Data export confirmation.
    await page.getByRole("button", { name: "Download my data" }).click();
    await expect(page.getByText("Export requested")).toBeVisible();

    // Delete dialog can be cancelled.
    await page.getByRole("button", { name: "Delete my data" }).click();
    const dialog = page.getByRole("dialog", { name: "Delete your data?" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Keep my data" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByRole("button", { name: "Delete my data" })).toBeEnabled();

    // Language select switches the store to Russian.
    await page.getByRole("region", { name: "Language" }).getByRole("combobox").selectOption("ru");
    await expect(page.locator("html")).toHaveAttribute("lang", "ru-RU");
    await expect(page.getByRole("heading", { level: 1, name: /Account/ })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 8. Find Me (selfie search)
// ---------------------------------------------------------------------------

test.describe("8. find me", () => {
  test("consent → selfie upload → results → add to my album", async ({ page, context, api }) => {
    await parentSession(context, api, { name: "Selfie Parent" });
    await page.goto(`/shop/a/${DEMO_CODES.team}`);
    await page.getByRole("link", { name: /Find your child with a selfie/ }).click();
    await expect(page).toHaveURL(/\/shop\/a\/EAGLES\/find-me/);

    const go = page.getByRole("button", { name: "Continue" });
    await expect(go).toBeDisabled();
    await page.getByRole("checkbox").click();
    await go.click();

    await page.locator('input[type="file"]').setInputFiles(fixture("selfie.jpg"));
    await expect(page.getByRole("heading", { name: /We found \d+ photos?/ })).toBeVisible();
    const firstMatch = await page.getByRole("button", { name: "Select Match 1" }).locator("img").getAttribute("src");
    const matchedId = /\/media\/([^/]+)\//.exec(firstMatch ?? "")?.[1];
    expect(matchedId).toBeTruthy();

    await page.getByRole("button", { name: /^Add \d+ to my album$/ }).click();
    await expect(page).toHaveURL(/\/shop\/a\/EAGLES$/);
    // Find Me results are shown first in a team album.
    const firstTile = page.getByRole("list", { name: "Photos" }).locator("img").first();
    await expect(firstTile).toHaveAttribute("src", new RegExp(`/media/${matchedId}/`));
  });
});

// ---------------------------------------------------------------------------
// 9. Picture Day Pass
// ---------------------------------------------------------------------------

test.describe("9. picture day pass", () => {
  test("choose an amount, pay, get the confirmation", async ({ page }) => {
    await page.goto("/shop/pass/job_lumen_recital");
    await ready(page);
    const amounts = page.getByRole("radiogroup", { name: "Credit amount" }).getByRole("radio");
    expect(await amounts.count()).toBeGreaterThan(1);
    await amounts.nth(1).click();
    await page.locator("#pass-name").fill("Pass Parent");
    await page.locator("#pass-email").fill(`pass-${unique()}@example.com`);
    await page.locator("#pass-phone").fill(randomPhone());
    await page.getByRole("button", { name: /^Pay \$/ }).click();
    await expect(page.getByRole("heading", { name: "You're all set!" })).toBeVisible();
    await expect(page.getByText(/of credit for Lumen Dance Academy/)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 10. Sign up, sign in, gating, ?lang
// ---------------------------------------------------------------------------

test.describe("10. accounts and language links", () => {
  test("sign up with name and phone", async ({ page }) => {
    await page.goto("/shop/signup");
    await ready(page);
    await page.locator("#signup-name").fill("Nodira Saidova");
    await completeOneTimeCode(page, { phone: randomPhone() });
    await expect(page).toHaveURL(/\/shop\/account/);
    await expect(page.getByRole("heading", { level: 1, name: "Hi, Nodira" })).toBeVisible();
  });

  test("sign in as an existing parent with email", async ({ page, api }) => {
    const email = `signin-${unique()}@example.com`;
    const anon = api();
    const sent = await anon.auth.sendOtp({ destination: email, channel: "email" });
    await anon.auth.verifyOtp({ destination: email, code: sent.devCode!, name: "Bekzod Aliyev", consent: { smsUpdates: false, marketing: false } });

    await page.goto("/shop/signin");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await completeOneTimeCode(page, { email });
    await expect(page).toHaveURL(/\/shop\/account/);
    await expect(page.getByRole("heading", { level: 1, name: "Hi, Bekzod" })).toBeVisible();
  });

  test("signed out, /shop/account goes to sign in with next", async ({ page }) => {
    await page.goto("/shop/account");
    await expect(page).toHaveURL(/\/shop\/signin\?next=%2Fshop%2Faccount/);
  });

  test("?lang=uz switches the store to Uzbek", async ({ page, browserName }) => {
    test.skip(
      browserName === "webkit" && BASE_URL.startsWith("http://"),
      "The language cookie is set on a redirect with the Secure flag; WebKit can't keep it over plain HTTP and Playwright can't rewrite redirects. Real iPhones use HTTPS; covered on desktop and Android.",
    );
    await page.goto("/shop?lang=uz");
    await expect(page).toHaveURL(/\/shop$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "uz-Latn-UZ");
    await expect(page.getByRole("heading", { name: "Suratga olish kuni suratlaringizni toping" })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 11. Photo protection
// ---------------------------------------------------------------------------

test.describe("11. protection", () => {
  test("album images are signed, watermarked previews and the context menu is blocked", async ({ page, context, api, request }) => {
    await parentSession(context, api, { name: "Protect Parent" });
    await page.goto(`/shop/a/${DEMO_CODES.personal}`);
    const img = page.getByRole("list", { name: "Photos" }).locator("img").first();
    const src = (await img.getAttribute("src"))!;
    expect(src).toMatch(/\/v1\/media\/[^/]+\/thumb\?.*sig=/);

    const url = new URL(src, BASE_URL).toString();
    const ok = await request.get(url);
    expect(ok.status()).toBe(200);
    expect(await ok.text()).toContain("PROOF");
    const tampered = await request.get(url.replace(/sig=[^&]+/, "sig=forged"));
    expect(tampered.status()).toBe(403);

    const blocked = await img.evaluate((el) => {
      const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
      el.dispatchEvent(ev);
      return ev.defaultPrevented;
    });
    expect(blocked).toBe(true);
    await expect(img).toHaveAttribute("draggable", "false");
  });
});

// ---------------------------------------------------------------------------
// 12. Languages
// ---------------------------------------------------------------------------

test.describe("12. languages", () => {
  for (const [locale, lang, all, shopLink, shopTitle, cartTitle] of [
    ["ru", "ru-RU", "Все", "Купить эти фото", "Заказ фото: Ava", "Корзина"],
    ["uz", "uz-Latn-UZ", "Hammasi", "Bu suratlarni xarid qilish", "Ava suratlarini xarid qilish", "Savat"],
  ] as const) {
    test(`album, shop and cart in ${locale}`, async ({ page, context, api }) => {
      await setLanguage(context, locale);
      await parentSession(context, api, { name: "Lang Parent" });
      await page.goto(`/shop/a/${DEMO_CODES.personal}`);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
      await expect(page.getByRole("toolbar").getByRole("button", { name: new RegExp(`^${all}`) })).toBeVisible();
      await expect(page.getByRole("link", { name: shopLink })).toBeVisible();

      await page.goto(`/shop/a/${DEMO_CODES.personal}/shop`);
      await expect(page.getByRole("heading", { level: 1, name: shopTitle })).toBeVisible();

      await page.goto("/shop/cart");
      await expect(page.getByRole("main").getByText(cartTitle).first()).toBeVisible();
      await expect(page.getByText("Your cart is empty")).toHaveCount(0);
    });
  }
});
