/**
 * Asset category rules — single source of truth for pipeline + runtime scale.
 * Paths are matched against the relative path under public/.
 */

export const ASSET_CATEGORIES = [
  {
    id: 'player',
    match: /(^|\/)models\/player\//i,
    normalizedHeight: 2.0,
    maxTexture: 1024,
    simplifyRatio: 1.0,
  },
  {
    id: 'enemy',
    match: /(^|\/)models\/enemies\//i,
    normalizedHeight: 2.0,
    maxTexture: 1024,
    simplifyRatio: 0.85,
  },
  {
    id: 'weapon',
    match: /(^|\/)models\/weapons\//i,
    normalizedHeight: 1.0,
    maxTexture: 512,
    simplifyRatio: 1.0,
  },
  {
    id: 'terrain-prop',
    match: /(^|\/)models\/terrain\//i,
    normalizedHeight: 3.0,
    maxTexture: 512,
    simplifyRatio: 0.7,
  },
  {
    id: 'structure',
    match: /(^|\/)models\/(structures|colony)\//i,
    normalizedHeight: 8.0,
    maxTexture: 1024,
    simplifyRatio: 0.75,
  },
  {
    id: 'ship',
    match: /(^|\/)models\/ships\//i,
    normalizedHeight: 25.0,
    maxTexture: 1024,
    simplifyRatio: 0.8,
  },
  {
    id: 'default',
    match: /.*/,
    normalizedHeight: 2.0,
    maxTexture: 1024,
    simplifyRatio: 0.9,
  },
];

export const TEXTURE_RULES = [
  { match: /heightmap/i, maxSize: 1024, format: 'png', quality: 90 },
  { match: /sky/i, maxSize: 2048, format: 'webp', quality: 82 },
  { match: /.*/, maxSize: 1024, format: 'webp', quality: 80 },
];

export function categoryForPath(relativePath) {
  const normalized = relativePath.replace(/\\/g, '/');
  for (const cat of ASSET_CATEGORIES) {
    if (cat.id !== 'default' && cat.match.test(normalized)) return cat;
  }
  return ASSET_CATEGORIES.find((c) => c.id === 'default');
}