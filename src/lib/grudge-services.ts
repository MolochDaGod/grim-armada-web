// ============================================================
// Grudge Studio — Service Registry
// Single source of truth for all platform service URLs.
// Ported from warlord-crafting-suite/shared/services.ts
// ============================================================

const env = (key: string, fallback: string): string => {
  try {
    // @ts-ignore — import.meta.env is Vite-specific
    if (import.meta?.env?.[key]) return (import.meta as any).env[key];
  } catch {}
  return fallback;
};

const isProduction = env('MODE', '') === 'production'
  || env('VITE_ENV', '') === 'production'
  || (typeof window !== 'undefined' && window.location.hostname !== 'localhost');

// ============================================================
// Service URLs
// ============================================================

/** Auth Gateway — Grudge ID service */
export const AUTH_GATEWAY_URL = env('VITE_AUTH_GATEWAY_URL', 'https://id.grudge-studio.com');

/** Grudge Backend — main API (VPS via Coolify/Traefik) */
export const GRUDGE_API_URL = env('VITE_GRUDGE_API_URL', 'https://api.grudge-studio.com');

/** Warlord Crafting Suite — character/crafting API */
export const WCS_URL = env('VITE_WCS_URL',
  isProduction ? 'https://grudgewarlords.com' : 'http://localhost:5000',
);

/** Colyseus game server — WebSocket endpoint */
export const COLYSEUS_WS_URL = env('VITE_COLYSEUS_WS_URL',
  isProduction ? 'wss://ws.grudge-studio.com' : 'ws://localhost:2567',
);

/** Colyseus HTTP endpoint (health, room listing) */
export const COLYSEUS_HTTP_URL = env('VITE_COLYSEUS_HTTP_URL',
  isProduction ? 'https://ws.grudge-studio.com' : 'http://localhost:2567',
);

/** ObjectStore — sprite/asset CDN (Cloudflare R2 via grudge-studio.com) */
export const OBJECTSTORE_URL = env('VITE_OBJECTSTORE_URL', 'https://assets.grudge-studio.com');

/** Game asset CDN — GLB models, textures, animations */
export const ASSET_CDN_URL = env('VITE_ASSET_CDN_URL', 'https://assets.grudge-studio.com/grim-armada');

/** Grudge Wars asset resolution API */
export const GRUDGE_WARS_API_URL = env('VITE_GRUDGE_WARS_URL', 'https://grudgewarlords.com');

// ============================================================
// API Endpoint Maps
// ============================================================

export const AUTH_API = {
  guest: `${AUTH_GATEWAY_URL}/auth/guest`,
  register: `${AUTH_GATEWAY_URL}/auth/register`,
  login: `${AUTH_GATEWAY_URL}/auth/login`,
  verify: `${AUTH_GATEWAY_URL}/auth/verify`,
  profile: `${AUTH_GATEWAY_URL}/auth/me`,
  token: `${AUTH_GATEWAY_URL}/auth/token`,
  exchange: `${AUTH_GATEWAY_URL}/auth/exchange`,
} as const;

export const GAME_API = {
  health: `${GRUDGE_API_URL}/health`,
  characters: `${WCS_URL}/api/characters`,
  character: (id: string) => `${WCS_URL}/api/characters/${id}`,
  inventory: (charId: string) => `${WCS_URL}/api/inventory/${charId}`,
  craftedItems: (charId: string) => `${WCS_URL}/api/crafted-items/${charId}`,
  skills: (charId: string) => `${WCS_URL}/api/skills/${charId}`,
  recipes: (charId: string) => `${WCS_URL}/api/recipes/${charId}`,
  craft: `${WCS_URL}/api/craft`,
  skillUnlock: `${WCS_URL}/api/skills/unlock`,
  shop: {
    buyMaterial: `${WCS_URL}/api/shop/buy-material`,
    sellMaterial: `${WCS_URL}/api/shop/sell-material`,
    buyRecipe: `${WCS_URL}/api/shop/buy-recipe`,
  },
  grudaSync: `${WCS_URL}/api/gruda/sync`,
  grudaPlayer: (id: string) => `${WCS_URL}/api/gruda/player/${id}`,
} as const;

export const ASSET_API = {
  resolveAsset: `${GRUDGE_WARS_API_URL}/api/studio/resolve-asset`,
  resolveAssetBatch: `${GRUDGE_WARS_API_URL}/api/studio/resolve-asset/batch`,
  objectStore: (path: string) => `${OBJECTSTORE_URL}/${path.replace(/^\//, '')}`,
  itemIcon: (category: string, filename: string) => `${OBJECTSTORE_URL}/api/v1/${category}/${filename}`,
} as const;

export const COLYSEUS_API = {
  health: `${COLYSEUS_HTTP_URL}/colyseus/health`,
  ws: COLYSEUS_WS_URL,
} as const;

// ============================================================
// Helpers
// ============================================================

/** Check if a service is reachable */
export async function pingService(url: string, timeoutMs = 5000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { method: 'GET', signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/** Get status of all Grudge platform services */
export async function getPlatformStatus() {
  const [auth, api, colyseus] = await Promise.all([
    pingService(`${AUTH_GATEWAY_URL}/health`),
    pingService(GAME_API.health),
    pingService(COLYSEUS_API.health),
  ]);

  return {
    auth: { url: AUTH_GATEWAY_URL, ok: auth },
    api: { url: GRUDGE_API_URL, ok: api },
    colyseus: { url: COLYSEUS_WS_URL, ok: colyseus },
    objectStore: { url: OBJECTSTORE_URL, ok: true },
  };
}
