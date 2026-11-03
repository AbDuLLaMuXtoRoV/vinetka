import type { ContactRequestInput, Order, SnapbellClient } from "@snapbell/sdk";
import { DEMO_CODES, unique } from "../fixtures";

type ApiFactory = (token?: string | null) => SnapbellClient;

/** The one-time token inside a setup link (…/studio/setup?token=…). */
export function setupToken(url: string): string {
  const token = new URL(url).searchParams.get("token");
  if (!token) throw new Error(`No token in setup link ${url}`);
  return token;
}

/** A contact request through the public API, as a visitor would send it from the site. */
export async function submitRequest(api: ApiFactory, over: Partial<ContactRequestInput> = {}) {
  const stamp = unique();
  const input: ContactRequestInput = {
    kind: "partner",
    name: `E2E Admin ${stamp}`,
    company: `E2E Studio ${stamp}`,
    email: `e2e-admin-${stamp}@example.com`,
    phone: "90 555 12 34",
    city: "Tashkent",
    message: `Automated admin test ${stamp}`,
    ...over,
  };
  await api().contact.submit(input);
  return { stamp, input };
}

/** A paid order of our own on the demo SAMPLE album (never touch other people's orders). */
export async function createOwnOrder(api: ApiFactory): Promise<{ order: Order; customerName: string; token: string }> {
  const stamp = unique();
  const customerName = `E2E Refund ${stamp}`;
  const destination = `e2e-refund-${stamp}@example.com`;
  const sent = await api().auth.sendOtp({ destination, channel: "email", albumCode: DEMO_CODES.personal });
  if (!sent.devCode) throw new Error("No devCode: run the API with DEMO_MODE=true.");
  const session = await api().auth.verifyOtp({ destination, code: sent.devCode, name: customerName, consent: { smsUpdates: false, marketing: false } });
  const client = api(session.token);
  const album = await client.store.album(DEMO_CODES.personal);
  const shop = await client.store.shop(DEMO_CODES.personal);
  const product = shop.products.find((p) => p.category === "print") ?? shop.products[0]!;
  let cart = await client.carts.create({ albumCode: DEMO_CODES.personal });
  cart = await client.carts.update(cart.id, {
    items: [
      {
        id: `e2e-${stamp}`,
        kind: "product",
        refId: product.id,
        quantity: 2,
        albumCode: DEMO_CODES.personal,
        subjectId: album.subject?.id ?? null,
        photoIds: [album.photos[0]!.id],
        customization: null,
      },
    ],
    deliveryMethod: "home",
  });
  const result = await client.checkout.submit({
    cartId: cart.id,
    contact: { name: customerName, email: destination, phone: null },
    delivery: { method: "home", address: { line1: "12 Alder St", line2: null, city: "Portland", state: "OR", postalCode: "97204", country: "US" } },
    payment: { method: "card", paymentMethodId: null },
  });
  return { order: await client.orders.get(result.orderId), customerName, token: session.token };
}
