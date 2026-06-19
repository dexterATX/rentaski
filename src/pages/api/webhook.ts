import type { APIRoute } from 'astro';
import { stripe } from '../../lib/stripe';
import { fulfillPaidCheckoutSession } from '../../lib/fulfillment';

// On-demand endpoint — must run on the server with the raw request body.
export const prerender = false;

/**
 * Stripe webhook receiver.
 *
 * Set this URL (https://yourdomain.com/api/webhook) in the Stripe dashboard,
 * subscribe to "checkout.session.completed", and paste the signing secret into
 * STRIPE_WEBHOOK_SECRET. This is where you would email the customer and the
 * dock, and persist the booking to a database or calendar.
 */
export const POST: APIRoute = async ({ request }) => {
  const webhookSecret = import.meta.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Webhook is not configured.' }), {
      status: 503,
      headers: { 'content-type': 'application/json' },
    });
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  // Signature verification requires the unparsed request body.
  const payload = await request.text();

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, webhookSecret);
  } catch (err) {
    console.error('[rentaSkii] Webhook signature verification failed:', err);
    return new Response(JSON.stringify({ error: 'Invalid signature.' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    try {
      const result = await fulfillPaidCheckoutSession(session);

      if (result.duplicate) {
        return new Response(JSON.stringify({ received: true, duplicate: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        });
      }

      // If the durable record failed to write, ask Stripe to retry — a repeat
      // email beats a paid booking that vanished from the log.
      if (!result.persisted) {
        return new Response(JSON.stringify({ error: 'Failed to persist booking.' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    } catch (err) {
      // fulfillPaidCheckoutSession should never throw, but guard anyway.
      console.error('[rentaSkii] Post-payment processing failed:', err);
      return new Response(JSON.stringify({ error: 'Processing failed.' }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      });
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
