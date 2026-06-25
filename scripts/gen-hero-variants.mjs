#!/usr/bin/env node
/**
 * Generate responsive WebP variants of the hero image + a small JPEG poster
 * for the mobile video element. Idempotent: skips files that already exist
 * with the same source mtime.
 *
 *   node scripts/gen-hero-variants.mjs
 */
import { mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public/photos/hero-ride.jpg');
const outDir = join(root, 'public/photos');

const variants = [
  { w: 480,  webp: 'hero-ride-480.webp'  },
  { w: 800,  webp: 'hero-ride-800.webp',  jpg: 'hero-ride-800.jpg' },
  { w: 1200, webp: 'hero-ride-1200.webp' },
  { w: 1600, webp: 'hero-ride-1600.webp' },
  { w: 1920, webp: 'hero-ride-1920.webp', jpg: 'hero-ride-1920.jpg' },
];

const srcStat = await stat(src);
await mkdir(outDir, { recursive: true });

for (const v of variants) {
  if (v.webp) {
    const p = join(outDir, v.webp);
    if (existsSync(p) && (await stat(p)).mtimeMs >= srcStat.mtimeMs) {
      console.log(`skip  ${v.webp} (up to date)`);
    } else {
      await sharp(src).resize({ width: v.w, withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 }).toFile(p);
      console.log(`wrote ${v.webp}`);
    }
  }
  if (v.jpg) {
    const p = join(outDir, v.jpg);
    if (existsSync(p) && (await stat(p)).mtimeMs >= srcStat.mtimeMs) {
      console.log(`skip  ${v.jpg} (up to date)`);
    } else {
      await sharp(src).resize({ width: v.w, withoutEnlargement: true })
        .jpeg({ quality: 70, progressive: true, mozjpeg: true }).toFile(p);
      console.log(`wrote ${v.jpg}`);
    }
  }
}
console.log('done');
