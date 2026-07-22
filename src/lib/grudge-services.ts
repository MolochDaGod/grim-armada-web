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

const isBrowser = (): boolean => typeof window !== 'undefined';

const isDeployedApp = (): boolean =>
  isBrowser() && window.location.hostname !== 'localhost';

// ============================================================
// Service URLs (runtime — never bake browser-only origins at build time)
// ============================================================

/**
 * Auth Gateway — Grudge ID service.
 * Browser: same-origin `/api/auth/*` (vercel.json rewrites → id.grudge-studio.com).
 */
export function getAuthBase(): string {
  const override = env('VITE_AUTH_GATEWAY_URL', '');
  if (override) {
    const base = override.replace(/\/$/, '');
    return base.endsWith('/auth') ? base : `${base}/auth`;
  }
  if (isDeployedApp()) return '/api/auth';
  return 'https://id.grudge-studio.com/auth';
}

/** Auth gateway root (for health checks / display) */
export function getAuthGatewayUrl(): string {
  const override = env('VITE_AUTH_GATEWAY_URL', '');
  if (override) return override.replace(/\/$/, '').replace(/\/auth$/, '');
  if (isDeployedApp()) return window.location.origin;
  return 'https://id.grudge-studio.com';
}

/** @deprecated use getAuthGatewayUrl() — kept for imports that expect a constant */
export const AUTH_GATEWAY_URL = 'https://id.grudge-studio.com';

/** Grudge Backend — Railway game-data (same-origin /api on Vercel). */
export function getGrudgeApiUrl(): string {
  const override = env('VITE_GRUDGE_API_URL', '') || env('VITE_BACKEND_URL', '');
  if (override) return override.replace(/\/$/, '');
  if (isDeployedApp()) return ''; // same-origin /api/* → Railway via vercel.json
  return 'https://grudge-api-production-0d46.up.railway.app';
}

/** @deprecated use getGrudgeApiUrl() */
export const GRUDGE_API_URL = 'https://grudge-api-production-0d46.up.railway.app';

/** Character / account API base (same-origin in prod). */
export function getWcsUrl(): string {
  const override = env('VITE_WCS_URL', '');
  if (override) return override.replace(/\/$/, '');
  if (isDeployedApp()) return ''; // same-origin /api/* rewrites → Railway
  return 'https://grudge-api-production-0d46.up.railway.app';
}

/** Colyseus game server — WebSocket endpoint */
export const COLYSEUS_WS_URL = env('VITE_COLYSEUS_WS_URL',
  isBrowser() && isDeployedApp() ? 'wss://ws.grudge-studio.com' : 'ws://localhost:2567',
);

/** Colyseus HTTP endpoint (health, room listing) */
export const COLYSEUS_HTTP_URL = env('VITE_COLYSEUS_HTTP_URL',
  isBrowser() && isDeployedApp() ? 'https://ws.grudge-studio.com' : 'http://localhost:2567',
);

/** AI hub — grudge-ai-hub (chat may require API key; tools are local in-game) */
export function getAiHubUrl(): string {
  const override = env('VITE_AI_HUB_URL', '');
  if (override) return override.replace(/\/$/, '');
  if (isDeployedApp()) return '/api/ai'; // vercel rewrite → ai.grudge-studio.com
  return 'https://ai.grudge-studio.com';
}

/** ObjectStore — sprite/asset CDN (Cloudflare R2 via grudge-studio.com) */
export const OBJECTSTORE_URL = env('VITE_OBJECTSTORE_URL', 'https://assets.grudge-studio.com');

/** Game asset CDN — GLB models, textures, animations */
export const ASSET_CDN_URL = env('VITE_ASSET_CDN_URL', 'https://assets.grudge-studio.com/grim-armada');

/** Grudge Wars asset resolution API */
export function getGrudgeWarsApiUrl(): string {
  const override = env('VITE_GRUDGE_WARS_URL', '');
  if (override) return override.replace(/\/$/, '');
  if (isDeployedApp()) return ''; // same-origin /api/*
  return 'https://grudgewarlords.com';
}

// ============================================================
// API Endpoint Maps (lazy getters — evaluated in the browser at call time)
// ============================================================

export const AUTH_API = {
  get guest() { return `${getAuthBase()}/guest`; },
  get register() { return `${getAuthBase()}/register`; },
  get login() { return `${getAuthBase()}/login`; },
  get verify() { return `${getAuthBase()}/verify`; },
  get profile() { return `${getAuthBase()}/me`; },
  get token() { return `${getAuthBase()}/token`; },
  get exchange() { return `${getAuthBase()}/exchange`; },
};

export const GAME_API = {
  get health() {
    const base = getGrudgeApiUrl();
    return base ? `${base}/api/health` : '/api/health';
  },
  get characters() { return `${getWcsUrl()}/api/characters`; },
  character: (id: string) => `${getWcsUrl()}/api/characters/${id}`,
  inventory: (charId: string) => `${getWcsUrl()}/api/inventory/${charId}`,
  craftedItems: (charId: string) => `${getWcsUrl()}/api/crafted-items/${charId}`,
  skills: (charId: string) => `${getWcsUrl()}/api/skills/${charId}`,
  recipes: (charId: string) => `${getWcsUrl()}/api/recipes/${charId}`,
  get craft() { return `${getWcsUrl()}/api/craft`; },
  get skillUnlock() { return `${getWcsUrl()}/api/skills/unlock`; },
  shop: {
    get buyMaterial() { return `${getWcsUrl()}/api/shop/buy-material`; },
    get sellMaterial() { return `${getWcsUrl()}/api/shop/sell-material`; },
    get buyRecipe() { return `${getWcsUrl()}/api/shop/buy-recipe`; },
  },
  get grudaSync() { return `${getWcsUrl()}/api/gruda/sync`; },
  grudaPlayer: (id: string) => `${getWcsUrl()}/api/gruda/player/${id}`,
};

export const ASSET_API = {
  get resolveAsset() { return `${getGrudgeWarsApiUrl()}/api/studio/resolve-asset`; },
  get resolveAssetBatch() { return `${getGrudgeWarsApiUrl()}/api/studio/resolve-asset/batch`; },
  objectStore: (path: string) => `${OBJECTSTORE_URL}/${path.replace(/^\//, '')}`,
  itemIcon: (category: string, filename: string) => `${OBJECTSTORE_URL}/api/v1/${category}/${filename}`,
};

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
  const authPing = getAuthBase() === '/api/auth'
    ? '/api/auth/verify'
    : `${getAuthGatewayUrl()}/health`;

  const [auth, api, colyseus] = await Promise.all([
    pingService(authPing),
    pingService(GAME_API.health),
    pingService(COLYSEUS_API.health),
  ]);

  return {
    auth: { url: getAuthGatewayUrl(), ok: auth },
    api: { url: GRUDGE_API_URL, ok: api },
    colyseus: { url: COLYSEUS_WS_URL, ok: colyseus },
    objectStore: { url: OBJECTSTORE_URL, ok: true },
  };
}