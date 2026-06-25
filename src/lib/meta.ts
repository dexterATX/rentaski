// ----------------------------------------------------------------------------
// Meta Conversions API (server-side). Complements the browser pixel in
// BaseLayout.astro — use matching event_id values when firing the same event
// from both sides so Meta can deduplicate.
//
// Uses Meta's official capi-param-builder-nodejs SDK to build match keys
// (fbc, fbp, client_ip_address) and to normalize/hash PII. The SDK appends an
// appendix field to each hashed value that Meta's Parameter Builder screen
// detects, which is how Meta confirms the SDK is in use.
// ----------------------------------------------------------------------------

import { ParamBuilder, PII_DATA_TYPE } from 'capi-param-builder-nodejs';

const PIXEL_ID = import.meta.env.PUBLIC_META_PIXEL_ID ?? '2436825083456341';
const ACCESS_TOKEN = import.meta.env.META_CAPI_ACCESS_TOKEN;
const TEST_EVENT_CODE = import.meta.env.META_TEST_EVENT_CODE;

export const metaPixelId = PIXEL_ID;

export function metaCapiEnabled(): boolean {
  return Boolean(ACCESS_TOKEN && PIXEL_ID);
}

// One ParamBuilder per domain — it computes eTLD+1 from the host so fbc/fbp
// are formatted with the correct subdomain index. rentaSkii serves a single
// domain, so a shared instance is fine.
const paramBuilder = new ParamBuilder(['rentaskifl.com']);

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
  /**
   * Stable first-party visitor ID (rentaskii_vid cookie), hashed and sent as
   * external_id so Meta can match events across visits even when _fbp is not
   * yet set or available. Improves match quality per Meta's recommendation.
   */
  externalId?: string;
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

  const req = input.request;
  const cookies = parseCookies(req?.headers.get('cookie') ?? null);
  const ud: Record<string, string> = {};

  // Use the official SDK to extract fbc/fbp/IP from the request. It reads
  // _fbp/_fbc cookies and the fbclid query param, formats them per Meta's
  // spec, and the appendix is what Meta's Parameter Builder detects.
  if (req) {
    try {
      const url = new URL(req.url);
      const queries: Record<string, string> = {};
      url.searchParams.forEach((v, k) => { queries[k] = v; });
      paramBuilder.processRequest(
        url.host,
        queries,
        cookies,
        req.headers.get('referer'),
        req.headers.get('x-forwarded-for'),
        null,
      );
      const fbc = paramBuilder.getFbc();
      const fbp = paramBuilder.getFbp();
      const ip = paramBuilder.getClientIpAddress() ?? clientIp(req);
      const ua = req.headers.get('user-agent');
      if (fbc) ud.fbc = fbc;
      if (fbp) ud.fbp = fbp;
      if (ip) ud.client_ip_address = ip;
      if (ua) ud.client_user_agent = ua;
    } catch {
      // Fall back to manual extraction if the SDK throws on an edge-case request.
      const ip = clientIp(req);
      const ua = req.headers.get('user-agent');
      if (ip) ud.client_ip_address = ip;
      if (ua) ud.client_user_agent = ua;
      if (cookies._fbc) ud.fbc = cookies._fbc;
      if (cookies._fbp) ud.fbp = cookies._fbp;
    }
  }

  const u = input.userData;
  // PII is normalized + hashed via the SDK so the appendix field is attached,
  // which is what Meta's Parameter Builder screen looks for. The SDK handles
  // lowercasing, trimming, phone digit extraction, etc.
  if (u?.email) {
    const h = paramBuilder.getNormalizedAndHashedPII(u.email, PII_DATA_TYPE.EMAIL);
    if (h) ud.em = h;
  }
  if (u?.phone) {
    const h = paramBuilder.getNormalizedAndHashedPII(u.phone, PII_DATA_TYPE.PHONE);
    if (h) ud.ph = h;
  }
  if (u?.firstName) {
    const h = paramBuilder.getNormalizedAndHashedPII(u.firstName, PII_DATA_TYPE.FIRST_NAME);
    if (h) ud.fn = h;
  }
  if (u?.lastName) {
    const h = paramBuilder.getNormalizedAndHashedPII(u.lastName, PII_DATA_TYPE.LAST_NAME);
    if (h) ud.ln = h;
  }
  if (u?.externalId) {
    const h = paramBuilder.getNormalizedAndHashedPII(u.externalId, PII_DATA_TYPE.EXTERNAL_ID);
    if (h) ud.external_id = h;
  }

  // Explicit identifiers win over request-derived ones (used by the webhook
  // Purchase, where `request` belongs to Stripe rather than the customer).
  // These come from the Stripe session metadata, captured at checkout time.
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