#!/usr/bin/env node
/**
 * Crop the navy text footer off the add-on marketing graphics (keeping just the
 * top photo region) and emit optimized WebP thumbnails for the booking form.
 * The booking form already shows each add-on's name/description/price as text,
 * so the baked-in marketing copy is cropped out to avoid redundancy.
 *
 *   node scripts/gen-addon-thumbs.mjs
 */
import { mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assets =
  '/home/blessed/.cursor/projects/home-blessed-Desktop-01-Work-Client-Sites-rentaskii-jet-ski-rental/assets';
const outDir = join(root, 'public/photos');

// source marketing graphic → add-on id
const map = [
  ['grok-5fdab35c-2215-44fa-a54e-1e765dbebc21-93aa3627-0a11-4285-a87c-50c370550662.png', 'cooler'],
  ['grok-7f19b5ba-ce7d-4c99-b716-bff832548974-393c8bf1-e994-4956-bcc0-5623bda66dfb.png', 'comfort-pack'],
  ['grok-c6a8e893-292d-46e3-bcdc-99fb0a9af4fc-1cb2375f-c8e3-480e-b4e4-1e26a9f164bf.png', 'gopro'],
  ['grok-d6718503-b7da-4dd8-b0d4-2ab9acf94d32-3742a0a8-11c4-40f7-976e-b6df56d16053.png', 'fuel'],
  ['grok-dad9a643-9356-4eea-863b-b91c7fc488de-bbbb3abe-f84e-40e8-87de-b6e0619bd5db.png', 'dolphin-tour'],
];

// Fraction of the image height to keep from the top. The navy footer begins at
// ~64–69% across the set; 0.62 removes it on all five with a safety margin.
const KEEP = 0.62;

await mkdir(outDir, { recursive: true });

for (const [file, id] of map) {
  const src = join(assets, file);
  const meta = await sharp(src).metadata();
  const cropH = Math.round((meta.height ?? 1024) * KEEP);
  const out = join(outDir, `addon-${id}.webp`);
  await sharp(src)
    .extract({ left: 0, top: 0, width: meta.width ?? 1024, height: cropH })
    .resize({ width: 640, withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toFile(out);
  console.log(`wrote public/photos/addon-${id}.webp (${meta.width}x${cropH} crop)`);
}
console.log('done');
