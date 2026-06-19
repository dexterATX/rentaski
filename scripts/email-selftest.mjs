#!/usr/bin/env node
// Standalone selftest for the email + notify pipeline. Renders the customer
// email to an HTML preview, and (if a provider is configured) sends a real test.
//
//   node scripts/email-selftest.mjs                       (demo: preview only)
//
//   # Resend (recommended):
//   RESEND_API_KEY=re_xxx EMAIL_TEST_TO=you@example.com node scripts/email-selftest.mjs
//
//   # Gmail SMTP (fallback):
//   SMTP_USER=you@gmail.com SMTP_PASS=apppass node scripts/email-selftest.mjs
//
// Notes on Resend: until you verify a domain, set the From to
// "onboarding@resend.dev" (the default here) and send the test only to YOUR OWN
// Resend account email (set EMAIL_TEST_TO to it).

import { writeFileSync, mkdirSync } from 'node:fs';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const EMAIL_FROM =
  process.env.EMAIL_FROM ||
  process.env.SMTP_FROM ||
  (RESEND_API_KEY ? 'rentaSkii <onboarding@resend.dev>' : SMTP_USER);
const EMAIL_TEST_TO = process.env.EMAIL_TEST_TO || SMTP_USER;

const provider = RESEND_API_KEY ? 'resend' : SMTP_USER && SMTP_PASS ? 'smtp' : 'none';

// --- minimal copy of the email template (kept in sync with src/lib/notify.ts) -
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const rows = [
  ['Reference', 'DEMO-TEST01'],
  ['Jet ski', 'Sea-Doo GTR 230'],
  ['Date', 'Wednesday, July 15, 2026'],
  ['Launch time', '10:00 AM'],
  ['Duration', '2 Hours'],
  ['Riders', '2'],
  ['Add-ons', 'Guided Dolphin & Sandbar Tour, GoPro HERO Camera'],
  ['Total', '$377'],
];
const rowsHtml = rows.map(([l, v]) =>
  `<tr><td style="padding:10px 16px;color:#6f8896;font:600 13px system-ui,sans-serif;border-bottom:1px solid #14303f;white-space:nowrap">${esc(l)}</td>` +
  `<td style="padding:10px 16px;color:#eef5f8;font:600 15px system-ui,sans-serif;border-bottom:1px solid #14303f;text-align:right">${esc(v)}</td></tr>`).join('');
const html =
  `<!doctype html><html><body style="margin:0;background:#061620;padding:24px">` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">` +
  `<tr><td style="padding:8px 4px 20px"><span style="font:800 22px system-ui,sans-serif;color:#eef5f8">renta</span><span style="font:800 22px system-ui,sans-serif;color:#5eead4">Skii</span></td></tr>` +
  `<tr><td style="background:#0c2433;border:1px solid #14303f;border-radius:18px;padding:28px 24px">` +
  `<h1 style="margin:0 0 8px;font:800 24px system-ui,sans-serif;color:#eef5f8">You're on the water!</h1>` +
  `<p style="margin:0 0 20px;font:400 15px/1.5 system-ui,sans-serif;color:#a7bcc8">Thanks Jane, your ride is locked in. We'll text you a 30-minute delivery window the morning of your ride.</p>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#081f2c;border:1px solid #14303f;border-radius:12px;overflow:hidden">${rowsHtml}</table>` +
  `</td></tr></table></body></html>`;
const text = 'This is a rentaSkii email selftest. If you can read this, the pipeline works.';
const subject = "rentaSkii email selftest — you're booked!";

mkdirSync('scripts/preview', { recursive: true });
writeFileSync('scripts/preview/customer-email.html', html);
console.log('✓ Rendered preview → scripts/preview/customer-email.html');

if (provider === 'none') {
  console.log('• EMAIL DEMO MODE: no provider configured, no real email sent.');
  console.log('  Resend:  RESEND_API_KEY=re_xxx EMAIL_TEST_TO=you@example.com node scripts/email-selftest.mjs');
  console.log('  Gmail:   SMTP_USER=you@gmail.com SMTP_PASS=apppass node scripts/email-selftest.mjs');
  process.exit(0);
}

if (provider === 'resend') {
  if (!EMAIL_TEST_TO) {
    console.error('✗ Set EMAIL_TEST_TO to the address that should receive the test (your Resend account email until a domain is verified).');
    process.exit(1);
  }
  console.log(`• Sending via Resend  from "${EMAIL_FROM}"  to "${EMAIL_TEST_TO}" ...`);
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: EMAIL_FROM, to: [EMAIL_TEST_TO], subject, html, text }),
  });
  if (res.ok) {
    const body = await res.json().catch(() => ({}));
    console.log('✓ Resend accepted the email. id:', body.id || '(none returned)');
    process.exit(0);
  }
  console.error(`✗ Resend ${res.status}:`, (await res.text().catch(() => '')).slice(0, 400));
  console.error('  Common cause: sending to a non-account address before verifying a domain. Set EMAIL_TEST_TO to your Resend account email, or verify rentaskifl.com first.');
  process.exit(1);
}

// provider === 'smtp'
const nodemailer = (await import('nodemailer')).default;
console.log(`• Verifying Gmail SMTP for ${SMTP_USER} ...`);
const transport = nodemailer.createTransport({ service: 'gmail', auth: { user: SMTP_USER, pass: SMTP_PASS } });
try {
  await transport.verify();
  console.log('✓ SMTP connection OK');
  const info = await transport.sendMail({ from: EMAIL_FROM, to: EMAIL_TEST_TO, subject, text, html });
  console.log('✓ Test email sent:', info.messageId);
} catch (err) {
  console.error('✗ SMTP failed:', err.message);
  process.exit(1);
}
