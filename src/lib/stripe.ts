// ----------------------------------------------------------------------------
// Stripe client. STRIPE_SECRET_KEY is required for checkout — when it is unset
// the export is null and /api/checkout responds 503 instead of taking bookings.
// ----------------------------------------------------------------------------

import Stripe from 'stripe';

const secretKey = import.meta.env.STRIPE_SECRET_KEY;

export const stripe: Stripe | null = secretKey ? new Stripe(secretKey) : null;
