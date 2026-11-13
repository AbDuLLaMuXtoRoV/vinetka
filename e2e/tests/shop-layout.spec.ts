import { BASE_URL, DEMO_CODES, DEMO_IDS, expect, parentSession, setLanguage, test } from "./fixtures";

// Nothing on the parents' pages may be wider than a phone screen, in any language
// (Uzbek and Russian labels are longer than English ones). Runs on every device project.
for (const lang of ["uz", "ru", "en"] as const) {
  test(`no sideways scrolling on phone pages (${lang})`, async ({ page, context, api }) => {
    test.skip(test.info().project.name === "desktop-chrome", "Phone layouts only");
    await setLanguage(context, lang);
    const session = await parentSession(context, api, { name: "Dilnoza Karimova" });
    const P = api(session.token);

    const album = await P.store.album(DEMO_CODES.personal);
    const shop = await P.store.shop(DEMO_CODES.personal);
    const featured = shop.packages.find((p) => p.featured) ?? shop.packages[0]!;
    const line = { id: "l1", kind: "package" as const, refId: featured.id, quantity: 1, albumCode: DEMO_CODES.personal, subjectId: album.subject?.id ?? null, photoIds: [album.photos[0]!.id], customization: null };
    const newCart = async () => P.carts.update((await P.carts.create({ albumCode: DEMO_CODES.personal })).id, { items: [line] });
    const order = await P.checkout.submit({
      cartId: (await newCart()).id,
      contact: { name: "Dilnoza Karimova", email: "dilnoza@example.com", phone: null },
      delivery: { method: "home", address: { line1: "12 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" } },
      payment: { method: "card", paymentMethodId: null },
    });
    const cart = await newCart();
    await context.addCookies([{ name: "sb_cart", value: cart.id, url: BASE_URL }]);
    const customizable = shop.products.find((p) => p.customizable)!;

    const paths = [
      "/shop",
      `/shop/a/${DEMO_CODES.personal}`,
      `/shop/a/${DEMO_CODES.personal}/shop`,
      `/shop/a/${DEMO_CODES.personal}/customize/${customizable.id}`,
      "/shop/cart",
      "/shop/checkout",
      `/shop/orders/${order.orderId}`,
      "/shop/account",
      `/shop/pass/${DEMO_IDS.lumen}`,
    ];
    for (const path of paths) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }));
      expect(scrollWidth, `${path} is wider than the screen`).toBeLessThanOrEqual(clientWidth);
    }
  });
}
