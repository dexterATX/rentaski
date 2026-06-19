// ----------------------------------------------------------------------------
// Booking persistence. Every confirmed booking is appended as one
// JSON line to data/bookings.jsonl — a simple, durable, append-only log you can
// read, grep, or import into a spreadsheet. Swap this module for a real database
// or Google Sheets later without touching the rest of the app.
// ----------------------------------------------------------------------------

import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface BookingRecord {
  /** Short human-facing reference, e.g. "A1B2C3D4". */
  reference: string;
  jetSki: string;
  duration: string;
  date: string;
  time: string;
  riders: string;
  addons: string;
  total: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  /** "live" for a paid Stripe booking. "demo" only appears in legacy rows. */
  mode: 'live' | 'demo';
  /** Stripe Checkout session id, when present. */
  sessionId?: string;
  /** ISO timestamp the booking was recorded. */
  createdAt: string;
}

// Resolve a writable data directory at the project root (process.cwd()).
const DATA_DIR = join(process.cwd(), 'data');
const BOOKINGS_FILE = join(DATA_DIR, 'bookings.jsonl');

/**
 * Append a booking to the log. Never throws — persistence must not break the
 * payment/confirmation flow. Returns true on success, false on failure.
 */
export async function saveBooking(record: BookingRecord): Promise<boolean> {
  try {
    await mkdir(dirname(BOOKINGS_FILE), { recursive: true });
    await appendFile(BOOKINGS_FILE, JSON.stringify(record) + '\n', 'utf8');
    return true;
  } catch (err) {
    console.error('[rentaSkii] Failed to persist booking:', err);
    return false;
  }
}

/**
 * True when a booking for this Stripe Checkout session is already on file.
 * Used by the webhook to stay idempotent — Stripe retries events, and a retry
 * must not append a duplicate row or re-send confirmation emails.
 */
export async function hasBooking(sessionId: string): Promise<boolean> {
  const bookings = await readBookings();
  return bookings.some((b) => b.sessionId === sessionId);
}

/**
 * Read every persisted booking back. Useful for an admin view or a daily export.
 * Returns an empty array if the log does not exist yet.
 */
export async function readBookings(): Promise<BookingRecord[]> {
  try {
    const raw = await readFile(BOOKINGS_FILE, 'utf8');
    return raw
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as BookingRecord);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return [];
    console.error('[rentaSkii] Failed to read bookings:', err);
    return [];
  }
}
