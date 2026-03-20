/**
 * GRIM ARMADA — Grudge Backend API Config
 * Mirrors warlord-crafting-suite/client/src/lib/apiConfig.ts
 */

export const getBackendUrl = (): string => {
  if (import.meta.env.VITE_BACKEND_URL) return import.meta.env.VITE_BACKEND_URL;
  return window.location.origin;
};

export const API_BASE_URL = getBackendUrl();

const getCurrentUserId = (): string | null => {
  try {
    const data = localStorage.getItem('grudge_current_user');
    if (data) { const u = JSON.parse(data); return u.userId || u.id || null; }
  } catch { /* */ }
  return null;
};

const getAuthToken = (): string | null => localStorage.getItem('grudge_auth_token');

export const apiFetch = async (endpoint: string, options?: RequestInit) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const userId = getCurrentUserId();
  const token = getAuthToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (userId) headers['X-User-Id'] = userId;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(url, { ...options, credentials: 'include', headers: { ...headers, ...options?.headers } });
};

export const API = {
  // Grudge Auth
  GRUDGE_LOGIN: '/api/grudge/login',
  GRUDGE_REGISTER: '/api/grudge/register',
  GRUDGE_VERIFY: '/api/grudge/verify',
  // Characters
  CHARACTERS: '/api/characters',
  CHARACTER: (id: string) => `/api/characters/${id}`,
  // GRUDA Game
  GRUDA_PLAYER: (grudgeId: string) => `/api/gruda/player/${grudgeId}`,
  GRUDA_SYNC: '/api/gruda/sync',
  // Health
  HEALTH: '/api/health',
} as const;

/** Login with Grudge ID */
export async function grudgeLogin(username: string, password: string) {
  const res = await apiFetch(API.GRUDGE_LOGIN, {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  if (data.token) localStorage.setItem('grudge_auth_token', data.token);
  if (data.user) localStorage.setItem('grudge_current_user', JSON.stringify(data.user));
  return data;
}

/** Register new Grudge ID */
export async function grudgeRegister(username: string, password: string, email?: string) {
  const res = await apiFetch(API.GRUDGE_REGISTER, {
    method: 'POST',
    body: JSON.stringify({ username, password, email }),
  });
  if (!res.ok) throw new Error('Registration failed');
  return res.json();
}

/** Load character data from Grudge backend */
export async function loadCharacter(characterId: string) {
  const res = await apiFetch(API.CHARACTER(characterId));
  if (!res.ok) return null;
  return res.json();
}

/** Save game state to Grudge backend */
export async function syncGameState(grudgeId: string, gameState: Record<string, unknown>) {
  return apiFetch(API.GRUDA_SYNC, {
    method: 'POST',
    body: JSON.stringify({ grudgeId, gameState, source: 'grim-armada' }),
  });
}
