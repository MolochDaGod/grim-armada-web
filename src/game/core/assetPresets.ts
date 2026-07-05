/**
 * Runtime asset scale presets — sourced from asset-manifest.json when present,
 * with static fallbacks matching scripts/asset-config.mjs.
 */

export interface AssetPreset {
  normalizedHeight: number;
  maxTexture: number;
}

const FALLBACK_PRESETS: Record<string, AssetPreset> = {
  player:       { normalizedHeight: 2.0,  maxTexture: 1024 },
  enemy:        { normalizedHeight: 2.0,  maxTexture: 1024 },
  weapon:       { normalizedHeight: 1.0,  maxTexture: 512 },
  'terrain-prop': { normalizedHeight: 3.0, maxTexture: 512 },
  structure:    { normalizedHeight: 8.0,  maxTexture: 1024 },
  ship:         { normalizedHeight: 25.0, maxTexture: 1024 },
  default:      { normalizedHeight: 2.0,  maxTexture: 1024 },
};

let _manifest: { presets?: Record<string, AssetPreset>; assets?: Array<{ path: string; category: string; normalizedHeight?: number }> } | null = null;
let _manifestLoaded = false;

/** Load manifest once (non-blocking). */
export async function loadAssetManifest(): Promise<void> {
  if (_manifestLoaded) return;
  _manifestLoaded = true;
  try {
    const res = await fetch('/asset-manifest.json', { cache: 'force-cache' });
    if (res.ok) _manifest = await res.json();
  } catch { /* use fallbacks */ }
}

function categoryFromPath(localPath: string): string {
  const p = localPath.replace(/^\//, '');
  if (/\/models\/player\//i.test(p)) return 'player';
  if (/\/models\/enemies\//i.test(p)) return 'enemy';
  if (/\/models\/weapons\//i.test(p)) return 'weapon';
  if (/\/models\/terrain\//i.test(p)) return 'terrain-prop';
  if (/\/models\/(structures|colony)\//i.test(p)) return 'structure';
  if (/\/models\/ships\//i.test(p)) return 'ship';
  return 'default';
}

export function getPreset(category: string): AssetPreset {
  return _manifest?.presets?.[category]
    ?? FALLBACK_PRESETS[category]
    ?? FALLBACK_PRESETS.default;
}

/** Normalized world height for a model path (meters). */
export function getNormalizedHeight(localPath: string, override?: number): number {
  if (override != null) return override;
  const cat = categoryFromPath(localPath);
  const entry = _manifest?.assets?.find((a) => a.path === localPath || a.path === localPath.replace(/^\//, '/'));
  if (entry?.normalizedHeight) return entry.normalizedHeight;
  return getPreset(cat).normalizedHeight;
}

/** Explicit scale multiplier (for enemies with custom sizes). */
export function getScale(localPath: string, explicit?: number): number | undefined {
  return explicit;
}