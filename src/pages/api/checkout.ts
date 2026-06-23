import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { priceBooking, PricingError } from '../../lib/pricing';
import { getJetSki } from '../../data/jetskis';
import { getDuration, timeSlots } from '../../data/booking';
import { notifyPendingBooking } from '../../lib/notify';
import { checkoutEventId, sendMetaEvent, splitName } from '../../lib/meta';

// On-demand endpoint — must run on the server.
export const prerender = false;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface BookingInput {
  jetSkiId: string;
  duration: string;
  date: string;
  time: string;
  riders: string;
  addons: string[];
  name: string;
  email: string;
  phone: string;
}

/** Accepts both JSON (from the enhanced form) and url-encoded (no-JS fallback). */
async function readInput(request: Request): Promise<BookingInput> {
  const str = (v: FormDataEntryValue | null | undefined) => String(v ?? '').trim();

  if ((request.headers.get('content-type') ?? '').includes('application/json')) {
    const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    return {
      jetSkiId: String(b.jetSkiId ?? '').trim(),
      duration: String(b.duration ?? '').trim(),
      date: String(b.date ?? '').trim(),
      time: String(b.time ?? '').trim(),
      riders: String(b.riders ?? '1').trim(),
      addons: Array.isArray(b.addons) ? b.addons.map((a) => String(a)) : [],
      name: String(b.name ?? '').trim(),
      email: String(b.email ?? '').trim(),
      phone: String(b.phone ?? '').trim(),
    };
  }

  const fd = await request.formData();
  return {
    jetSkiId: str(fd.get('jetSkiId')),
    duration: str(fd.get('duration')),
    date: str(fd.get('date')),
    time: str(fd.get('time')),
    riders: str(fd.get('riders')) || '1',
    addons: fd.getAll('addons').map((a) => String(a)),
    name: str(fd.get('name')),
    email: str(fd.get('email')),
    phone: str(fd.get('phone')),
  };
}

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const POST: APIRoute = async ({ request }) => {
  const wantsJson = (request.headers.get('content-type') ?? '').includes('application/json');

  const fail = (message: string, status = 400): Response => {
    if (wantsJson) {
      return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(
      `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
        `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
        `<title>Booking error</title></head>` +
        `<body style="font-family:system-ui,sans-serif;background:#061620;color:#eef5f8;` +
        `display:grid;place-items:center;min-height:100vh;margin:0;text-align:center;padding:2rem">` +
        `<div><h1 style="font-size:1.6rem">We hit a snag</h1>` +
        `<p style="color:#a7bcc8">${escapeHtml(message)}</p>` +
        `<p><a href="/book" style="color:#5eead4">&larr; Back to booking</a></p></div></body></html>`,
      { status, headers: { 'content-type': 'text/html; charset=utf-8' } },
    );
  };

  const succeed = (url: string, metaEventId?: string): Response => {
    if (wantsJson) {
      return new Response(JSON.stringify({ url, metaEventId }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }
    return new Response(null, { status: 303, headers: { Location: url } });
  };

  // --- read & validate ----------------------------------------------------
  let input: BookingInput;
  try {
    input = await readInput(request);
  } catch {
    return fail('We could not read your booking details. Please try again.');
  }

  const jetSki = getJetSki(input.jetSkiId);
  if (!jetSki) return fail('Please choose a jet ski.');

  const duration = getDuration(input.duration);
  if (!duration) return fail('Please choose a rental duration.');

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) return fail('Please choose a valid date.');
  const picked = new Date(`${input.date}T12:00:00`);
  if (Number.isNaN(picked.getTime())) return fail('Please choose a valid date.');
  const earliest = new Date();
  earliest.setHours(0, 0, 0, 0);
  earliest.setDate(earliest.getDate() - 1); // 1-day grace for time zones
  if (picked < earliest) return fail('Please choose a date that is today or later.');

  if (!timeSlots.some((t) => t === input.time)) return fail('Please choose a launch time.');

  const riders = Number.parseInt(input.riders, 10);
  if (!Number.isInteger(riders) || riders < 1 || riders > jetSki.capacity) {
    return fail(`The ${jetSki.name} seats up to ${jetSki.capacity} riders.`);
  }

  if (!input.name) return fail('Please enter your name.');
  if (!EMAIL_RE.test(input.email)) return fail('Please enter a valid email address.');
  if (input.phone.replace(/\D/g, '').length < 7) {
    return fail('Please enter a valid phone number.');
  }

  // --- price on the server — browser-supplied prices are never trusted ----
  let priced;
  try {
    priced = priceBooking({
      jetSkiId: input.jetSkiId,
      duration: input.duration,
      addonIds: input.addons,
    });
  } catch (err) {
    if (err instanceof PricingError) return fail('That booking is not valid. Please review your add-ons.');
    return fail('We could not price that booking.', 500);
  }

  const addonLabels = priced.lines.slice(1).map((l) => l.label).join(', ');
  const metadata: Record<string, string> = {
    jetSki: priced.jetSki.name,
    duration: priced.durationLabel,
    date: input.date,
    time: input.time,
    riders: String(riders),
    customerName: input.name,
    customerPhone: input.phone,
    addons: addonLabels || 'None',
  };

  // Capture Meta match keys from the customer's browser now, and stash them on
  // the Stripe session. The Purchase event fires later from the webhook, whose
  // request belongs to Stripe — without these the server Purchase has no
  // fbc/fbp/IP/UA and weak Event Match Quality when the browser pixel is blocked.
  const cookieHeader = request.headers.get('cookie') ?? '';
  const readCookie = (name: string): string => {
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : '';
  };
  const fbc = readCookie('_fbc');
  const fbp = readCookie('_fbp');
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    '';
  const clientUserAgent = request.headers.get('user-agent') ?? '';
  if (fbc) metadata.fbc = fbc;
  if (fbp) metadata.fbp = fbp;
  if (clientIp) metadata.client_ip = clientIp;
  if (clientUserAgent) metadata.client_ua = clientUserAgent.slice(0, 480);

  // --- Stripe Checkout — fail loudly if the server is misconfigured -------
  if (!stripe) {
    console.error('[rentaSkii] /api/checkout called but STRIPE_SECRET_KEY is not set.');
    return fail('Payments are not configured. Please contact us to book.', 503);
  }


  try {
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: input.email,
      line_items: priced.lines.map((line) => ({
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(line.amount * 100),
          product_data: { name: line.label, description: line.detail },
        },
      })),
      metadata,
      success_url: `${origin}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/booking/cancelled`,
    });

    if (!session.url) return fail('Stripe did not return a checkout link.', 502);

    const metaEventId = checkoutEventId(session.id);
    void sendMetaEvent({
      eventName: 'InitiateCheckout',
      eventId: metaEventId,
      eventSourceUrl: `${origin}/book`,
      request,
      userData: { email: input.email, phone: input.phone, ...splitName(input.name) },
      customData: {
        value: priced.total,
        currency: 'USD',
        content_ids: [input.jetSkiId],
        content_type: 'product',
        num_items: 1,
      },
    });

    // Pending-order emails — sent now, before redirect. Full confirmation goes out
    // only after Stripe checkout completes (webhook / success-page fallback).
    const pendingResult = await notifyPendingBooking({
      reference: session.id.slice(-8).toUpperCase(),
      jetSki: priced.jetSki.name,
      duration: priced.durationLabel,
      date: input.date,
      time: input.time,
      riders: String(riders),
      addons: addonLabels || 'None',
      total: priced.total,
      customerName: input.name,
      customerEmail: input.email,
      customerPhone: input.phone,
      sessionId: session.id,
      checkoutUrl: session.url,
    });
    console.log('[rentaSkii] Pending checkout emails:', {
      reference: session.id.slice(-8).toUpperCase(),
      customerSent: pendingResult.customerEmail.sent,
      staffSent: pendingResult.staffEmail.sent,
    });

    return succeed(session.url, metaEventId);
  } catch (err) {
    console.error('[rentaSkii] Stripe checkout error:', err);
    return fail('Our payment system is briefly unavailable. Please try again in a moment.', 502);
  }
};

// Any non-POST request gets a clean 405 instead of a confusing 404.
export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed. POST a booking to this endpoint.' }), {
    status: 405,
    headers: { 'content-type': 'application/json', Allow: 'POST' },
  });
