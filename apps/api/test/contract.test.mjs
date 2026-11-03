import assert from "node:assert/strict";
import { after, before, it } from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { ApiError, createClient } from "@snapbell/sdk";
import { startApi } from "./helpers.mjs";

/**
 * Drives every method of the SDK client (packages/sdk/src/client.ts) against the
 * running API, so the contract the web apps code against is proven end to end.
 */
let api;
before(async () => {
  api = await startApi();
});
after(async () => {
  await api.close();
});

const day = 86_400_000;
const future = (days) => new Date(Date.now() + days * day).toISOString();

it("implements the whole client contract", async () => {
  const anon = createClient({ baseUrl: api.base });

  // --- Staff ---------------------------------------------------------------------------
  const session = await anon.auth.login({ email: "owner@brightside.photo", password: "picture-day" });
  const staff = createClient({ baseUrl: api.base, token: session.token });
  assert.equal((await staff.auth.me()).kind, "staff");

  const magic = await anon.auth.magicLink({ email: "priya@brightside.photo" });
  const magicToken = new URL(magic.devLink).searchParams.get("token");
  assert.equal((await anon.auth.redeemMagicLink({ token: magicToken })).member.role, "admin");

  assert.equal((await staff.studio.get()).id, "stu_brightside");
  const updated = await staff.studio.update({ brandColor: "#2F6F73", completeOnboardingStep: "brand" });
  assert.ok(updated.onboarding.completed.includes("brand"));
  const home = await staff.studio.home();
  assert.ok(home.openJobs.length >= 2 && home.recentOrders.length > 0 && home.todos.length > 0);
  assert.ok((await staff.studio.members()).length >= 4);
  const { member: invitee, setupLink } = await staff.studio.invite({ email: "new.shooter@brightside.photo", name: "New Shooter", role: "photographer" });
  assert.equal(invitee.status, "invited");
  assert.match(setupLink.url, /\/setup\?token=/);
  assert.equal((await staff.studio.updateMember(invitee.id, { role: "admin" })).role, "admin");
  const freshLink = await staff.studio.memberSetupLink(invitee.id);
  const setupToken = new URL(freshLink.url).searchParams.get("token");
  assert.equal((await anon.auth.setupInfo(setupToken)).studioName, "Brightside Photo Co.");
  const shooter = await anon.auth.completeSetup({ token: setupToken, password: "shooter-password" });
  assert.equal(shooter.member.status, "active");
  assert.equal((await staff.studio.connectStripe()).studio.stripe.status, "active");

  const orgs = await staff.organizations.list();
  assert.ok(orgs.length >= 4);
  const org = await staff.organizations.create({ name: "Cedar Park Middle", type: "school", contactName: "Ms. Ito", contactEmail: "office@cedar.example", contactPhone: null, address: null });
  assert.equal((await staff.organizations.update(org.id, { contactName: "Mr. Ito" })).contactName, "Mr. Ito");
  const orgDetail = await staff.organizations.get("org_maple");
  assert.ok(orgDetail.jobs.length >= 2 && orgDetail.resultsLink.includes("/v1/results/"));
  const results = await api.call("GET", orgDetail.resultsLink);
  assert.equal(results.status, 200);

  const labs = await staff.labs.list();
  assert.equal(labs.length, 2);
  const products = await staff.labs.products("lab_cascade");
  assert.ok(products.length >= 10);

  const sheets = await staff.priceSheets.list();
  assert.ok(sheets.some((s) => s.id === "ps_fall_schools" && s.jobsUsing >= 2));
  const fall = await staff.priceSheets.get("ps_fall_schools");
  assert.ok(fall.items.length > 0 && fall.packages.length > 0);
  const sheet = await staff.priceSheets.create({ name: "Test Sheet", labId: "lab_cascade" });
  // New sheets (and the onboarding starter sheet) come with three packages, each cheaper than its items.
  assert.deepEqual(sheet.packages.map((p) => p.name), ["Essentials", "Family Favorite", "Everything"]);
  assert.equal(sheet.packages.filter((p) => p.featured).length, 1);
  for (const p of sheet.packages) {
    const separately = p.lines.reduce((sum, l) => sum + sheet.items.find((i) => i.id === l.itemId).priceCents * l.quantity, 0);
    assert.ok(p.priceCents < separately, `${p.name} should cost less than its items`);
  }
  const withPkg = await staff.priceSheets.update(sheet.id, {
    name: "Test Sheet 2",
    packages: [{ id: "", name: "Duo", description: "", priceCents: 3000, lines: [{ itemId: sheet.items[0].id, quantity: 2 }], featured: true, enabled: true }],
  });
  assert.equal(withPkg.packages.length, 1);
  assert.ok((await staff.priceSheets.duplicate(sheet.id)).name.endsWith("(copy)"));

  // --- A new job from scratch ------------------------------------------------------------------
  const job = await staff.jobs.create({
    name: "Fall Portraits",
    organizationId: org.id,
    market: "schools",
    date: future(-1),
    albumType: "personal",
    priceSheetId: "ps_fall_schools",
    shipping: { home: true, schoolPickup: true },
  });
  assert.equal(job.status, "draft");
  assert.equal((await staff.jobs.update(job.id, { deadline: future(14) })).deadline !== null, true);
  const ava = await staff.subjects.create(job.id, { firstName: "Mina", lastName: "Park", group: "Grade 6" });
  assert.match(ava.accessCode, /^[A-Z0-9]{6}$/);
  const imported = await staff.subjects.import(job.id, {
    csv: "First,Last,Homeroom\nJo,Lee,6B\n,Missing,6B\n\"Ana, Jr.\",Diaz,6C\n",
    mapping: { firstName: "First", lastName: "Last", group: "Homeroom" },
  });
  assert.deepEqual([imported.imported, imported.updated, imported.errors.length], [2, 0, 1]);
  assert.equal(imported.errors[0].row, 3);
  assert.equal((await staff.subjects.update(ava.id, { group: "Grade 7" })).group, "Grade 7");
  const regenerated = await staff.subjects.regenerateCodes(job.id, { subjectIds: [ava.id] });
  assert.notEqual(regenerated[0].accessCode, ava.accessCode);
  const roster = await staff.subjects.list(job.id);
  assert.equal(roster.length, 3);
  const extra = await staff.subjects.create(job.id, { firstName: "Tmp", lastName: "Person", group: "" });
  assert.deepEqual(await staff.subjects.remove(extra.id), { ok: true });

  // Upload two identical files: the second is flagged as a duplicate.
  const tickets = await staff.photos.presign(job.id, {
    files: [
      { name: "A.jpg", size: 1024, type: "image/jpeg" },
      { name: "B.jpg", size: 1024, type: "image/jpeg" },
      { name: "C.jpg", size: 1024, type: "image/jpeg" },
    ],
  });
  assert.equal(tickets.length, 3);
  const put = (t, bytes) => fetch(t.url, { method: "PUT", headers: t.headers, body: bytes });
  assert.equal((await put(tickets[0], Buffer.alloc(1024, 1))).status, 200);
  assert.equal((await put(tickets[1], Buffer.alloc(1024, 1))).status, 200);
  assert.equal((await put(tickets[2], Buffer.alloc(1024, 2))).status, 200);
  const forged = await fetch(tickets[0].url.replace(/sig=[^&]+/, "sig=forged"), { method: "PUT", body: "x" });
  assert.equal(forged.status, 403);
  const completed = [];
  for (const t of tickets) completed.push(await staff.photos.complete(t.uploadId, { width: 4000, height: 5000 }));
  assert.equal(completed[0].status, "processing");
  assert.equal(completed[1].duplicateOfId, completed[0].id);
  await sleep(250);
  const photos = await staff.photos.list(job.id);
  assert.ok(photos.every((p) => p.status === "ready"));
  assert.deepEqual((await staff.photos.update(photos[0].id, { tags: ["Classic"], labels: ["Yearbook"] })).tags, ["Classic"]);

  const queue = await staff.matches.queue(job.id);
  assert.equal(queue.autoThreshold, 0.9);
  // The mock matcher pairs new uploads with random roster entries: pick ones it didn't already use.
  const matchedTo = (photoId) =>
    queue.groups.filter((g) => [...g.auto, ...g.review, ...g.accepted].some((m) => m.photoId === photoId)).map((g) => g.subject.id);
  const freeSubject = (photoId, except = []) => roster.find((s) => !matchedTo(photoId).includes(s.id) && !except.includes(s.id));
  const target = photos.find((p) => p.id === completed[2].id);
  const first = freeSubject(target.id);
  const second = freeSubject(target.id, [first.id]);
  const manual = await staff.matches.assign({ photoId: target.id, subjectId: first.id });
  assert.equal(manual.status, "accepted");
  assert.equal((await staff.matches.reject(manual.id)).status, "rejected");
  assert.equal((await staff.matches.accept(manual.id)).status, "accepted");
  assert.equal((await staff.matches.reassign(manual.id, { subjectId: second.id })).subjectId, second.id);
  assert.equal((await staff.matches.split({ matchIds: [manual.id], subjectId: first.id })).moved, 1);
  assert.equal((await staff.matches.bulkAccept({ matchIds: [manual.id] })).accepted, 0);
  // Give the preview subject (Mina) a confirmed photo, whether or not the mock matcher already paired them.
  const avaGroup = queue.groups.find((g) => g.subject.id === ava.id);
  const existing = avaGroup && [...avaGroup.auto, ...avaGroup.review].find((m) => m.photoId === completed[0].id);
  if (existing) await staff.matches.accept(existing.id);
  else await staff.matches.assign({ photoId: completed[0].id, subjectId: ava.id });

  const published = await staff.jobs.publish(job.id);
  assert.equal(published.status, "live");
  const detail = await staff.jobs.get(job.id);
  assert.ok(detail.checklist.find((c) => c.key === "photos").done);
  const preview = await staff.jobs.preview(job.id);
  assert.equal(preview.subject.firstName, "Mina");
  assert.ok(preview.photos.length >= 1);
  assert.deepEqual(await staff.jobs.orders(job.id), []);

  const messages = await staff.jobs.messages(job.id);
  assert.ok(messages.some((m) => m.kind === "reminder" && m.sendAt));
  const edited = await staff.jobs.updateMessage(job.id, messages[0].id, { body: "Photos are ready: {{album_link}}" });
  assert.equal(edited.body, "Photos are ready: {{album_link}}");
  const test = await staff.jobs.testMessage(job.id, messages[0].id, { to: "owner@brightside.photo" });
  assert.equal(test.template, `test:${messages[0].kind}`);

  const exp = await staff.jobs.createExport(job.id, { type: "subjects_csv" });
  assert.equal(exp.status, "queued");
  await sleep(1_400);
  const ready = (await staff.jobs.exports(job.id))[0];
  assert.equal(ready.status, "ready");
  const csv = await api.call("GET", ready.url);
  assert.match(csv.text, /^first_name,last_name,group,access_code/);
  assert.match(csv.headers.get("content-disposition"), /attachment/);

  const copy = await staff.jobs.duplicate(job.id);
  assert.equal(copy.status, "draft");
  assert.equal((await staff.jobs.close(job.id)).status, "closed");
  assert.equal((await staff.jobs.extend(job.id, { deadline: future(20) })).status, "live");
  assert.ok((await staff.jobs.list({ q: "fall portraits" })).some((j) => j.id === job.id));

  const batches = await staff.jobs.bulkBatches("job_maple_fall");
  if (batches[0]?.orders > 0) assert.deepEqual(await staff.jobs.releaseBulkBatch("job_maple_fall", batches[0].id), { ok: true });

  // --- Promos, passes, orders, reports ------------------------------------------------------
  assert.ok((await staff.promos.list()).length >= 4);
  const promo = await staff.promos.create({ code: "TESTFIVE", kind: "fixed", value: 500, minSubtotalCents: 0, startsAt: null, endsAt: null, jobIds: [], usageLimit: 10, active: true });
  assert.equal((await staff.promos.update(promo.id, { active: false })).active, false);
  assert.ok((await staff.promos.passOffers()).length >= 2);
  const offer = await staff.promos.createPassOffer({ jobId: job.id, amountsCents: [2000, 4000], bonusBps: 500, endsAt: future(5), active: true });
  assert.equal((await staff.promos.updatePassOffer(offer.id, { bonusBps: 1000 })).bonusBps, 1000);
  assert.equal((await staff.promos.passOffers()).find((o) => o.id === offer.id).active, true);

  const orders = await staff.orders.list({ q: "martinez" });
  assert.ok(orders.length >= 1);
  const order = await staff.orders.get(orders[0].id);
  assert.ok(order.split.totalCents > 0);
  const reprinted = await staff.orders.reprint(order.id, { itemIds: [order.items[0].id], reason: "Color shift" });
  assert.equal(reprinted.reprints.length, 1);

  const report = await staff.reports.get({});
  assert.ok(report.totals.salesCents > 0 && report.payouts.length > 0);
  const reportCsv = await staff.reports.csv({});
  assert.match(reportCsv.csv, /^order_number,/);

  // --- Parents ---------------------------------------------------------------------------------
  const sent = await anon.auth.sendOtp({ destination: "elena.parent@example.com", channel: "email" });
  const parentSession = await anon.auth.verifyOtp({ destination: sent.destination, code: sent.devCode, consent: { smsUpdates: false, marketing: true } });
  const parent = createClient({ baseUrl: api.base, token: parentSession.token });
  assert.equal((await parent.auth.me()).kind, "parent");

  assert.equal((await anon.store.branding("EAGLES")).name, "Brightside Photo Co.");
  assert.deepEqual(await anon.store.notifyMe("DANCE7", { destination: "elena.parent@example.com" }), { ok: true });
  try {
    await parent.store.album("DANCE7");
    assert.fail("expected not_published");
  } catch (err) {
    assert.ok(err instanceof ApiError);
    assert.equal(err.code, "not_published");
    assert.ok(err.body.publishAt);
  }
  const team = await parent.store.album("EAGLES");
  assert.equal(team.job.albumType, "team");
  const found = await parent.store.findMe("EAGLES", { imageBase64: Buffer.alloc(700, 3).toString("base64"), consent: true });
  assert.ok(found.photos.length > 0);
  assert.equal((await parent.store.addPhotos("EAGLES", { photoIds: [found.photos[0].id] })).photos[0].id, found.photos[0].id);
  assert.deepEqual((await parent.store.setFavorites("EAGLES", { photoIds: [found.photos[0].id] })).favorites, [found.photos[0].id]);
  const shop = await parent.store.shop("EAGLES");
  assert.ok(shop.packages.length > 0 && shop.products.length > 0);
  assert.equal(shop.suggestedBundle.photoIds[0], found.photos[0].id);

  const cart = await parent.carts.create({ albumCode: "EAGLES" });
  const playerPack = shop.packages.find((p) => p.name === "Player Pack");
  await parent.carts.update(cart.id, {
    items: [{ id: "i1", kind: "package", refId: playerPack.id, quantity: 1, albumCode: "EAGLES", subjectId: null, photoIds: [found.photos[0].id], customization: null }],
    promoCode: "GOEAGLES",
  });
  const got = await parent.carts.get(cart.id);
  assert.equal(got.totals.discountCents, 500);
  const checkout = await parent.checkout.submit({
    cartId: cart.id,
    contact: { name: "Elena Parent", email: "elena.parent@example.com", phone: null },
    delivery: { method: "home", address: { line1: "9 Pine St", line2: null, city: "Portland", state: "OR", postalCode: "97214", country: "US" } },
    payment: { method: "apple_pay", paymentMethodId: null },
  });
  assert.equal(checkout.status, "paid");
  assert.equal((await parent.checkout.confirm(checkout.orderId)).status, "paid");
  const parentOrder = await parent.orders.get(checkout.orderId);
  assert.equal(parentOrder.split.taxCents, 0, "Oregon has no sales tax");
  assert.ok((await parent.orders.list()).some((o) => o.id === checkout.orderId));

  const passOffer = await anon.passes.offer("job_lumen_recital");
  assert.equal(passOffer.studio.name, "Brightside Photo Co.");
  const bought = await parent.passes.buy({ offerId: passOffer.id, amountCents: 5000, contact: { name: "Elena Parent", email: "elena.parent@example.com", phone: null } });
  assert.equal(bought.pass.creditCents, 5500);

  const account = await parent.account.get();
  assert.ok(account.children.length >= 0 && account.orders.length >= 1 && account.passes.length === 1);
  assert.equal((await parent.account.update({ name: "Elena P.", notifications: { channel: "email" } })).name, "Elena P.");
  assert.ok((await parent.account.requestExport()).deliverTo.includes("@"));
  assert.ok(Date.parse((await parent.account.requestDeletion()).completesBy) > Date.now());

  // Lab ships the order: tracking + shipped message.
  const shipped = await api.call("POST", "/webhooks/lab/lab_cascade", {
    body: { orderId: checkout.orderId, event: "shipped", tracking: { carrier: "USPS", number: "9400100000000000000001", url: "https://tools.usps.com/go/TrackConfirmAction" } },
  });
  assert.equal(shipped.status, 200);
  const afterShip = await parent.orders.get(checkout.orderId);
  assert.equal(afterShip.status, "shipped");
  assert.ok(afterShip.tracking && afterShip.messages.some((m) => m.template === "order_shipped"));

  // STOP suppresses texts.
  const stop = await fetch(`${api.base}/webhooks/twilio`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ From: "+15555550123", Body: "STOP" }),
  });
  assert.match(await stop.text(), /unsubscribed/);

  // Stripe webhook (unsigned in dev) is accepted.
  const stripe = await api.call("POST", "/webhooks/stripe", { body: { type: "payment_intent.succeeded", data: { object: { id: "pi_unknown", metadata: {} } } } });
  assert.equal(stripe.status, 200);

  // --- Internal admin ---------------------------------------------------------------------------
  const adminSession = await anon.admin.login({ email: "admin@snapbell.com", password: "admin-dev-only" });
  const admin = createClient({ baseUrl: api.base, token: adminSession.token });
  assert.equal((await admin.auth.me()).kind, "admin");
  assert.ok((await admin.admin.studios({ q: "golden" })).length === 1);
  assert.ok((await admin.admin.jobs({ status: "live" })).length >= 3);
  const adminOrders = await admin.admin.orders({ q: "elena" });
  assert.ok(adminOrders.length >= 1);
  assert.equal((await admin.admin.order(checkout.orderId)).number, parentOrder.number);
  assert.equal((await admin.admin.refund(checkout.orderId, { amountCents: 100, reason: "Goodwill" })).status, "partially_refunded");
  const queueRows = await admin.admin.labQueue({});
  assert.ok(queueRows.length > 0);
  assert.equal((await admin.admin.retryLabSubmission(queueRows[0].id)).status, "submitted");
  const log = await admin.admin.messages({ channel: "sms" });
  assert.ok(log.length > 0);
  assert.ok(!log.some((m) => /\b\d{6}\b/.test(m.body) && m.template === "otp"), "one-time codes are never logged");
  const flags = await admin.admin.flags();
  assert.ok(flags.length >= 4);
  assert.equal((await admin.admin.updateFlag("ai_retouch", { enabled: true })).enabled, true);

  // --- Contact requests and staff-created studios --------------------------------------------
  const received = await anon.contact.submit({ kind: "partner", name: "Kamola Rahimova", company: "Kamola Foto", phone: "90 777 66 55", city: "Buxoro", message: "Maktab suratlari." });
  assert.equal(received.received, true);
  const requests = await admin.admin.contactRequests({ kind: "partner", q: "kamola" });
  assert.equal(requests.length, 1);
  assert.equal(requests[0].phone, "+998907776655");
  assert.equal((await admin.admin.updateContactRequest(received.id, { status: "contacted", note: "Called" })).note, "Called");
  const created = await admin.admin.createStudio({ studioName: "Kamola Foto", ownerName: "Kamola Rahimova", ownerEmail: "kamola@kamolafoto.example", contactRequestId: received.id });
  assert.equal(created.owner.status, "invited");
  assert.equal(created.studio.ownerStatus, "invited");
  assert.equal((await admin.admin.contactRequests({ status: "converted", q: "kamola" }))[0].studioId, created.studio.studio.id);
  const ownerLink = await admin.admin.memberSetupLink(created.owner.id);
  const kamola = await anon.auth.completeSetup({ token: new URL(ownerLink.url).searchParams.get("token"), password: "kamola-password" });
  assert.equal(kamola.studio.name, "Kamola Foto");
  assert.equal(kamola.studio.onboarding.done, false);

  // Photographer can't manage the team.
  const photographer = createClient({ baseUrl: api.base, token: (await anon.auth.login({ email: "sam@brightside.photo", password: "picture-day" })).token });
  await assert.rejects(() => photographer.studio.invite({ email: "x@y.example", name: "X", role: "photographer" }), (err) => err instanceof ApiError && err.status === 403);
});
