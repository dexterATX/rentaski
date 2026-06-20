#!/usr/bin/env node
/**
 * Quick Meta Pixel + CAPI health check.
 * Usage: node scripts/meta-health.mjs [site-url]
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = process.argv[2] ?? 'https://rentaskifl.com';
const pixel = process.env.PUBLIC_META_PIXEL_ID ?? '3954874901482377';

function loadEnv() {
  const path = resolve(root, '.env');
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const [k, ...v] = t.split('=');
    out[k.trim()] = v.join('=').trim();
  }
  return out;
}

const env = loadEnv();
const token = env.META_CAPI_ACCESS_TOKEN;
let ok = true;

const html = await fetch(site).then((r) => r.text());
const checks = [
  ['pixel init', html.includes(`fbq('init', '${pixel}'`) || html.includes(`fbq('init', ${pixel}`)],
  ['PageView track', html.includes("fbq('track', 'PageView'")],
  ['eventID dedup', html.includes('eventID')],
  ['attribution script', html.includes('meta-attribution.js')],
];

console.log(`Site: ${site}`);
for (const [name, pass] of checks) {
  console.log(`${pass ? '✓' : '✗'} ${name}`);
  if (!pass) ok = false;
}

if (!token) {
  console.log('✗ META_CAPI_ACCESS_TOKEN missing in .env');
  ok = false;
} else {
  const res = await fetch(
    `https://graph.facebook.com/v25.0/${pixel}/events?access_token=${encodeURIComponent(token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{
          event_name: 'PageView',
          event_time: Math.floor(Date.now() / 1000),
          event_id: `health-${Date.now()}`,
          action_source: 'website',
          user_data: {
            client_ip_address: '254.254.254.254',
            client_user_agent: 'rentaskii-health-check',
          },
        }],
      }),
    },
  );
  const json = await res.json();
  if (json.events_received === 1) {
    console.log('✓ CAPI token accepts events');
  } else {
    console.log('✗ CAPI error:', json.error?.message ?? json);
    ok = false;
  }
}

process.exit(ok ? 0 : 1);