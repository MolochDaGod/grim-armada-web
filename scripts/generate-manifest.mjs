/** Generate asset-manifest.json without running full optimize pipeline. */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, relative, dirname, extname } from 'path';
import { fileURLToPath } from 'url';
import { createHash } from 'crypto';
import { categoryForPath } from './asset-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, '..', 'public');

function walk(dir, filter) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

const presets = {};
for (const id of ['player', 'enemy', 'weapon', 'terrain-prop', 'structure', 'ship', 'default']) {
  const cat = categoryForPath(`models/${id}/x.glb`);
  if (cat.id === id) presets[id] = { normalizedHeight: cat.normalizedHeight, maxTexture: cat.maxTexture };
}

const assets = [];
const modelDir = join(PUBLIC, 'models');
const texDir = join(PUBLIC, 'textures');
const files = [
  ...walk(modelDir, (p) => extname(p).toLowerCase() === '.glb'),
  ...(statSync(texDir, { throwIfExists: false }) ? walk(texDir, (p) => /\.(webp|png|jpe?g)$/i.test(p)) : []),
];

for (const filePath of files) {
  const rel = relative(PUBLIC, filePath).replace(/\\/g, '/');
  const cat = categoryForPath(rel);
  assets.push({
    path: `/${rel}`,
    bytes: statSync(filePath).size,
    hash: createHash('sha256').update(readFileSync(filePath)).digest('hex').slice(0, 12),
    category: cat.id,
    normalizedHeight: cat.normalizedHeight,
  });
}

writeFileSync(join(PUBLIC, 'asset-manifest.json'), JSON.stringify({
  version: 1,
  game: 'grim-armada',
  generated: new Date().toISOString(),
  cdnPrefix: 'grim-armada',
  presets,
  assets,
}, null, 2));

console.log(`[generate-manifest] ${assets.length} assets`);