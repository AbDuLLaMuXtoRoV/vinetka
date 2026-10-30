"use server";

import {
  ApiError,
  isCodeFormat,
  normalizeCode,
  type AccountSummary,
  type AlbumPhoto,
  type Cart,
  type CartItem,
  type CartItemInput,
  type CheckoutInput,
  type CheckoutResult,
  type Contact,
  type DeliveryMethod,
  type MessageChannel,
  type OtpSendResult,
  type Parent,
  type Pass,
  type StudioBranding,
} from "@snapbell/sdk";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ALBUM_COOKIE, CART_COOKIE, PARENT_COOKIE, api, cookieOptions, safeNext } from "@/lib/api";
import { getLocale } from "@/lib/i18n";
import { serverMsgs } from "@/messages/server";

/** Fallback messages in the parent's language; API errors already arrive localized. */
async function errorText() {
  return serverMsgs[await getLocale()].errors;
}

export type ActionFailure = {
  ok: false;
  code: string;
  message: string;
  publishAt?: string | null;
  studio?: StudioBranding | null;
};
export type ActionResult<T> = { ok: true; data: T } | ActionFailure;

async function fail(e: unknown): Promise<ActionFailure> {
  const t = await errorText();
  if (e instanceof ApiError) {
    if (e.status === 401) return { ok: false, code: "unauthorized", message: t.sessionExpired };
    if (e.status === 429) return { ok: false, code: "rate_limited", message: e.message || t.tooMany };
    return {
      ok: false,
      code: e.code,
      message: e.message || t.generic,
      publishAt: e.body?.publishAt ?? null,
      studio: e.body?.studio ?? null,
    };
  }
  return { ok: false, code: "unavailable", message: t.unavailable };
}

// --- Code entry and verification ----------------------------------------------

export async function recognizeCode(raw: string): Promise<ActionResult<{ code: string; branding: StudioBranding; next: string }>> {
  const code = normalizeCode(raw);
  if (!isCodeFormat(code)) return { ok: false, code: "invalid_code", message: (await errorText()).codeFormat };
  try {
    const branding = await (await api()).store.branding(code);
    const jar = await cookies();
    jar.set(ALBUM_COOKIE, code, cookieOptions(90));
    const signedIn = Boolean(jar.get(PARENT_COOKIE)?.value);
    return { ok: true, data: { code, branding, next: signedIn ? `/a/${code}` : `/verify?code=${code}` } };
  } catch (e) {
    return fail(e);
  }
}

export async function notifyWhenReady(code: string, destination: string): Promise<ActionResult<true>> {
  try {
    await (await api()).store.notifyMe(normalizeCode(code), { destination });
    return { ok: true, data: true };
  } catch (e) {
    return fail(e);
  }
}

export async function sendCode(destination: string, channel: MessageChannel, albumCode?: string): Promise<ActionResult<OtpSendResult>> {
  try {
    const res = await (await api()).auth.sendOtp({ destination, channel, albumCode: albumCode || undefined });
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function verifyCode(input: {
  destination: string;
  code: string;
  consent: { smsUpdates: boolean; marketing: boolean };
  albumCode?: string;
  next?: string;
}): Promise<ActionFailure> {
  try {
    const session = await (await api()).auth.verifyOtp({ destination: input.destination, code: input.code, consent: input.consent });
    const jar = await cookies();
    jar.set(PARENT_COOKIE, session.token, cookieOptions(90));
    if (input.albumCode) jar.set(ALBUM_COOKIE, normalizeCode(input.albumCode), cookieOptions(90));
  } catch (e) {
    return fail(e);
  }
  redirect(safeNext(input.next) ?? (input.albumCode ? `/a/${normalizeCode(input.albumCode)}` : "/account"));
}

export async function signOut(): Promise<void> {
  const jar = await cookies();
  jar.delete(PARENT_COOKIE);
  jar.delete(CART_COOKIE);
  jar.delete(ALBUM_COOKIE);
  redirect("/");
}

// --- Album ------------------------------------------------------------------------

export async function saveFavorites(code: string, photoIds: string[]): Promise<ActionResult<string[]>> {
  try {
    const res = await (await api()).store.setFavorites(code, { photoIds });
    return { ok: true, data: res.favorites };
  } catch (e) {
    return fail(e);
  }
}

export async function searchBySelfie(code: string, imageBase64: string): Promise<ActionResult<AlbumPhoto[]>> {
  try {
    const res = await (await api()).store.findMe(code, { imageBase64, consent: true });
    return { ok: true, data: res.photos };
  } catch (e) {
    return fail(e);
  }
}

export async function addToMyAlbum(code: string, photoIds: string[]): Promise<ActionResult<true>> {
  try {
    await (await api()).store.addPhotos(code, { photoIds });
    revalidatePath(`/a/${code}`, "layout");
    return { ok: true, data: true };
  } catch (e) {
    return fail(e);
  }
}

// --- Cart ---------------------------------------------------------------------------

export type NewCartItem = Omit<CartItemInput, "id">;

function toInput(i: CartItem): CartItemInput {
  return {
    id: i.id,
    kind: i.kind,
    refId: i.refId,
    quantity: i.quantity,
    albumCode: i.albumCode,
    subjectId: i.subjectId,
    photoIds: i.photoIds,
    customization: i.customization,
  };
}

function sameLine(a: CartItemInput, b: NewCartItem): boolean {
  return (
    a.kind === b.kind &&
    a.refId === b.refId &&
    a.albumCode === b.albumCode &&
    !a.customization &&
    !b.customization &&
    a.photoIds.join() === b.photoIds.join()
  );
}

/**
 * Adds (or, with `replaceId`, replaces) a line. Identical uncustomized lines merge
 * by quantity. Siblings from another album of the same studio share the cart; an
 * album from a different studio starts a new one.
 */
export async function addToCart(
  input: NewCartItem,
  opts: { then?: "cart" | "checkout"; replaceId?: string } = {},
): Promise<ActionResult<{ count: number; newCart: boolean }>> {
  let count = 0;
  let newCart = false;
  try {
    const client = await api();
    const jar = await cookies();
    const cartId = jar.get(CART_COOKIE)?.value;
    let cart: Cart | null = null;
    if (cartId) cart = await client.carts.get(cartId).catch(() => null);
    if (!cart) {
      cart = await client.carts.create({ albumCode: input.albumCode });
      jar.set(CART_COOKIE, cart.id, cookieOptions(30));
    }

    let items = cart.items.map(toInput);
    if (opts.replaceId) {
      items = items.map((i) => (i.id === opts.replaceId ? { ...input, id: i.id } : i));
    } else {
      const match = items.find((i) => sameLine(i, input));
      items = match
        ? items.map((i) => (i === match ? { ...i, quantity: i.quantity + input.quantity } : i))
        : [...items, { ...input, id: crypto.randomUUID() }];
    }

    try {
      cart = await client.carts.update(cart.id, { items });
    } catch (e) {
      if (!(e instanceof ApiError) || e.status >= 500 || cart.items.length === 0) throw e;
      // Different studio: start a fresh cart for this album.
      cart = await client.carts.create({ albumCode: input.albumCode });
      cart = await client.carts.update(cart.id, { items: [{ ...input, id: crypto.randomUUID() }] });
      jar.set(CART_COOKIE, cart.id, cookieOptions(30));
      newCart = true;
    }
    count = cart.items.reduce((n, i) => n + i.quantity, 0);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  if (opts.then) redirect(opts.then === "checkout" ? "/checkout" : "/cart");
  return { ok: true, data: { count, newCart } };
}

export async function updateCartItems(items: CartItemInput[]): Promise<ActionResult<Cart>> {
  try {
    const id = (await cookies()).get(CART_COOKIE)?.value;
    if (!id) return { ok: false, code: "no_cart", message: (await errorText()).cartExpired };
    const cart = await (await api()).carts.update(id, { items });
    revalidatePath("/", "layout");
    return { ok: true, data: cart };
  } catch (e) {
    return fail(e);
  }
}

export async function updateCart(patch: { promoCode?: string | null; deliveryMethod?: DeliveryMethod; postalCode?: string }): Promise<ActionResult<Cart>> {
  try {
    const id = (await cookies()).get(CART_COOKIE)?.value;
    if (!id) return { ok: false, code: "no_cart", message: (await errorText()).cartExpired };
    const cart = await (await api()).carts.update(id, patch);
    return { ok: true, data: cart };
  } catch (e) {
    return fail(e);
  }
}

// --- Checkout ----------------------------------------------------------------------

async function clearCart() {
  (await cookies()).delete(CART_COOKIE);
  revalidatePath("/", "layout");
}

/**
 * Places the order. When it is paid outright this redirects to the order page
 * (re-rendering /checkout with an emptied cart would bounce to /cart instead).
 * Only `requires_action` (3-D Secure) and failures come back to the browser.
 */
export async function submitCheckout(input: Omit<CheckoutInput, "cartId">): Promise<ActionResult<CheckoutResult>> {
  let res: CheckoutResult;
  try {
    const cartId = (await cookies()).get(CART_COOKIE)?.value;
    if (!cartId) return { ok: false, code: "no_cart", message: (await errorText()).cartExpired };
    res = await (await api()).checkout.submit({ ...input, cartId });
  } catch (e) {
    return fail(e);
  }
  if (res.status !== "paid") return { ok: true, data: res };
  await clearCart();
  redirect(`/orders/${res.orderId}?placed=1`);
}

/** After 3-D Secure succeeds in the browser. Redirects to the order page once paid. */
export async function confirmCheckout(orderId: string): Promise<ActionResult<CheckoutResult>> {
  let res: CheckoutResult;
  try {
    res = await (await api()).checkout.confirm(orderId);
  } catch (e) {
    return fail(e);
  }
  if (res.status !== "paid") return { ok: false, code: "payment_incomplete", message: (await errorText()).paymentIncomplete };
  await clearCart();
  redirect(`/orders/${res.orderId}?placed=1`);
}

export async function reorder(orderId: string): Promise<ActionFailure> {
  try {
    const client = await api();
    const order = await client.orders.get(orderId);
    for (const item of order.items) {
      const res = await addToCart({
        kind: item.kind,
        refId: item.refId,
        quantity: item.quantity,
        albumCode: item.albumCode,
        subjectId: item.subjectId,
        photoIds: item.photoIds,
        customization: item.customization,
      });
      if (!res.ok) return res;
    }
  } catch (e) {
    return fail(e);
  }
  redirect("/cart");
}

// --- Account -------------------------------------------------------------------------

export async function updateAccount(patch: {
  notifications?: Parent["notifications"];
  consent?: Partial<Parent["consent"]>;
  name?: string;
}): Promise<ActionResult<Parent>> {
  try {
    const parent = await (await api()).account.update(patch);
    return { ok: true, data: parent };
  } catch (e) {
    return fail(e);
  }
}

export async function requestDataExport(): Promise<ActionResult<{ requestedAt: string; deliverTo: string }>> {
  try {
    return { ok: true, data: await (await api()).account.requestExport() };
  } catch (e) {
    return fail(e);
  }
}

export async function requestDeletion(): Promise<ActionResult<{ requestedAt: string; completesBy: string }>> {
  try {
    return { ok: true, data: await (await api()).account.requestDeletion() };
  } catch (e) {
    return fail(e);
  }
}

export async function loadAccount(): Promise<ActionResult<AccountSummary>> {
  try {
    return { ok: true, data: await (await api()).account.get() };
  } catch (e) {
    return fail(e);
  }
}

// --- Picture Day Pass --------------------------------------------------------------------

export async function buyPass(offerId: string, amountCents: number, contact: Contact): Promise<ActionResult<{ pass: Pass; clientSecret: string | null }>> {
  try {
    return { ok: true, data: await (await api()).passes.buy({ offerId, amountCents, contact }) };
  } catch (e) {
    return fail(e);
  }
}
