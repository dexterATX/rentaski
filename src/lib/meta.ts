// ----------------------------------------------------------------------------
// Meta Conversions API (server-side). Complements the browser pixel in
// BaseLayout.astro — use matching event_id values when firing the same event
// from both sides so Meta can deduplicate.
// ----------------------------------------------------------------------------

import { createHash } from 'node:crypto';

const PIXEL_ID = import.meta.env.PUBLIC_META_PIXEL_ID ?? '3954874901482377';
const ACCESS_TOKEN = import.meta.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = import.meta.env.META_TEST_EVENT_CODE;

export const metaPixelId = PIXEL_ID;

export function metaCapiEnabled(): boolean {
  return Boolean(ACCESS_TOKEN && PIXEL_ID);
}

function sha256(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k) out[k] = decodeURIComponent(v.join('='));
  }
  return out;
}

function clientIp(request: Request): string | undefined {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim();
  return request.headers.get('x-real-ip') ?? undefined;
}

function utmFromCookies(cookies: Record<string, string>): Record<string, string> {
  const raw = cookies.rentaskii_utm;
  if (!raw) return {};
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string' && v) out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

export function checkoutEventId(sessionId: string): string {
  return `checkout-${sessionId}`;
}

export function purchaseEventId(sessionId: string): string {
  return `purchase-${sessionId}`;
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  /**
   * Identifiers captured from the customer's browser at checkout and replayed
   * on events fired later without a live browser request (the Stripe webhook
   * Purchase). When set they take precedence over anything derived from
   * `request`, which for a webhook would be Stripe's IP/UA, not the customer's.
   */
  fbc?: string;
  fbp?: string;
  clientIpAddress?: string;
  clientUserAgent?: string;
}

export interface MetaEventInput {
  eventName: string;
  eventId: string;
  eventTime?: number;
  eventSourceUrl?: string;
  request?: Request;
  userData?: MetaUserData;
  customData?: Record<string, unknown>;
}

export interface MetaSendResult {
  ok: boolean;
  error?: string;
  response?: unknown;
}

export async function sendMetaEvent(input: MetaEventInput): Promise<MetaSendResult> {
  if (!metaCapiEnabled()) {
    return { ok: false, error: 'META_CAPI_ACCESS_TOKEN not configured' };
  }

  const cookies = parseCookies(input.request?.headers.get('cookie') ?? null);
  const ud: Record<string, string> = {};

  if (input.request) {
    const ip = clientIp(input.request);
    const ua = input.request.headers.get('user-agent');
    if (ip) ud.client_ip_address = ip;
    if (ua) ud.client_user_agent = ua;
  }
  if (cookies._fbc) ud.fbc = cookies._fbc;
  if (cookies._fbp) ud.fbp = cookies._fbp;

  const u = input.userData;
  if (u?.email) ud.em = sha256(u.email);
  if (u?.phone) ud.ph = sha256(u.phone.replace(/\D/g, ''));
  if (u?.firstName) ud.fn = sha256(u.firstName);
  if (u?.lastName) ud.ln = sha256(u.lastName);

  // Explicit identifiers win over request-derived ones (used by the webhook
  // Purchase, where `request` belongs to Stripe rather than the customer).
  if (u?.fbc) ud.fbc = u.fbc;
  if (u?.fbp) ud.fbp = u.fbp;
  if (u?.clientIpAddress) ud.client_ip_address = u.clientIpAddress;
  if (u?.clientUserAgent) ud.client_user_agent = u.clientUserAgent;

  const event: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    user_data: ud,
  };
  if (input.eventSourceUrl) event.event_source_url = input.eventSourceUrl;
  const utm = utmFromCookies(cookies);
  const customData = { ...utm, ...(input.customData ?? {}) };
  if (Object.keys(customData).length) event.custom_data = customData;

  const body: Record<string, unknown> = { data: [event] };
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/v25.0/${PIXEL_ID}/events?access_token=${encodeURIComponent(ACCESS_TOKEN!)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      events_received?: number;
    };
    if (!res.ok || json.error) {
      const msg = json.error?.message ?? `HTTP ${res.status}`;
      console.error('[rentaSkii] Meta CAPI error:', msg);
      return { ok: false, error: msg, response: json };
    }
    return { ok: true, response: json };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[rentaSkii] Meta CAPI fetch failed:', msg);
    return { ok: false, error: msg };
  }
}

export function splitName(full: string): { firstName?: string; lastName?: string } {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return {};
  if (parts.length === 1) return { firstName: parts[0] };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}