# rentaSkii 🌊

A high-performance jet ski rental website for **rentaSkii** — a Gulf Coast watersports
business at John's Pass Village in Madeira Beach, Florida (10 minutes from Seminole).

Built with **Astro**, server-rendered booking endpoints, and **Stripe Checkout** for real
online payments. A `STRIPE_SECRET_KEY` is required — without it `/api/checkout` responds
503 and no bookings can be made.

---

## Highlights

- **Dark Gulf-Coast design** — deep ocean navy, teal surf, sunset coral. Custom CSS
  design system, self-hosted variable fonts (Outfit + Inter), zero UI frameworks.
- **Full online booking + payment** — pick a ski, date, time, duration and add-ons; pay
  through Stripe's hosted checkout.
- **Idempotent fulfillment** — the Stripe webhook persists each paid session exactly
  once, so Stripe retries never duplicate bookings or confirmation emails.
- **Works without JavaScript** — the booking form is a plain `POST`; JS only adds the
  live price preview. Pages are static-by-default for fast loads.
- **Server-side pricing** — every total is recomputed on the server in
  `src/lib/pricing.ts`. Browser-supplied prices are never trusted.
- **SEO ready** — canonical URLs, Open Graph / Twitter meta, JSON-LD
  (`SportsActivityLocation` + `FAQPage`), sitemap, and `robots.txt`.

---

## Pages

| Route                | What it is                                              |
| -------------------- | ------------------------------------------------------- |
| `/`                  | Home — hero, fleet preview, how it works, reviews       |
| `/fleet`             | All 6 jet skis with specs and rates                     |
| `/contact`           | Location, hours, directions, FAQ accordion              |
| `/book`              | Booking form with live price calculator                 |
| `/booking/success`   | Confirmation page after a paid Stripe Checkout          |
| `/booking/cancelled` | Shown when a customer backs out of Stripe Checkout      |
| `/404`               | Branded "page not found" with helpful links             |
| `/api/checkout`      | `POST` endpoint — validates, prices, creates a session  |
| `/api/webhook`       | Stripe webhook receiver (`checkout.session.completed`)  |
| `/api/bookings`      | Token-protected admin view of saved bookings (HTML/JSON/CSV) |

---

## Getting started

```bash
npm install
npm run dev
```

Open <http://localhost:4321>. Stripe keys are **required** for the booking flow — copy
`.env.example` to `.env` and fill in `STRIPE_SECRET_KEY` (use a test key locally).

### Scripts

| Command           | Action                                          |
| ----------------- | ----------------------------------------------- |
| `npm run dev`     | Start the dev server                            |
| `npm run build`   | Build the production server into `dist/`        |
| `npm run preview` | Preview the production build locally            |
| `npm start`       | Run the built server (`node ./dist/server/entry.mjs`) |

---

## Configuring payments (Stripe)

1. Create a [Stripe account](https://dashboard.stripe.com/register) and grab your keys.
2. Copy the example env file and fill it in:

   ```bash
   cp .env.example .env
   ```

   ```ini
   STRIPE_SECRET_KEY=sk_test_xxx
   STRIPE_WEBHOOK_SECRET=whsec_xxx
   PUBLIC_SITE_URL=https://rentaskifl.com
   ```

3. Use test keys (`sk_test_…`) while developing and live keys in production. A live
   **restricted** key (`rk_live_…`) also works if it has Checkout Sessions read + write.
   Until a key is set, `/api/checkout` responds 503.

### Webhook (required for fulfillment)

The webhook is where paid bookings are turned into real outcomes: it **persists
the booking** and **emails the customer and you**. Point Stripe at
`https://yourdomain.com/api/webhook` and subscribe to
`checkout.session.completed`, then paste the signing secret into
`STRIPE_WEBHOOK_SECRET`. Delivery is idempotent — Stripe retries are detected by
session id and skipped.

To test webhooks locally with the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:4321/api/webhook
```

Use Stripe's test card `4242 4242 4242 4242` with any future expiry and CVC.

---

## Confirmation emails

Every paid booking is saved and triggers two emails: a branded confirmation to
the customer and a "new booking" alert to you.

The email provider is auto-selected: **Resend** if `RESEND_API_KEY` is set, else
**Gmail SMTP** if `SMTP_USER` + `SMTP_PASS` are set, else **demo mode** (logs what
it would send; bookings still save either way).

### Option 1 — Resend (recommended)

Free tier is 3,000 emails/month. <https://resend.com>

```ini
RESEND_API_KEY=re_your_key
EMAIL_FROM=rentaSkii <hello@rentaskifl.com>   # after you verify the domain
BOOKINGS_NOTIFY_EMAIL=rentaskifl@gmail.com    # optional staff-copy address
```

Before you verify a domain, Resend only sends from `onboarding@resend.dev` and
only **to your own Resend account email** — leave `EMAIL_FROM` blank to use that
default for testing. Once you verify `rentaskifl.com` in the Resend dashboard, set
`EMAIL_FROM` to an address on it and you can email anyone.

Test it (sends to your account email):

```bash
RESEND_API_KEY=re_xxx EMAIL_TEST_TO=your_account_email node scripts/email-selftest.mjs
```

### Option 2 — Gmail SMTP (fallback)

```ini
SMTP_USER=rentaskifl@gmail.com
SMTP_PASS=your_16_char_app_password      # NOT your normal Gmail password
```

Gmail App Passwords require 2-Step Verification to be enabled first
(<https://myaccount.google.com/apppasswords>, choose "Mail"). Test with:

```bash
SMTP_USER=you@gmail.com SMTP_PASS=apppass node scripts/email-selftest.mjs
```

Both paths render an email preview to `scripts/preview/customer-email.html` and,
when a provider is configured, send a real test email.

---

## Saved bookings & admin view

Bookings are appended to `data/bookings.jsonl` (one JSON object per line). The
folder is git-ignored because it holds customer PII. Swap `src/lib/bookings.ts`
for a database or Google Sheet later without touching the rest of the app.

View them through a token-protected admin page. Set `ADMIN_TOKEN` in `.env`, then:

```
/api/bookings?token=YOUR_TOKEN              # HTML dashboard (stats + table)
/api/bookings?token=YOUR_TOKEN&format=csv   # spreadsheet download
/api/bookings?token=YOUR_TOKEN&format=json  # raw JSON
```

If `ADMIN_TOKEN` is unset the endpoint is disabled (returns 404), so it can never
leak data by accident.

---

## Project structure

```
src/
├── components/    Icon, Header, Footer, JetSkiCard, WaveDivider, …
├── data/          site, jetskis, addons, booking, faqs (edit content here)
├── layouts/       BaseLayout.astro — <head>, meta, JSON-LD, Header/Footer
├── lib/           pricing, stripe, format, icons
├── pages/         routes (see table above)
└── styles/        global.css — the design system
public/            favicon.svg, og-cover.svg, robots.txt
```

### Editing content

All copy and business data lives in `src/data/` — there's no CMS to learn:

- `site.ts` — business name, address, phone, hours, social links, rating.
- `jetskis.ts` — the fleet (specs, rates, descriptions).
- `addons.ts` — bookable extras (GoPro, dolphin tour, fuel, etc.).
- `booking.ts` — rental durations, time slots, what's included.
- `faqs.ts` — the contact-page FAQ.

> The Seminole/Madeira Beach details, phone number and address are realistic
> **placeholders**. Swap them for the real business information before launch.

### Adding real jet ski photos

Each jet ski in `jetskis.ts` has an optional `image` field. Drop a file in `public/`
and set `image: '/your-photo.jpg'`. Until then, each card renders a branded
gradient + wave placeholder.

---

## Deployment

The site builds with the Astro **Node adapter** in standalone mode, so it needs a
Node.js host (not a static-only host) because of the booking endpoints.

```bash
npm run build
npm start            # serves dist/ on the PORT env var (default 4321)
```

Set the same environment variables (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`PUBLIC_SITE_URL`) on your host. Update `site` in `astro.config.mjs` to your real
domain so canonical URLs and the sitemap are correct.

---

## Tech stack

Astro · `@astrojs/node` · `@astrojs/sitemap` · Stripe · Fontsource (Outfit + Inter).
No CSS framework, no client UI library — just a hand-built design system.
