// ----------------------------------------------------------------------------
// Email delivery — provider-agnostic with a graceful demo fallback.
//
// Provider is auto-selected from environment variables, in priority order:
//   1. Resend  — set RESEND_API_KEY  (recommended; modern transactional email)
//   2. Gmail SMTP — set SMTP_USER + SMTP_PASS (nodemailer)
//   3. Demo mode — neither set: logs what it WOULD send, never actually sends.
//
// Every confirmed booking still saves to data/bookings.jsonl regardless of which
// path is active, so demo mode is safe for local dev and previews.
//
// --- Resend setup (recommended) --------------------------------------------
//   1. Sign up at https://resend.com (free: 3,000 emails/month).
//   2. Create an API key → put it in .env as RESEND_API_KEY=re_xxx
//   3. From address (EMAIL_FROM):
//        • Before verifying a domain, Resend only lets you send via
//          "onboarding@resend.dev" AND only to your own account email.
//          That's the default here — enough to prove the pipeline works.
//        • After you verify rentaskifl.com in the Resend dashboard, set
//          EMAIL_FROM="rentaSkii <hello@rentaskifl.com>" to send to anyone.
//
// --- Gmail SMTP setup (fallback) -------------------------------------------
//   SMTP_USER=rentaskifl@gmail.com
//   SMTP_PASS=<16-char Google App Password>   (NOT your normal password)
//   (App Passwords require 2-Step Verification to be enabled first.)
// ----------------------------------------------------------------------------

import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

const RESEND_API_KEY = import.meta.env.RESEND_API_KEY;

const SMTP_USER = import.meta.env.SMTP_USER;
const SMTP_PASS = import.meta.env.SMTP_PASS;

// From header. Resend needs a verified-domain address (defaults to the shared
// onboarding sender until you verify your own domain). Gmail defaults to the
// SMTP user. EMAIL_FROM (or legacy SMTP_FROM) overrides either.
const EMAIL_FROM =
  import.meta.env.EMAIL_FROM ||
  import.meta.env.SMTP_FROM ||
  (RESEND_API_KEY ? 'rentaSkii <onboarding@resend.dev>' : SMTP_USER) ||
  'onboarding@resend.dev';

type Provider = 'resend' | 'smtp' | 'none';

const provider: Provider = RESEND_API_KEY ? 'resend' : SMTP_USER && SMTP_PASS ? 'smtp' : 'none';

/** True when real outbound email is configured (either provider). */
export const emailEnabled = provider !== 'none';

/** Which backend is active — handy for logs and the selftest script. */
export const emailProvider = provider;

let cachedTransport: Transporter | null = null;

function getSmtpTransport(): Transporter | null {
  if (provider !== 'smtp') return null;
  if (!cachedTransport) {
    cachedTransport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return cachedTransport;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Optional reply-to (e.g. the customer's address on the staff copy). */
  replyTo?: string;
}

async function sendViaResend(
  msg: EmailMessage,
): Promise<{ sent: boolean; demo: boolean; error?: string }> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        ...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
      }),
    });

    if (res.ok) return { sent: true, demo: false };

    // Surface Resend's error body so misconfiguration (unverified domain, bad
    // key) is obvious in the logs without leaking the API key.
    const detail = await res.text().catch(() => '');
    const error = `Resend ${res.status}: ${detail.slice(0, 300)}`;
    console.error('[rentaSkii] Resend send failed:', error);
    return { sent: false, demo: false, error };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[rentaSkii] Resend request failed:', error);
    return { sent: false, demo: false, error };
  }
}

async function sendViaSmtp(
  msg: EmailMessage,
): Promise<{ sent: boolean; demo: boolean; error?: string }> {
  const transport = getSmtpTransport();
  if (!transport) return { sent: false, demo: true };
  try {
    await transport.sendMail({
      from: EMAIL_FROM,
      to: msg.to,
      subject: msg.subject,
      text: msg.text,
      html: msg.html,
      replyTo: msg.replyTo,
    });
    return { sent: true, demo: false };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[rentaSkii] SMTP send failed:', error);
    return { sent: false, demo: false, error };
  }
}

/**
 * Send an email. Never throws — a failed send must not break the booking flow.
 * In demo mode (no provider configured) it logs a summary and reports
 * sent=false with demo=true so callers can tell a real send from a simulated one.
 */
export async function sendEmail(
  msg: EmailMessage,
): Promise<{ sent: boolean; demo: boolean; error?: string }> {
  if (provider === 'resend') return sendViaResend(msg);
  if (provider === 'smtp') return sendViaSmtp(msg);

  console.log(
    `[rentaSkii] (email demo) → ${msg.to} | ${msg.subject} ` +
      `(set RESEND_API_KEY, or SMTP_USER + SMTP_PASS, to send for real)`,
  );
  return { sent: false, demo: true };
}

/** Verify the active provider's credentials. Used by the email selftest script. */
export async function verifyEmail(): Promise<{ ok: boolean; demo: boolean; provider: Provider; error?: string }> {
  if (provider === 'none') return { ok: false, demo: true, provider };

  if (provider === 'resend') {
    // Resend has no dedicated verify endpoint; list domains as a cheap auth check.
    try {
      const res = await fetch('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
      });
      if (res.ok) return { ok: true, demo: false, provider };
      return { ok: false, demo: false, provider, error: `Resend ${res.status}` };
    } catch (err) {
      return { ok: false, demo: false, provider, error: err instanceof Error ? err.message : String(err) };
    }
  }

  const transport = getSmtpTransport();
  if (!transport) return { ok: false, demo: true, provider };
  try {
    await transport.verify();
    return { ok: true, demo: false, provider };
  } catch (err) {
    return { ok: false, demo: false, provider, error: err instanceof Error ? err.message : String(err) };
  }
}
