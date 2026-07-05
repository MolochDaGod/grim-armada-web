/**
 * Fast pre-build validation — ensures critical assets + manifest exist.
 * Does NOT run the full pipeline (too slow for Vercel CI).
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');
const MANIFEST = join(PUBLIC, 'asset-manifest.json');

const REQUIRED = [
  '/models/player/player.glb',
  '/models/weapons/assault_rifle.glb',
  '/models/enemies/mutant.glb',
  '/textures/terrain/grass.jpg',
];

let errors = 0;

if (!existsSync(MANIFEST)) {
  console.warn('[validate-assets] asset-manifest.json missing — run `npm run assets:pipeline` locally');
  // Non-fatal: runtime falls back to asset-config presets
} else {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  console.log(`[validate-assets] manifest v${manifest.version}, ${manifest.assets?.length ?? 0} assets`);
}

for (const rel of REQUIRED) {
  const full = join(PUBLIC, rel.replace(/^\//, ''));
  if (!existsSync(full)) {
    // Try webp variant for textures
    const webp = full.replace(/\.(jpg|jpeg|png)$/i, '.webp');
    if (!existsSync(webp)) {
      console.error(`[validate-assets] MISSING required asset: ${rel}`);
      errors++;
    }
  }
}

if (errors > 0) {
  console.error(`[validate-assets] ${errors} required asset(s) missing`);
  process.exit(1);
}

console.log('[validate-assets] OK');