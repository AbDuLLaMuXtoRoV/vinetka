# Backlog: build plan → code

Each page and screen in the build plan is one ticket. "Built" means the page exists, type-checks, builds and renders against the demo API; the main paths are covered by `pnpm smoke`. Integrations that need third-party accounts are tracked in the [launch checklist](#qa-and-launch-checklist).

## Marketing site: `apps/web/app/(site)` + `apps/web/surfaces/site` (13 pages + legal), all built

| # | Route | Code |
|---|---|---|
| 1 | `/` (plan sections, minus the fee calculator teaser) | `app/page.tsx` |
| 2–5 | `/features`, `/features/check-in`, `/features/family-store`, `/features/marketing` | `app/features/**` |
| 6 | `/markets` (tabs follow `#hash`) | `app/markets/page.tsx` |
| 7 | ~~`/pricing`~~ removed: studio fees are not shown publicly; partner terms are discussed privately. `/pricing` (and `/ru`, `/uz`) 308 → `/contact` | `next.config.ts` redirects |
| 8–11 | `/switch`, `/demo`, `/signup` (→ studio handoff), `/find-my-photos` (→ store) | `app/<route>/page.tsx`, `components/forms/*`, `app/actions.ts` |
| 12–13 | `/blog`, `/blog/[slug]`, `/help`, `/help/[slug]` | `lib/cms.ts`, `content/*.ts` |
| 14 | `/about` | `app/about/page.tsx` |
| Legal | `/terms`, `/terms-parents`, `/privacy`, `/biometrics`, `/cookies`, `/data-request` | `components/legal-page.tsx`, `content/legal.ts` |
| SEO | sitemap, robots, OG image, JSON-LD, 404 | `app/sitemap.ts`, `app/robots.ts`, `app/opengraph-image.tsx` |

## Family Store: `/shop`, `apps/web/app/(shop)/shop` + `apps/web/surfaces/shop` (12 screens), all built

| # | Route | Notes |
|---|---|---|
| 1 | `/` | 6-box code entry, studio logo once recognised, invalid / expired / not-yet-published states |
| 2 | `/verify` | Phone or email OTP, separate unticked consent boxes, 30s resend |
| 3 | `/a/[code]` | Grid, filter chips, favorites, deadline countdown, blur on focus loss, matching empty state |
| 4 | `/a/[code]/find-me` | Team/Open only, consent → camera or upload → "Add to my album" |
| 5 | `/a/[code]/photo/[id]` | Swipe, zoom, favorite, "Use in a product"; save and right-click blocked |
| 6 | `/a/[code]/shop` | Suggested bundle from favorites, packages, single products |
| 7 | `/a/[code]/customize/[item]` | Live preview, locked-ratio crop, background, theme, name, retouch, low-resolution warning |
| 8 | `/cart` | Grouped by child, sibling albums combine, promo, Pass credit |
| 9 | `/checkout` | One page; Stripe Payment Element when keyed, labelled test mode otherwise; 3-D Secure path |
| 10 | `/orders/[id]` | Timeline, downloads, tracking, reorder |
| 11 | `/account` | Children, orders, notifications, data export and deletion |
| 12 | `/pass/[job]` | Picture Day Pass pre-pay |

## Studio app: `/studio`, `apps/web/app/(studio)/studio` + `apps/web/surfaces/studio` (22 screens), all built

Routes live under `app/(app)/` unless noted: `/login`, `(setup)/onboarding`, `/home`, `/jobs`, `/jobs/new`, `/jobs/[id]` and its sub-pages (`roster` with `roster/print`, `photos`, `matching`, `settings`, `marketing`, `orders`, `exports`), `/price-sheets`, `/price-sheets/[id]`, `/promos`, `/orders`, `/orders/[id]`, `/reports`, `/organizations`, `/settings/studio`, `/settings/payments`. There are also `/organizations/[id]` and auth handoff routes (`/auth/handoff`, `/auth/magic`).

## Internal admin: `/admin`, `apps/web/app/(admin)/admin` + `apps/web/surfaces/admin` (6 screens), all built

`/studios`, `/jobs`, `/orders` + `/orders/[id]` (refunds), `/lab-queue` (retry), `/messages`, `/flags`.

## API and worker

Every endpoint in the plan's API table, plus the rest of the contract in `packages/sdk/src/client.ts`, is implemented in `apps/api/src/controllers/*` and exercised by `apps/api/test/contract.test.mjs`. The worker (`apps/worker/src`) has processors for images, matching, labs, messages and face-data retention.

## QA and launch checklist

✅ verified here · 🟡 implemented, needs live services or a real device · ⬜ not started

**Functional**
- 🟡 Sign up → Stripe → job → roster → publish in under 15 minutes (flow built; time it with a real studio)
- 🟡 5,000-photo upload that resumes after a dropped connection (file-level retry built; S3 multipart pending)
- ✅ No low-confidence match visible to parents (API tests + fixture test)
- 🟡 Parent flow on iPhone Safari / Android Chrome / desktop (server-rendered paths smoke-tested; real devices pending)
- 🟡 Apple Pay, Google Pay, card, 3-D Secure in Stripe test mode (needs Stripe test keys; simulated path tested)
- ✅ Tax, lab cost, platform fee, payout add up to the cent on 20 test orders (`packages/sdk` tests + every fixture order + smoke order)
- 🟡 Order reaches lab, tracking returns, shipped message (webhook + messaging built; mock lab)
- ✅ Refund and reprint from order detail (API tests)
- 🟡 Pass credit applies automatically at checkout (implemented in the cart and order split; no end-to-end test redeems a Pass yet)
- 🟡 Exports open correctly (subjects CSV real; yearbook/images return a manifest)

**Quality**
- ⬜ Lighthouse 90+ on marketing; album under 2s on throttled 4G (built for it: static pages, lazy images; not measured)
- ⬜ WCAG 2.2 AA audit (axe + keyboard pass); components built with labels, focus rings and 44px targets
- ⬜ Playwright e2e on preview (`scripts/smoke.mjs` covers main paths meanwhile)
- ⬜ Sentry, Better Stack, status page

**Security and privacy**
- ✅ Originals never public; previews watermarked; signed URLs expire (tampered signature → 403)
- ✅ Role permissions (photographer blocked from reports, payouts, payments, refunds, margins)
- 🟡 Biometric consent screens built; retention job in worker (needs DB-backed scheduling)
- 🟡 SMS STOP/START and email unsubscribe handled (needs Twilio/Postmark)
- 🟡 Rate limits on code entry and OTP ✅ (in-memory, per instance); backups and restore ⬜

**Content and legal**
- ✅ Copy original, no PhotoDay wording, names or marks
- ⬜ Legal pages reviewed by a lawyer (drafts marked)
- ⬜ Trademark search; domains
- 🟡 Sitemap, meta, OG images built; analytics events wired, provider keys pending

**Go-live**: ⬜ DNS/SSL/email auth · ⬜ Stripe + lab live mode · ⬜ Support staffing for the pilot picture day
