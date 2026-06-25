import type { APIRoute } from 'astro';
import { metaCapiEnabled, sendMetaEvent } from '../../lib/meta';

// Conversions API relay for browser-fired events. The page fires the pixel
// with an eventID and pings this endpoint with the same id; Meta deduplicates
// on event_id + event_name. Sending the customer's own request here gives these
// events the same IP/UA/fbc/fbp match keys as the rest of the funnel. Locked to
// a small allowlist so it can't be used to inject higher-value events (e.g.
// Purchase) into the pixel.
//
// PageView is relayed only from prerendered (static) pages, where the server
// has no live request at render time and therefore can't send a CAPI PageView
// of its own. SSR pages send CAPI PageView directly in BaseLayout and must NOT
// also beacon here, or Meta will receive two server events per page load.
export const prerender = false;

const ALLOWED_EVENTS = new Set(['Contact', 'Lead', 'PageView']);

export const POST: APIRoute = async ({ request }) => {
  // Always answer 204 — this is fire-and-forget telemetry, never user-facing.
  const noContent = () => new Response(null, { status: 204 });

  if (!metaCapiEnabled()) return noContent();

  // Reject cross-origin callers; same-origin fetch/sendBeacon is all we expect.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return noContent();
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(await request.text()) as Record<string, unknown>;
  } catch {
    return noContent();
  }

  const event = typeof body.event === 'string' ? body.event : '';
  const eventId = typeof body.eventId === 'string' ? body.eventId : '';
  if (!ALLOWED_EVENTS.has(event) || !eventId || eventId.length > 100) {
    return noContent();
  }

  const contentName =
    typeof body.contentName === 'string' ? body.contentName.slice(0, 120) : undefined;
  const sourceUrl =
    typeof body.sourceUrl === 'string' && /^https?:\/\//.test(body.sourceUrl)
      ? body.sourceUrl
      : (request.headers.get('referer') ?? undefined);

  void sendMetaEvent({
    eventName: event,
    eventId,
    eventSourceUrl: sourceUrl,
    request,
    customData: contentName ? { content_name: contentName } : undefined,
  });

  return noContent();
};

export const ALL: APIRoute = () =>
  new Response(JSON.stringify({ error: 'Method not allowed. POST events to this endpoint.' }), {
    status: 405,
    headers: { 'content-type': 'application/json', Allow: 'POST' },
  });
