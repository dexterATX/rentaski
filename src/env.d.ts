/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Stripe API key (sk_… or rk_…). Required — checkout returns 503 when unset. */
  readonly STRIPE_SECRET_KEY?: string;
  /** Stripe webhook signing secret (whsec_…) for the /api/webhook endpoint. */
  readonly STRIPE_WEBHOOK_SECRET?: string;
  /** Public, absolute URL of the deployed site. */
  readonly PUBLIC_SITE_URL?: string;

  /** Resend API key (re_…). Preferred email provider when set. */
  readonly RESEND_API_KEY?: string;
  /** From header for outbound email, e.g. "rentaSkii <hello@rentaskifl.com>". */
  readonly EMAIL_FROM?: string;

  /** Gmail address used to send confirmation emails (SMTP user). Fallback provider. */
  readonly SMTP_USER?: string;
  /** Google App Password (16 chars) for the SMTP user. NOT the normal password. */
  readonly SMTP_PASS?: string;
  /** Legacy From header (use EMAIL_FROM going forward). Defaults to SMTP_USER. */
  readonly SMTP_FROM?: string;
  /** Optional address that receives a staff copy of every booking. Defaults to SMTP_USER / EMAIL_FROM. */
  readonly BOOKINGS_NOTIFY_EMAIL?: string;
  /** Token guarding the /api/bookings admin view. When unset, that endpoint is disabled (404). */
  readonly ADMIN_TOKEN?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
