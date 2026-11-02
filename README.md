# Snapbell

School, sports and event photo sales: a marketing site, a parent-facing Family Store, a Studio app for photographers and an internal admin, all on one TypeScript monorepo and one API.

This repository implements the **Site build plan** (sections 2–7). [docs/BACKLOG.md](docs/BACKLOG.md) maps each page and screen in the plan to its code and tracks the QA and launch checklist.

## Quick start

Requires Node 22+ and pnpm 10 (`corepack enable pnpm`). No database, Redis or API keys are needed to run it locally.

```bash
pnpm install
pnpm dev            # API :4000, marketing :3000, store :3001, studio :3002, admin :3003
```

Production-mode run plus the cross-surface smoke test:

```bash
pnpm build
pnpm start:all      # in one terminal
pnpm smoke          # in another: drives parent, studio, admin and marketing flows end to end
```

Other checks: `pnpm lint`, `pnpm typecheck`, `pnpm test` (SDK pricing, API e2e, worker image pipeline).

## Demo data

The API boots with an in-memory store seeded from `packages/sdk/src/fixtures.ts`. Dates are relative to "now", so deadlines always look current. **Data resets on restart.**

| Who | Sign in |
|---|---|
| Studio owner | `owner@brightside.photo` / `picture-day` (studio :3002) |
| Photographer (restricted role) | `sam@brightside.photo` / `picture-day` |
| Internal admin | `admin@snapbell.com` / `admin-dev-only` (admin :3003) |
| Parent | `parent@example.com` or `+998 90 123 45 67`; the one-time code is shown on screen in dev |

| Album code (store :3001) | What it shows |
|---|---|
| `SAMPLE` | Personal album (Ava). Also the marketing site's "See a sample store" |
| `LEOM26` | Ava's brother: sibling items combine in one cart |
| `EAGLES` | Team album with Find Me selfie search; the studio side has a review queue |
| `DANCE7` | Not published yet: shows the date + "notify me"; has a Picture Day Pass offer |
| `SENR25` | Expired album |

Checkout without Stripe keys runs a labelled test mode. Include `+3ds` in the email to exercise the 3-D Secure path. Promo codes: `FALL10`, `FREESHIP`, `GOEAGLES`.

## Who can create accounts

| Account | How it is created |
|---|---|
| **Studio** (a photography business) and its owner | **Only by the Snapbell team**, in Admin. Use **Studios → Create studio**, or **Requests → Create studio** from a contact request. Admin shows a one-time link (valid 7 days); send it to the owner by email or Telegram. The owner chooses a password and runs the setup wizard. There is no studio self-signup anywhere: the API has no endpoint for it, and the site has no studio sign-up page. |
| **Studio team members** (admin, photographer) | By the studio's owner or admin in **Settings → Studio → Team → Invite**. They get the same kind of one-time link. |
| **Parents** (shop customers) | Self-service on the **main site** at `/signup` and `/signin`, using a one-time code by text or email (no password). They stay on the main site, and the header shows their account. Links into the shop (`/go/store`) hand the login over with a one-time 60-second code, so they arrive signed in. The shop also has its own `/signin` and `/signup` for parents who arrive from a text message. Photos still open only with the album code from the studio. |

**Client lists:** Admin → Clients shows every customer account on the platform. Studio → Clients shows a studio only the parents who have paid for an order from *that* studio, and photographers can't open it.

Anyone (photographers, schools, parents) can reach the Snapbell team through the marketing site's **/contact** page. The about, demo, switch and data-request forms send requests too. Every request appears in **Admin → Requests**, and its status can be set to new, contacted, converted or archived.

## Repository

```
apps/
  marketing/   Next.js 16, static + local CMS adapter      snapbell.com
  store/       Next.js 16 PWA, mobile-first               photos.snapbell.com
  studio/      Next.js 16 app, desktop-first              studio.snapbell.com
  admin/       Next.js 16 internal admin                  admin.snapbell.com
  api/         NestJS 11 REST API (/v1) + webhooks
  worker/      BullMQ jobs: images (sharp), matching (Rekognition), labs, messages, retention
packages/
  sdk/         API contract (types + typed client), pricing math, demo data. Start here.
  ui/          Design system: tokens (section 6) + components, imported per file (@snapbell/ui/button)
  db/          Prisma schema (PostgreSQL + pgvector) and seed
  config/      Shared tsconfig and ESLint
scripts/smoke.mjs   Cross-surface smoke test
```

**How the pieces talk.** Web apps call the API only from server code (server components and server actions), using `createClient` from `@snapbell/sdk`. Session tokens live in httpOnly cookies: `sb_parent`, `sb_studio`, `sb_admin`. The browser talks to the API directly only to load signed, expiring, watermarked image URLs. Originals have no public route.

**Design tokens.** `packages/ui/src/styles/tokens.css` defines the type scale, which is remapped: `text-xl` is 24px, `2xl` 32, `3xl` 48, `4xl` 64. Breakpoints are `md` 768, `lg` 1024 and `xl` 1440 only. It also sets `max-w-content` (1200px), the radii and the dark mode used by Studio and Store. The Family Store swaps the accent color for each studio's brand color with `brandStyle()` from `@snapbell/ui/lib/brand`.

## Public demo (Render)

`render.yaml` deploys the API and all four sites as free Render web services:

| Site | URL |
|---|---|
| Marketing | https://vinetka-site.onrender.com |
| Family Store | https://vinetka-photos.onrender.com |
| Studio | https://vinetka-studio.onrender.com |
| Admin | https://vinetka-admin.onrender.com |
| API | https://vinetka-api.onrender.com/v1/health |

**One-time setup:** sign in at render.com with GitHub → **New → Blueprint** → choose this repository → **Apply**. After that, every push to `main` redeploys only the services whose code changed.

- Demo mode (`DEMO_MODE` / `NEXT_PUBLIC_DEMO_MODE`) shows the demo logins and codes on screen and returns one-time codes in responses, since no SMS provider is connected. Search engines are told not to index the demo.
- Free services sleep after ~15 minutes without visitors. The first visit after that takes about a minute.
- The API keeps data in memory, so the demo resets to the seed data whenever it restarts.
- If Render can't grant a service name, it adds a suffix to the URL. In that case, update the URLs in the `vinetka-shared` env group (and the API's own URL variables) to the real ones, then redeploy.

## Languages

Every surface is available in **English, Russian and Uzbek** (Latin script).

| Surface | How the language is chosen |
|---|---|
| Marketing | URL: `/pricing`, `/ru/pricing`, `/uz/pricing`, with hreflang alternates and a localized sitemap |
| Store, Studio, Admin | `sb_locale` cookie (set by the switcher or `?lang=ru`), otherwise the browser language. Album links in texts and flyers keep working in any language |
| API | `Accept-Language` localizes every error message. Texts and emails to parents use the parent's saved language |

Translations live next to the code that uses them, in `messages/*.ts` modules built with `defineMessages(en, { ru, uz })` from `@snapbell/sdk`. TypeScript fails the build if a language is missing a key. Number-dependent strings use `plural()`, which handles Russian's three forms. Money, dates and deadlines go through `formatters(locale)`. Prices stay in USD, with formatting per language.

Studio-entered data (studio, school, job and product names, message templates) is shown exactly as the studio wrote it. Before launch, a native speaker should review the Russian and Uzbek copy, and the phone and address fields still need non-US formats.

## What is real and what is simulated

| Area | Status |
|---|---|
| Pricing, platform fee tiers, promos, Pass credit, order money split | **Real**, unit-tested: tax + lab + platform fee + card fee + payout equals the total, to the cent |
| Auth (HMAC tokens, scrypt passwords, OTP hashing, per-IP and per-destination rate limits), role scoping, signed media URLs | **Real** |
| Messaging rules (opt-in, STOP/START suppression, quiet hours, message log) | **Real** logic. Delivery goes to the console until Twilio/Postmark keys are set |
| Image pipeline (EXIF strip, thumbnails, AVIF/WebP, watermark) | **Real** in the worker (`pnpm --filter @snapbell/worker process-image <in> <outDir>`) |
| Persistence | **In-memory.** The Prisma schema is complete and validated; the repository interface (`apps/api/src/store/repository.ts`) still needs a Prisma implementation |
| Payments, Stripe Connect onboarding | Simulated without keys. With `STRIPE_SECRET_KEY` the API creates PaymentIntents with an application fee |
| Face matching, Find Me | Mock matcher. Rekognition adapter in the worker when AWS keys are set |
| Uploads | Presign → PUT → complete flow is real; the dev sink stands in for S3/R2 multipart |
| Lab fulfilment | Mock adapter + webhook endpoint |
| Marketing CMS, lead forms | Local content files behind `lib/cms.ts`. Forms validate and log, with no CRM yet |

Every variable is documented in [.env.example](.env.example).

## Decisions made while building (please confirm)

- **Fee tiers are marginal.** 8% on a studio's first $250K of yearly sales and 6% above it, so crossing the threshold never lowers the total fee. Each order uses the rate for the studio's year-to-date sales.
- **Card processing** (2.9% + 30¢) is passed through to the studio at cost. When Pass credit is redeemed, card fees apply only to the amount charged at that checkout (the Pass itself was a separate card charge).
- **Tax** is collected by the platform for remittance and excluded from the platform fee and the payout. Dev uses a small per-state estimate; production would use Stripe Tax.
- **Delivery:** $6.95 flat to home; school pickup is free and offered only on bulk-shipping jobs.
- **Album visibility:** Personal albums show only photos with confident or accepted matches, plus group photos. Team and Open albums show every ready photo, with Find Me results first.
- **Photographers** also cannot see Price sheets and Promos, not just Reports and Payments, because both expose lab costs and margins.

## Before a pilot (not done yet)

1. Prisma-backed repository + migrations (enable `vector`), then let the worker write results back.
2. Live integrations: Stripe Connect onboarding and webhooks, Twilio Verify and SMS, Postmark, S3/R2 multipart uploads, a real lab API adapter, Rekognition.
3. Move rate limits to Redis once there is more than one API instance. Deploy the web apps behind a proxy that overwrites `X-Forwarded-For` (Vercel does), because the API rate-limits by the forwarded client IP.
4. Playwright suite on preview deploys (the plan's CI). `scripts/smoke.mjs` covers the main paths for now.
5. Sanity (or Payload) behind `apps/marketing/lib/cms.ts`, CRM for lead forms, PostHog/Plausible keys.
6. Google sign-in and 2FA setup for studio owners, a PWA service worker, photo thumbnails on studio order lines.
7. Legal pages are marked "Draft: pending legal review". They need a lawyer and a trademark search for the final name.
8. The check-in mobile app (Expo) has its own plan and starts in sprint 7.
