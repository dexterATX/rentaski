# rentaSkii — Dogfood QA Report

**Date:** 2026-05-31
**Scope:** Full site (home, fleet, contact, book, booking/success, booking/cancelled, API checkout, 404)
**Method:** Live dev server (localhost:4321) + real browser interaction, console inspection, end-to-end booking flow, API probing.

---

## Executive Summary

The site is in strong shape. The booking flow works end to end, server-side pricing is
correct and tamper-resistant, error/cancel/405 paths all behave, and the visual design is
genuinely polished. Most findings are **launch-readiness** items, not breakage.

| Severity | Count |
| -------- | ----- |
| Critical | 0 |
| High     | 3 |
| Medium   | 1 |
| Low      | 2 |

Verified working: live price calculator ($249 + $39 + $89 = **$377**, matches server),
JSON checkout path, no-JS form POST (303 with Origin header — Astro CSRF working as designed),
demo-mode success page, API validation error HTML, 405 on GET, 404 routing.

---

## Issues

### 1. Scroll-reveal sections stay invisible under normal/fast scroll  —  HIGH · Functional/Visual
**URL:** `/` (and any page using `.reveal`)
**Description:** Sections fade in via an IntersectionObserver that adds `.is-visible`. There is
no fallback, so when a user scrolls at normal-to-fast speed, sections get skipped and stay
stuck at `opacity:0` permanently.
**Evidence (reproducible, scroll-speed dependent):**
- 400px scroll steps → **10 of 29** sections stuck: `included-copy`, `included-list`,
  `review-card` ×4, `location-copy`, `location-map`, `cta-band`, a `section-head`.
- 500px scroll steps → 3 stuck (tall bottom sections).
- A fresh IntersectionObserver fires `isIntersecting:true` on the same elements, so the
  mechanism works — the page's observer simply has no safety net.
**Impact:** The closing "Ready to ride the Gulf?" CTA and the reviews social-proof can render
blank for real users. Directly hurts conversion.
**Expected:** Every section visible after scrolling past it.
**Actual:** A scroll-speed-dependent subset never appears.
**Fix:** Add a fallback timer that reveals any still-hidden `.reveal`, and widen
`rootMargin`/lower `threshold` so tall sections trigger. (Reduced-motion + `.js` gating
already correct, so no-JS users are unaffected.)

### 2. Success page claims a confirmation email was sent, but none is  —  HIGH · Content/UX
**URL:** `/booking/success`
**Description:** The page says "A confirmation is on its way to {email}." In reality the
webhook only `console.log`s the booking; no email is sent and nothing is persisted.
**Impact:** Customers expect an email that never arrives → support load, lost trust, missed bookings.
**Fix:** Wire real confirmation email + booking persistence in `api/webhook.ts` (and demo path).

### 3. Webhook is a stub — paid bookings are not captured  —  HIGH (launch blocker) · Functional
**URL:** `/api/webhook`
**Description:** `checkout.session.completed` handler logs and returns. No email, no
database/sheet/calendar write. A real payment yields only a console line.
**Impact:** With real Stripe keys live, you could take money and have no record of the booking.
**Fix:** Email the customer + business, and persist the booking (Google Sheet/calendar or DB).

### 4. No branded 404 page  —  MEDIUM · UX/Visual
**URL:** any unknown route
**Description:** Uses Astro's default purple "404: Not Found" page — off-brand, no nav, no way back.
**Fix:** Add `src/pages/404.astro` using `BaseLayout` with a friendly on-brand message + CTA.

### 5. Placeholder business data still in place  —  LOW · Content (known/by design)
**Description:** Phone `(352) 843-3425`, gmail address, address, prices, and reviews are
placeholders (README documents this). Must be swapped before launch.

### 6. Demo mode only (no real payments yet)  —  LOW · Config (expected)
**Description:** No Stripe keys set, so checkout simulates success. Expected for current stage;
flagged for the go-live checklist.

---

## Testing notes

- **Tested:** all 6 routes + API; full happy-path booking (GTR 230 + GoPro + Dolphin tour →
  $377 → confirmed); invalid API input; GET-on-POST; 404; price calculator live updates.
- **Not tested:** real Stripe Checkout (no keys); real webhook delivery; mobile viewport
  (desktop browser only); cross-browser.
- **No JS console errors** on any page.
- **False alarm avoided:** a single full-page screenshot shows everything below the hero
  blank — that is the reveal-animation screenshot artifact, NOT a bug. The real bug (issue #1)
  was confirmed only via scroll simulation.
