// ----------------------------------------------------------------------------
// Paid-booking fulfillment. Shared by the Stripe webhook and the success page
// so confirmation emails send even when the webhook is delayed or unreachable
// (common in local dev without `stripe listen`).
// ----------------------------------------------------------------------------

import type Stripe from 'stripe';
import { hasBooking } from './bookings';
import { notifyBooking, type BookingDetails } from './notify';

export interface FulfillmentResult {
  duplicate: boolean;
  persisted: boolean;
  customerEmail: { sent: boolean; demo: boolean; error?: string };
  staffEmail: { sent: boolean; demo: boolean; error?: string };
}

// Serialize fulfillment so webhook retries and the success-page fallback cannot
// both pass hasBooking() before either has appended its row.
let fulfillmentQueue: Promise<unknown> = Promise.resolve();

function bookingFromSession(session: Stripe.Checkout.Session): BookingDetails {
  const reference = session.id.slice(-8).toUpperCase();
  const meta = session.metadata ?? {};
  const email = session.customer_details?.email ?? session.customer_email ?? '';

  return {
    reference,
    jetSki: meta.jetSki ?? 'Jet ski',
    duration: meta.duration ?? '',
    date: meta.date ?? '',
    time: meta.time ?? '',
    riders: meta.riders ?? '1',
    addons: meta.addons ?? 'None',
    total: (session.amount_total ?? 0) / 100,
    customerName: meta.customerName ?? '',
    customerEmail: email,
    customerPhone: meta.customerPhone ?? '',
    sessionId: session.id,
  };
}

async function fulfillOnce(session: Stripe.Checkout.Session): Promise<FulfillmentResult> {
  if (await hasBooking(session.id)) {
    console.log('[rentaSkii] Booking already fulfilled, skipping:', session.id.slice(-8).toUpperCase());
    return {
      duplicate: true,
      persisted: true,
      customerEmail: { sent: false, demo: false },
      staffEmail: { sent: false, demo: false },
    };
  }

  const booking = bookingFromSession(session);
  console.log('[rentaSkii] Fulfilling paid booking:', {
    reference: booking.reference,
    amount: booking.total,
    email: booking.customerEmail || 'unknown',
  });

  const result = await notifyBooking(booking);
  console.log('[rentaSkii] Booking processed:', {
    reference: booking.reference,
    persisted: result.persisted,
    customerEmailSent: result.customerEmail.sent,
    staffEmailSent: result.staffEmail.sent,
    customerEmailError: result.customerEmail.error,
    staffEmailError: result.staffEmail.error,
  });

  return {
    duplicate: false,
    persisted: result.persisted,
    customerEmail: result.customerEmail,
    staffEmail: result.staffEmail,
  };
}

/**
 * Persist a paid checkout session and send confirmation emails. Idempotent per
 * session id. Never throws.
 */
export async function fulfillPaidCheckoutSession(
  session: Stripe.Checkout.Session,
): Promise<FulfillmentResult> {
  const queued = fulfillmentQueue.catch(() => {}).then(() => fulfillOnce(session));
  fulfillmentQueue = queued.catch(() => {});
  return queued;
}