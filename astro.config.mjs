// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import sitemap from '@astrojs/sitemap';

// Update `site` to your real domain before deploying — it powers the sitemap,
// canonical URLs, and absolute social-share links.
export default defineConfig({
  site: 'https://rentaskifl.com',
  adapter: node({ mode: 'standalone' }),
  integrations: [sitemap()],
  // Bind dev/preview to all network interfaces so other devices on the same
  // Wi-Fi (phones, tablets) can open the site at http://<this-machine-ip>:4321
  server: {
    host: true,
    port: 4321,
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
