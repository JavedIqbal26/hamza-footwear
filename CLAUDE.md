# Hamza Footwear

Online storefront for a physical shoe shop in Pakistan. The owner sells via TikTok
videos; customers currently phone in orders. This site is the destination for the
TikTok bio link and per-video product links.

- **Domain:** hamzafootwear.com
- **Audience:** Pakistan only. One country, one currency, one language setup.
- **Primary device:** mid-range Android, mobile data, arriving from the **TikTok
  in-app browser** — not desktop Chrome. Design and test for that first.

---

## Hard constraints

These are not preferences. If a change would break one of them, stop and flag it
instead of building it.

1. **Zero recurring hosting cost.** Everything stays inside Cloudflare free tiers.
   A solution that needs a paid tier is a blocker to raise, not a decision to make.
2. **Speed over features.** Target < 1.5s LCP on throttled 4G. Every kilobyte of
   JavaScript must justify itself out loud.
3. **No third-party origins.** Self-host fonts and all assets. No Google Fonts, no
   CDN script tags, no external stylesheets. Services are intermittently blocked or
   throttled in Pakistan — anything off-origin is a reliability risk, not just a
   perf one. (Server-to-server calls from the Worker — Resend, Telegram — are fine;
   this rule is about what the *browser* is asked to fetch.)
4. **Admin must be usable one-handed on a phone**, by a non-technical shop owner.
   If adding a product takes more than four taps, the flow is wrong.
5. **Do not add a dependency without flagging it first.** Every package is weight.
   State the size and what it replaces before installing.

### Budgets (Phase 1 definition of done)

- Lighthouse mobile performance >= 95 on a throttled 4G profile
- Total JS on a product page < 30KB gzipped
- Fully usable inside the TikTok in-app browser
- Live on hamzafootwear.com with working SSL

---

## Stack

| Layer | Choice |
|---|---|
| Storefront | Astro + TypeScript, **no client framework** (see below) |
| Admin | Vite + React + TypeScript (SPA, no SSR), served at `/admin` |
| Styling | Tailwind |
| API | Cloudflare Workers (TypeScript), Hono for routing |
| Database | Cloudflare D1 (SQLite) |
| Images | Cloudflare R2 |
| Admin auth | Cloudflare Access (Zero Trust free tier) |
| Deploy | Cloudflare Pages + Wrangler |
| Analytics | Cloudflare Web Analytics (cookieless) |
| Email | Resend (order notifications) |
| Chat notify | Telegram Bot API (order notifications) |

**Astro over Next.js is deliberate.** The storefront is ~95% static content and
should ship almost no JavaScript.

**No client framework on the storefront.** The original plan called for React
islands. React 19 + react-dom is ~47KB gzipped — on its own, more than 1.5x the
entire 30KB product-page budget, before a line of our code. The two interactive
pieces (size selector, image gallery) are ~40 lines of DOM code between them, so
they are written as plain TypeScript modules in `src/scripts/`, loaded by the
Astro components in `src/components/interactive/`. Current cost: **1.02 kB
gzipped**.

Both are strict progressive enhancement — the page is fully usable before, and
without, the script. The WhatsApp link is built server-side and works on arrival;
the script only folds the chosen size into the message.

**If Phase 2's order form needs a framework**, the answer is Preact with
`preact/compat` (~5KB gzipped, React-compatible JSX), not React. Raise it before
installing anything.

**Auth is not application code.** Cloudflare Access sits in front of `/admin` and
the admin API routes. Do not write login screens, session handling, password
hashing, or JWT logic. If admin auth seems to need code, that is a signal the
Access config is wrong.

The Worker's `requireAccess` middleware only reads the identity header Access
injects, and **fails closed** when it is absent so a broken policy breaks admin
loudly rather than opening it. That header is trustworthy *only* because Access
terminates the request first and strips any client-supplied copy — so every
route of the API Worker must sit behind an Access application, and the Worker
must have no other public hostname. If that ever changes, the header check must
be replaced with real verification of the `Cf-Access-Jwt-Assertion` JWT.

---

## Repo layout

```
/
├── apps/
│   ├── web/          # Astro storefront (Pages) — owns its wrangler.toml
│   ├── admin/        # Vite React SPA at /admin, behind Cloudflare Access
│   └── api/          # Worker: admin API only — owns its wrangler.toml
├── packages/
│   ├── shared/       # Types, constants, money/phone helpers. Zero runtime deps.
│   └── db/           # D1 repositories and row mappers. The only home for SQL.
├── db/
│   ├── migrations/   # Schema
│   └── seed/         # Cities and sample catalogue
└── CLAUDE.md
```

### Which app owns which write

- **The storefront owns the public order flow.** Add-to-cart and checkout post
  to the storefront's own origin, so they are native form POSTs that work with
  JavaScript disabled, need no CORS preflight, and put no second origin in the
  checkout path.
- **The Worker owns admin.** Product CRUD, image upload, order management —
  everything behind Access. It never creates orders.
- **Both go through `packages/db`**, so the query exists once.

Two deliberate departures from the original sketch:

- **`packages/db` exists.** Both the storefront (reads, through its own D1
  binding) and the Worker (writes, Phase 2) need data access. Putting it in
  `apps/api` would have forced the storefront through a network hop on its
  hottest path; duplicating it in both apps would let the two drift. One package,
  imported by both.
- **`wrangler.toml` is per-app, not at the root.** There are two deployables
  with different bindings and different lifecycles. A single root config would
  have to describe both.

**Package manager: npm workspaces.** Not pnpm — nothing here needs it, and it is
one less thing to install on the shop's machine.

### Commands

Run from the repo root.

| Command | Does |
|---|---|
| `npm run dev:web` | Storefront (4321), real D1/R2 bindings via Miniflare |
| `npm run dev:api` | Admin API Worker (8787) |
| `npm run dev:admin` | Admin SPA (5173), proxying `/api` and `/img` |
| `npm run build` | Build every app |
| `npm run typecheck` | Every workspace |
| `npm run db:reset` | Migrate + seed the local database |
| `npm run db:migrate:remote` / `db:seed:remote` | The live D1 database |

All three dev servers share **one** local D1 and R2 store at `.wrangler-local`,
so a product added in admin appears on the storefront immediately. Note the
`/v3` in the storefront's `platformProxy.persist.path`: `wrangler` writes under
`<dir>/v3`, but `getPlatformProxy` treats the path as the store root, and
without it you silently get two databases.

The admin dev server injects the Cloudflare Access identity header that Access
would add in production. That lives in the Vite dev config only and is never
built or deployed.

---

## Architecture and code organisation

The governing rule: **each file has one responsibility, and each layer knows only
the layer beneath it.** Dependencies point inward — never upward, never sideways
across a boundary.

### `apps/api` — Worker layers

```
src/
├── index.ts          # Worker entry: bind env, mount router. Nothing else.
├── routes/           # Hono handlers. HTTP in, HTTP out.
├── schemas/          # Zod schemas. The boundary contract.
├── services/         # Business logic. Pure-ish, framework-free.
├── repositories/     # D1 access. SQL lives here and nowhere else.
├── integrations/     # Resend, Telegram, R2 — each behind a narrow interface.
└── lib/              # Small generic helpers with no domain knowledge.
```

| Layer | May import | Must never |
|---|---|---|
| `routes` | schemas, services | write SQL, call Resend/Telegram/R2 directly |
| `services` | repositories, integrations, shared | touch `Request`/`Response` or Hono types |
| `repositories` | D1 binding, shared types | contain business rules or branch on order status |
| `integrations` | vendor SDK / `fetch` | know about D1 or route shapes |

A route handler should read as: parse with Zod → call one service → map the result
to a response. If a handler is doing more than that, the logic belongs in a service.
Repositories return domain types from `packages/shared`, never raw D1 row shapes.

### `apps/web` — Astro storefront

```
src/
├── pages/            # Routing + data fetching only. No presentation logic.
├── layouts/
├── components/
│   ├── ui/           # Static .astro. Dumb, props-in-HTML-out.
│   └── interactive/  # The only components with a <script>. Currently two.
├── scripts/          # The DOM logic those components load. Plain TS.
├── lib/              # Bindings access, read models, cache headers, site config.
└── content/          # Static copy and the Roman Urdu microcopy.
```

**Pages fetch, components render.** No component performs its own data fetch —
pages load data and pass it down as props. This keeps the static/dynamic boundary
visible, which is what protects the JS budget.

**`lib/runtime.ts` is the only file that touches `Astro.locals`.** Everything
above it works with a `D1Database` or an `R2Bucket`.

**Interactive components are a closed set** — currently `SizeSelector` and
`ProductGallery`. Adding a third is a decision to raise, not a refactor to
perform. Each must degrade cleanly: the page has to work with the script removed.

Astro only hoists and bundles a `<script>` at template top level. A `<script>`
inside a conditional expression ships unprocessed and its imports break — gate
the behaviour inside the script instead.

### `apps/admin` — feature-sliced SPA

```
src/
├── features/
│   ├── products/     # components/ hooks/ api/ — self-contained
│   └── orders/
├── components/ui/    # Shared dumb components
├── lib/              # API client, auth-aware fetch wrapper
└── routes/
```

Features do not import from each other. Anything two features need moves to
`components/ui` or `lib`. Server calls go through the single API client in `lib` —
no bare `fetch` inside a component.

### `packages/shared`

Types, money helpers, phone validation, link builders, and constants (sizes,
categories, statuses). Imported by the storefront, so the main entry point is
**dependency-free and tree-shakeable** — no runtime library lands there without
being flagged first.

**Zod lives behind the `@hamza/shared/schemas` subpath**, never the main entry
point. Zod is ~13KB gzipped; a stray `import { productSchema } from '@hamza/shared'`
in a page would put it in the storefront bundle. Import schemas from
`@hamza/shared/schemas` in the Worker and admin only.

Shared holds no city list and no delivery fees. The `cities` table is the single
source of truth for both — a second copy would drift the moment courier rates
change.

### `packages/db`

Repositories are factories taking a `D1Database`, so there are no globals and a
test can pass a fake. Row types (`ProductRow`) are the honest SQLite shapes —
`is_active` is 0/1, arrays are TEXT — and mappers turn them into the domain types
from `@hamza/shared`. Nothing outside `mappers/` sees a raw row.

Mappers are deliberately forgiving with JSON columns: a malformed
`sizes_available` yields an empty array rather than throwing. One bad row should
not take down a category page.

### File size and readability

The shop owner is not the only person who has to understand this in six months.

- **Hard ceiling: 200 lines per source file.** Crossing it means the file has more
  than one responsibility — split it, do not reformat it.
- **Components: aim for under 120 lines.** A component that renders and also
  fetches, transforms, and validates is three files wearing a coat.
- **Functions: aim for under 40 lines**, one level of abstraction each.
- **One exported component or service per file**, and the filename matches the
  export.
- If a file needs banner comments to navigate, it is already too big.
- Prefer many small, named files over few clever ones. Deep import paths are
  cheaper to read than long files.

These are limits on *complexity*, not a licence to scatter one-line files. Split
along responsibility seams, not arbitrary line counts.

---

## Data model

**products** — `id`, `slug`, `name`, `description`, `price_pkr` (integer),
`sale_price_pkr` (nullable), `category` (`men|women|kids`), `sizes_available` (JSON
array of UK sizes), `images` (JSON array of R2 keys), `is_active`, `stock_status`
(`in_stock|low|out`), `created_at`, `updated_at`

**orders** — `id`, `order_number` (human-readable, e.g. `HF-1042`), `customer_name`,
`phone`, `city`, `area`, `address_line`, `items` (JSON), `subtotal_pkr`,
`delivery_fee_pkr`, `total_pkr`, `payment_method` (`cod|jazzcash|easypaisa`),
`payment_proof_key` (nullable R2 key), `payment_status` (`pending|verified|failed`),
`order_status` (`new|confirmed|dispatched|delivered|cancelled|returned`),
`tiktok_video_ref` (nullable), `notes`, `created_at`

**cities** — `name`, `delivery_fee_pkr`, `tier`

**Money is always an integer number of PKR. Never use floats for money.** No
decimals, no cents. Formatting goes through the shared `formatPKR` helper; no
ad-hoc string building at call sites.

---

## Pakistan-specific rules

These encode real operational failures. Do not "improve" them toward international
conventions.

- **Phone validation:** `^03\d{9}$`. This is the only reliable way to reach a
  customer. Validate it hard on both client and server, and store it normalised —
  no spaces, no dashes, no `+92`.
- **No postal codes.** Do not add the field. It will not be filled in correctly.
- **Address form order, exactly:** name → mobile → city (dropdown) → area →
  address (free text).
- **Delivery fee is driven by the city dropdown**, computed server-side from the
  `cities` table. Two tiers to start: major cities (Karachi, Lahore, Islamabad,
  Rawalpindi, Faisalabad) and everywhere else. Never trust a fee sent by the client.
- **Sizes are UK.** Every product page needs a size chart plus a "measure your foot
  in cm" guide. Sizing confusion is a leading cause of returns — this is a revenue
  feature, not a nicety.
- **Language:** UI in English. Trust-critical microcopy — delivery time, COD
  confirmation, returns, WhatsApp button — in **Roman Urdu**. No Urdu script:
  Nastaliq webfonts are too heavy for the budget.
- **No cookie banner.** GDPR does not apply here. Analytics stay cookieless so the
  question never arises.

---

## Payments (Phase 1)

No payment gateway. JazzCash/Easypaisa APIs require a registered business
(NTN + business bank account + merchant approval), which is not in place.

- **COD is the default** and the most prominent option at checkout.
- **Manual wallet:** display the shop's JazzCash/Easypaisa number. The customer
  sends payment and uploads a screenshot or enters a transaction ID. The screenshot
  goes to R2 and appears next to the order in admin for manual verification before
  dispatch.

**Do not build gateway integration until explicitly asked.** When we do, it will be
Safepay — one integration covers cards plus both wallets.

---

## Images

Shop photos come off a phone at 3–6MB. **Resize client-side before upload** with
`browser-image-compression` (admin bundle only — it must never reach the
storefront). Generate three WebP variants and upload each to R2:

| Variant | Width |
|---|---|
| thumb | 400px |
| product | 800px |
| full | 1600px |

**Never upload the original.**

**Quality is set directly; file size is allowed to land where it lands.** This is
a shop — if the shoes look bad, nothing else here matters. R2 charges nothing for
egress, so a bigger file costs no more to serve; the only constraint is the 10GB
free storage tier, and at WebP quality 0.86 a photo's three variants come to
roughly 600KB. Five photos on each of 400 products is about 1.2GB.

Do **not** reintroduce a `maxSizeMB` compression *target*. An earlier version
used one, which made the encoder degrade quality to hit a number that storage
never required. The remaining size caps are runaway guards against an
uncompressed original, and admin's guard must stay at or below the Worker's
`MAX_VARIANT_BYTES` or valid uploads get rejected.

R2 is also simply the right store: S3 charges $0.09/GB egress, and cheaper
per-GB options mean a second origin, which rule 3 forbids.

---

## TikTok integration

- Every product gets a short URL: `/p/{slug}`.
- Accept a `?v=` query param carrying the video reference, **persist it through
  checkout**, and store it on the order as `tiktok_video_ref`. This is how the owner
  learns which videos actually sell.
- **Test inside the TikTok in-app webview, not just Chrome.** File uploads and
  redirects behave differently there. The checkout page carries an "Open in browser"
  hint for when they do not.

---

## Order flow

Two parallel paths, **both always available**:

1. **Order form** → Worker → write to D1 → fire Telegram message + Resend email.
2. **WhatsApp button** → `wa.me` deep link with product, size, and price pre-filled.

Some customers will never fill in a form. **Do not remove path 2**, and do not bury
it behind the form.

Telegram is the primary notification channel — it is unmetered and lands on the
owner's phone. Resend's free tier caps at 100 emails/day, so email is the backup
record, not the thing the business depends on. A failed notification must never
lose the order: write to D1 first, notify after, and log notify failures.

---

## Conventions

- TypeScript strict mode. **No `any`.**
- Shared types live in `packages/shared` and are imported by all three apps. If a
  type describes something crossing an app boundary, it belongs there.
- **Zod validation server-side on every Worker endpoint.** Never trust the client —
  especially for prices, delivery fees, and totals, which are always recomputed
  server-side from the database.
- Money helpers (`formatPKR`, etc.) live in shared. No ad-hoc formatting.
- Semantic HTML. Real `<a>` and `<button>` elements. The audience includes people on
  slow connections where JavaScript may not have hydrated yet — core navigation and
  the WhatsApp path must work without it.

---

## Build phases

**Phase 1 — storefront (ship first).** Home, category pages, product pages, size
chart, delivery/returns page. Products seeded directly into D1. WhatsApp ordering
only. Deploy to the live domain and get the link into the TikTok bio.

> **Built.** Everything above is written, typechecked, and verified against a
> local D1. What remains is account-level and needs a real Cloudflare account:
> create the D1 database and R2 bucket, paste the database id into both
> `wrangler.toml` files, set the real `SHOP_WHATSAPP`, create the Pages project,
> attach the domain. Steps are in [README.md](./README.md).

**Phase 2 — admin + orders.** Admin behind Cloudflare Access, product CRUD with
image upload, cart and checkout with COD + manual wallet, notifications, order
list with status updates.

> **Built.** Cart, checkout, order creation, notifications, the admin API and the
> admin SPA. Verified against a shared local D1: a tampered checkout submit was
> ignored in favour of database prices, an admin-uploaded photo reached the
> storefront, and the order lifecycle moved through admin.
>
> **Cart is a cookie, not localStorage** — so `/cart` and `/checkout` render
> server-side and add-to-cart is a native form POST that works with no
> JavaScript. The cookie holds slug, size and quantity only; every price is read
> from D1 on the request that uses it.
>
> **Order confirmation is addressed by the order UUID**, never by `HF-1042`.
> Order numbers are sequential, so a readable URL would let anyone walk the
> sequence and read other customers' names, phones and addresses.
>
> **The cart badge is filled in on the client.** Server-rendering it would bake
> one shopper's count into an edge-cached page and serve it to the next visitor.
> Anything person-specific must stay out of cacheable HTML.

**Phase 3 — later, only when asked.** Safepay, stock tracking, discount codes,
courier integration (PostEx or Trax).

Work in the current phase. Do not build ahead into a later phase because the code
would be easy to add now.

---

## Already decided — do not re-litigate

| Question | Answer |
|---|---|
| Next.js instead of Astro? | No. Storefront must ship near-zero JS. |
| A UI component library? | No. Tailwind only; libraries blow the JS budget. |
| Google Fonts? | No. Self-host. Off-origin fetches are unreliable in Pakistan. |
| Cloudflare Images? | No. $5/mo. Client-side compression to R2 instead. |
| Auth library / login page? | No. Cloudflare Access handles it. |
| Payment gateway now? | No. COD + manual wallet until told otherwise. |
| Postal code field? | No. |
| Urdu script? | No. Roman Urdu only. |
| Cookie banner? | No. |
| Multi-currency / i18n framework? | No. Pakistan only, PKR only. |
| React on the storefront? | No. ~47KB gzipped against a 30KB budget. |
| A webfont for body text? | No. System stack — zero bytes, zero CLS. |
| Instrument Serif for headings? | Yes, self-hosted only. Never via Google Fonts. |
| Stock photography on product cards? | No. Only the shop own photos, via admin. |
| Stock photography in the home hero? | Yes, self-hosted, unlinked, empty alt. Mood, not merchandise. |
| Invented ratings or order counts? | No. Every star comes from a delivered order. |
| pnpm? | No. npm workspaces; nothing here needs more. |
| Serve images from an R2 public URL? | No. Same-origin `/img/` route. |

---

## Phase 3 — the redesign, accounts, search and reviews

Built from a Claude Design handoff bundle (`Online shoe store redesign`). The
design's visual language was adopted wholesale; three things in it were not.

### Typography

Display face is **Instrument Serif**, self-hosted at
`apps/web/public/fonts/instrument-serif-400.woff2`. The design linked it from
`fonts.googleapis.com`; that is forbidden by rule 3 and the file is served from
our own origin instead. Body text stays on the **system stack** — a second
webfont would cost LCP and a flash of unstyled body text on exactly the device
this shop is built for.

The woff2 is committed (21KB, latin subset, SIL Open Font License) and
preloaded, since it renders the first heading on most pages. If it is ever
removed the `@font-face` fails silently and Georgia takes over — the site
degrades rather than breaks — but drop the preload at the same time, or it
404s on every page load.

### What was deliberately NOT taken from the design

| In the mock | Why it is not here |
|---|---|
| Unsplash product photography | Someone else's shoes on a real shop's page. Photos come from admin. |
| "12,400 orders delivered", "4.8★ from 1,900 reviews" | Invented social proof. Real aggregates only. |
| "Free delivery over Rs 3,000" | Delivery is per-city from the `cities` table. Adding a threshold is a pricing decision, not a design one. |
| EU sizes (36–40) on some cards | Sizes are UK. The mock was internally inconsistent. |

**Never put an invented number on this site.** `aggregateRating` in the product
JSON-LD is emitted only when real reviews exist — a fabricated one is both a lie
to shoppers and a Google manual action.

### Customer accounts

Passwordless: phone number, then a five-digit code. No email field, no password,
anywhere. Guest checkout is never more than one tap away — an account has to
earn itself, because COD shoppers abandon forms.

- **Secrets are stored hashed.** OTP codes and session tokens are both SHA-256'd
  before they touch D1, so a dumped database yields nothing replayable.
- **Codes are single-use and budgeted**: 10-minute expiry, 5 guesses, 5 sends per
  number per hour. That last one is a spend control as much as an abuse control.
- **The session cookie is `httpOnly`** — unlike the cart and saved cookies, which
  are deliberately readable so the header badges can be filled in on the client
  and catalogue pages stay edge-cacheable.
- **First sign-in adopts guest orders** placed from the same number, or a
  returning customer signs in to an empty history and the account looks broken.

> **⚠ Sending the code costs money, and nothing else in this project does.**
> An SMS gateway runs ~PKR 1–2 per message; the WhatsApp Cloud API needs Meta
> business verification, which needs the NTN and business bank account that also
> blocked JazzCash in Phase 1. `apps/web/src/lib/auth/sender.ts` defines the seam
> and ships two adapters: `log` (development — prints the code, and **refuses to
> run in production**) and `http` (any gateway accepting `{to, text}` with a
> bearer token). Set `OTP_GATEWAY_URL` and `OTP_GATEWAY_KEY` to go live, or leave
> phone sign-in switched off. This is a commercial decision, not a code one.

### Reviews

A review may only be written against a **delivered order containing that
product**, by the signed-in customer who placed it, once. Entitlement is checked
server-side on every submit, never inferred from the form having been rendered.
`db/seed/0003_reviews.sql` is development-only and must never be loaded on the
live shop.

### Search, filters and the saved list

Every facet lives in the query string and every chip is a plain `<a>`. Filtered
views are therefore linkable, shareable, back-buttonable and work with no
JavaScript. The saved list is a cookie of slugs, like the cart, so it works
signed out.

Personalised pages — anything showing a saved size, the review form, the cart or
an account — send `no-store`. **Anything person-specific must stay out of
edge-cacheable HTML**; that mistake would serve one shopper's state to the next
visitor.
