// ----------------------------------------------------------------------------
// Booking notifications.
//   • notifyPendingBooking() — when the customer clicks Book and is sent to
//     Stripe. Emails a "complete payment" notice; does not persist the booking.
//   • notifyBooking() — after Stripe checkout completes. Persists the booking
//     and sends the full confirmation to customer + staff.
// Both never throw — a failed send must not break checkout or payment.
// ----------------------------------------------------------------------------

import { site } from '../data/site';
import { usd, longDate } from './format';
import { sendEmail } from './email';
import { saveBooking, type BookingRecord } from './bookings';

export interface BookingDetails {
  reference: string;
  jetSki: string;
  duration: string;
  date: string; // YYYY-MM-DD
  time: string;
  riders: string;
  addons: string; // comma-separated, or "None"
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  sessionId?: string;
}

export interface PendingBookingDetails extends BookingDetails {
  /** Stripe Checkout URL — included so the customer can resume if they leave. */
  checkoutUrl: string;
}

const STAFF_EMAIL = import.meta.env.BOOKINGS_NOTIFY_EMAIL || import.meta.env.SMTP_USER || site.email;

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Pretty date via the shared formatter: "Wednesday, July 15, 2026". */
function prettyDate(iso: string): string {
  return longDate(iso);
}

interface Row {
  label: string;
  value: string;
}

function rowsFor(b: BookingDetails): Row[] {
  return [
    { label: 'Reference', value: b.reference },
    { label: 'Jet ski', value: b.jetSki },
    { label: 'Date', value: prettyDate(b.date) },
    { label: 'Launch time', value: b.time },
    { label: 'Duration', value: b.duration },
    { label: 'Riders', value: b.riders },
    { label: 'Add-ons', value: b.addons || 'None' },
    { label: 'Total', value: usd(b.total) },
  ];
}

function rowsHtml(rows: Row[]): string {
  return rows
    .map(
      (r) =>
        `<tr>` +
        `<td style="padding:10px 16px;color:#6f8896;font:600 13px system-ui,sans-serif;` +
        `border-bottom:1px solid #14303f;white-space:nowrap">${esc(r.label)}</td>` +
        `<td style="padding:10px 16px;color:#eef5f8;font:600 15px system-ui,sans-serif;` +
        `border-bottom:1px solid #14303f;text-align:right">${esc(r.value)}</td>` +
        `</tr>`,
    )
    .join('');
}

function rowsText(rows: Row[]): string {
  return rows.map((r) => `  ${r.label.padEnd(12)} ${r.value}`).join('\n');
}

/** Shell wrapper for a branded HTML email. */
function emailShell(heading: string, intro: string, rows: Row[], footer: string): string {
  return (
    `<!doctype html><html><body style="margin:0;background:#061620;padding:24px">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto">` +
    `<tr><td style="padding:8px 4px 20px">` +
    `<span style="font:800 22px system-ui,sans-serif;color:#eef5f8">renta</span>` +
    `<span style="font:800 22px system-ui,sans-serif;color:#5eead4">Skii</span>` +
    `</td></tr>` +
    `<tr><td style="background:#0c2433;border:1px solid #14303f;border-radius:18px;padding:28px 24px">` +
    `<h1 style="margin:0 0 8px;font:800 24px system-ui,sans-serif;color:#eef5f8">${esc(heading)}</h1>` +
    `<p style="margin:0 0 20px;font:400 15px/1.5 system-ui,sans-serif;color:#a7bcc8">${intro}</p>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" ` +
    `style="background:#081f2c;border:1px solid #14303f;border-radius:12px;overflow:hidden">` +
    rowsHtml(rows) +
    `</table>` +
    `<p style="margin:20px 0 0;font:400 14px/1.5 system-ui,sans-serif;color:#a7bcc8">${footer}</p>` +
    `</td></tr>` +
    `<tr><td style="padding:18px 4px;font:400 12px system-ui,sans-serif;color:#6f8896">` +
    `${esc(site.legalName)} · ${esc(site.phone)} · ${esc(site.serviceArea)}` +
    `</td></tr>` +
    `</table></body></html>`
  );
}

function pendingCustomerEmail(
  b: PendingBookingDetails,
): { subject: string; html: string; text: string } {
  const rows = rowsFor(b);
  const subject = `Complete payment — ${b.jetSki} on ${prettyDate(b.date)} — ${site.name}`;
  const intro =
    `Hi ${esc(b.customerName.split(' ')[0] || b.customerName)}, you're almost on the water. ` +
    `We saved your booking details — finish payment on Stripe to lock in your ride. ` +
    `Your slot is not reserved until payment completes.`;
  const footer =
    `Resume checkout: <a href="${esc(b.checkoutUrl)}" style="color:#5eead4">` +
    `${esc(b.checkoutUrl)}</a>. Questions? Call ` +
    `<a href="tel:${esc(site.phoneHref)}" style="color:#5eead4">${esc(site.phone)}</a>.`;
  const html = emailShell('Almost there — complete payment', intro, rows, footer);
  const text =
    `Complete payment — ${site.name}\n\n` +
    `Hi ${b.customerName}, finish payment to lock in your ride.\n\n` +
    rowsText(rows) +
    `\n\nResume checkout: ${b.checkoutUrl}\n` +
    `Your slot is not reserved until payment completes.\n` +
    `Questions? Call ${site.phone}.\n`;
  return { subject, html, text };
}

function pendingStaffEmail(b: PendingBookingDetails): { subject: string; html: string; text: string } {
  const rows: Row[] = [
    ...rowsFor(b),
    { label: 'Customer', value: b.customerName },
    { label: 'Email', value: b.customerEmail },
    { label: 'Phone', value: b.customerPhone },
    { label: 'Payment', value: 'Pending (Stripe)' },
  ];
  const subject =
    `⏳ Pending checkout: ${b.jetSki} · ${prettyDate(b.date)} ${b.time} · ${b.customerName}`;
  const intro = `A customer started checkout but has not paid yet.`;
  const footer =
    `They were sent to Stripe. You'll get the full booking email once payment completes.`;
  const html = emailShell('Pending checkout', intro, rows, footer);
  const text = `Pending checkout — ${site.name}\n\n` + rowsText(rows) + '\n';
  return { subject, html, text };
}

function customerEmail(b: BookingDetails): { subject: string; html: string; text: string } {
  const rows = rowsFor(b);
  const subject = `You're booked! ${b.jetSki} on ${prettyDate(b.date)} — ${site.name}`;
  const intro =
    `Thanks ${esc(b.customerName.split(' ')[0] || b.customerName)}, your ride is locked in. ` +
    `We'll text you a 30-minute delivery window the morning of your ride.`;
  const footer =
    `Need to change anything? Just reply to this email or call ` +
    `<a href="tel:${esc(site.phoneHref)}" style="color:#5eead4">${esc(site.phone)}</a>. ` +
    `${esc(site.cancellation)}`;
  const html = emailShell("You're on the water!", intro, rows, footer);
  const text =
    `You're booked! — ${site.name}\n\n` +
    `Thanks ${b.customerName}, your ride is locked in.\n\n` +
    rowsText(rows) +
    `\n\nWe'll text you a 30-minute delivery window the morning of your ride.\n` +
    `Questions? Call ${site.phone}. ${site.cancellation}\n`;
  return { subject, html, text };
}

function staffEmail(b: BookingDetails): { subject: string; html: string; text: string } {
  const rows: Row[] = [
    ...rowsFor(b),
    { label: 'Customer', value: b.customerName },
    { label: 'Email', value: b.customerEmail },
    { label: 'Phone', value: b.customerPhone },
    { label: 'Payment', value: 'Paid (Stripe)' },
  ];
  const subject =
    `💰 New booking: ${b.jetSki} · ${prettyDate(b.date)} ${b.time} · ${b.customerName}`;
  const intro = `New paid booking just came in.`;
  const footer = `Logged to data/bookings.jsonl.`;
  const html = emailShell('New booking', intro, rows, footer);
  const text = `New paid booking — ${site.name}\n\n` + rowsText(rows) + '\n';
  return { subject, html, text };
}

/**
 * Send pending-order emails when the customer is redirected to Stripe.
 * Does not persist — the booking is only saved after payment.
 * Never throws.
 */
export async function notifyPendingBooking(b: PendingBookingDetails): Promise<{
  customerEmail: { sent: boolean; demo: boolean; error?: string };
  staffEmail: { sent: boolean; demo: boolean; error?: string };
}> {
  const cust = pendingCustomerEmail(b);
  const customerResult = b.customerEmail
    ? await sendEmail({
        to: b.customerEmail,
        subject: cust.subject,
        html: cust.html,
        text: cust.text,
      })
    : { sent: false, demo: false, error: 'no customer email' };

  const staff = pendingStaffEmail(b);
  const staffResult = STAFF_EMAIL
    ? await sendEmail({
        to: STAFF_EMAIL,
        subject: staff.subject,
        html: staff.html,
        text: staff.text,
        replyTo: b.customerEmail || undefined,
      })
    : { sent: false, demo: false, error: 'no staff email' };

  return { customerEmail: customerResult, staffEmail: staffResult };
}

/**
 * Persist the booking and send full confirmation emails after payment.
 * Never throws.
 */
export async function notifyBooking(b: BookingDetails): Promise<{
  persisted: boolean;
  customerEmail: { sent: boolean; demo: boolean; error?: string };
  staffEmail: { sent: boolean; demo: boolean; error?: string };
}> {
  // 1. Persist first — the durable record matters most.
  const record: BookingRecord = {
    reference: b.reference,
    jetSki: b.jetSki,
    duration: b.duration,
    date: b.date,
    time: b.time,
    riders: b.riders,
    addons: b.addons || 'None',
    total: b.total,
    customerName: b.customerName,
    customerEmail: b.customerEmail,
    customerPhone: b.customerPhone,
    mode: 'live',
    sessionId: b.sessionId,
    createdAt: new Date().toISOString(),
  };
  const persisted = await saveBooking(record);

  // 2. Email the customer.
  const cust = customerEmail(b);
  const customerResult = b.customerEmail
    ? await sendEmail({
        to: b.customerEmail,
        subject: cust.subject,
        html: cust.html,
        text: cust.text,
      })
    : { sent: false, demo: false, error: 'no customer email' };

  // 3. Email staff (reply-to = customer so you can respond directly).
  const staff = staffEmail(b);
  const staffResult = STAFF_EMAIL
    ? await sendEmail({
        to: STAFF_EMAIL,
        subject: staff.subject,
        html: staff.html,
        text: staff.text,
        replyTo: b.customerEmail || undefined,
      })
    : { sent: false, demo: false, error: 'no staff email' };

  return { persisted, customerEmail: customerResult, staffEmail: staffResult };
}
