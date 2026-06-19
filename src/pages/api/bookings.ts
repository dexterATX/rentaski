import type { APIRoute } from 'astro';
import { readBookings } from '../../lib/bookings';
import { usd, longDate } from '../../lib/format';
import { site } from '../../data/site';

// On-demand — reads the bookings log at request time.
export const prerender = false;

const esc = (s: string) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/**
 * Simple admin view of saved bookings.
 *
 * Protected by a token: set ADMIN_TOKEN in .env, then open
 *   /api/bookings?token=YOUR_TOKEN          (HTML table)
 *   /api/bookings?token=YOUR_TOKEN&format=json   (raw JSON)
 *   /api/bookings?token=YOUR_TOKEN&format=csv    (spreadsheet download)
 *
 * If ADMIN_TOKEN is unset the endpoint is disabled (404) so it can never leak
 * customer data by accident in production.
 */
export const GET: APIRoute = async ({ request }) => {
  const adminToken = import.meta.env.ADMIN_TOKEN;

  // Disabled unless a token is configured.
  if (!adminToken) {
    return new Response('Not found', { status: 404 });
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  if (token !== adminToken) {
    return new Response('Unauthorized', { status: 401 });
  }

  const bookings = (await readBookings()).reverse(); // newest first
  const format = url.searchParams.get('format');

  if (format === 'json') {
    return new Response(JSON.stringify(bookings, null, 2), {
      headers: { 'content-type': 'application/json' },
    });
  }

  if (format === 'csv') {
    const cols = [
      'createdAt', 'reference', 'mode', 'jetSki', 'duration', 'date', 'time',
      'riders', 'addons', 'total', 'customerName', 'customerEmail', 'customerPhone',
    ] as const;
    const escCsv = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      cols.join(','),
      ...bookings.map((b) => cols.map((c) => escCsv((b as unknown as Record<string, unknown>)[c])).join(',')),
    ];
    return new Response(lines.join('\n'), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="rentaskii-bookings.csv"',
      },
    });
  }

  // Default: a small HTML table.
  const rows = bookings
    .map(
      (b) =>
        `<tr>` +
        `<td>${esc(b.createdAt.slice(0, 16).replace('T', ' '))}</td>` +
        `<td><code>${esc(b.reference)}</code></td>` +
        `<td><span class="pill ${b.mode}">${esc(b.mode)}</span></td>` +
        `<td>${esc(b.jetSki)}</td>` +
        `<td>${esc(longDate(b.date))}<br><span class="dim">${esc(b.time)} · ${esc(b.duration)} · ${esc(b.riders)} rider(s)</span></td>` +
        `<td>${esc(b.addons)}</td>` +
        `<td class="num">${esc(usd(b.total))}</td>` +
        `<td>${esc(b.customerName)}<br><span class="dim">${esc(b.customerEmail)} · ${esc(b.customerPhone)}</span></td>` +
        `</tr>`,
    )
    .join('');

  const totalRevenue = bookings
    .filter((b) => b.mode === 'live')
    .reduce((sum, b) => sum + b.total, 0);

  const html =
    `<!doctype html><html lang="en"><head><meta charset="utf-8" />` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />` +
    `<meta name="robots" content="noindex" />` +
    `<title>Bookings · ${esc(site.name)}</title>` +
    `<style>` +
    `body{font:15px system-ui,sans-serif;background:#061620;color:#eef5f8;margin:0;padding:24px}` +
    `h1{font-size:1.4rem;margin:0 0 4px}` +
    `.sub{color:#6f8896;margin:0 0 20px}` +
    `.bar{display:flex;gap:18px;flex-wrap:wrap;margin-bottom:20px}` +
    `.stat{background:#0c2433;border:1px solid #14303f;border-radius:12px;padding:12px 18px}` +
    `.stat b{display:block;font-size:1.4rem}` +
    `.stat span{color:#6f8896;font-size:.85rem}` +
    `.links a{color:#5eead4;margin-right:14px}` +
    `table{width:100%;border-collapse:collapse;background:#0c2433;border-radius:12px;overflow:hidden}` +
    `th,td{padding:10px 12px;text-align:left;border-bottom:1px solid #14303f;vertical-align:top}` +
    `th{color:#6f8896;font-size:.8rem;text-transform:uppercase;letter-spacing:.04em}` +
    `.num{text-align:right;font-weight:700;color:#5eead4}` +
    `.dim{color:#6f8896;font-size:.85rem}` +
    `code{color:#ffc24b}` +
    `.pill{font-size:.72rem;padding:2px 8px;border-radius:999px;text-transform:uppercase}` +
    `.pill.live{background:rgba(52,211,153,.16);color:#34d399}` +
    `.pill.demo{background:rgba(255,194,75,.16);color:#ffc24b}` +
    `.empty{color:#6f8896;padding:40px;text-align:center}` +
    `</style></head><body>` +
    `<h1>${esc(site.name)} bookings</h1>` +
    `<p class="sub">${bookings.length} booking(s) · newest first</p>` +
    `<div class="bar">` +
    `<div class="stat"><b>${bookings.length}</b><span>Total bookings</span></div>` +
    `<div class="stat"><b>${bookings.filter((b) => b.mode === 'live').length}</b><span>Paid</span></div>` +
    `<div class="stat"><b>${esc(usd(totalRevenue))}</b><span>Paid revenue</span></div>` +
    `</div>` +
    `<p class="links">` +
    `<a href="?token=${esc(token)}&format=csv">⬇ Download CSV</a>` +
    `<a href="?token=${esc(token)}&format=json">View JSON</a>` +
    `</p>` +
    (bookings.length
      ? `<table><thead><tr>` +
        `<th>When</th><th>Ref</th><th>Mode</th><th>Ski</th><th>Ride</th>` +
        `<th>Add-ons</th><th>Total</th><th>Customer</th>` +
        `</tr></thead><tbody>${rows}</tbody></table>`
      : `<div class="empty">No bookings yet.</div>`) +
    `</body></html>`;

  return new Response(html, {
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
};
