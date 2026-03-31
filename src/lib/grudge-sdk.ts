// ============================================================
// Grudge Studio — Client SDK
// Auth, character management, game state sync, Colyseus rooms.
// Adapted from warlord-crafting-suite/shared/grudge-client.ts
// ============================================================

import {
  AUTH_API, GAME_API, ASSET_API, COLYSEUS_WS_URL, OBJECTSTORE_URL,
} from './grudge-services';

// ============================================================
// Types
// ============================================================

export interface GrudgeAuth {
  token: string;
  grudgeId: string;
  userId: string;
  username: string;
}

export interface GrudgeCharacter {
  id: string;
  name: string;
  characterClass: string;
  race: string;
  level: number;
  xp: number;
  gold: number;
  attributes: Record<string, number>;
  equipment: Record<string, string>;
  professions?: Record<string, { level: number; xp: number }>;
}

export interface SurvivalGameState {
  heroProgression: any;
  professions: any[];
  inventory: any;
  skillTreeStates: any[];
  resourceSpawns?: any[];
}

// ============================================================
// GrudgeClient
// ============================================================

export class GrudgeClient {
  private auth: GrudgeAuth | null = null;
  private syncTimer: ReturnType<typeof setInterval> | null = null;
  static readonly AUTH_PAGE = 'https://id.grudge-studio.com/auth';

  constructor() {
    // Consume returning token from unified auth redirect (hash fragment)
    this.consumeAuthHash();
    // Restore auth from storage
    if (typeof localStorage !== 'undefined') {
      const token = localStorage.getItem('grudge_auth_token');
      const cached = localStorage.getItem('grudge_auth');
      if (token && cached) {
        try { this.auth = JSON.parse(cached); } catch {}
      }
    }
  }

  /** Redirect to unified Grudge auth page. */
  redirectToLogin(returnUrl?: string) {
    const redirect = encodeURIComponent(returnUrl || window.location.href);
    window.location.href = `${GrudgeClient.AUTH_PAGE}?redirect=${redirect}&app=grim-armada`;
  }

  /** Require auth — redirects if not logged in. */
  requireAuth(): boolean {
    if (this.isAuthenticated()) return true;
    this.redirectToLogin();
    return false;
  }

  /** Consume returning token from URL hash fragment after unified auth. */
  private consumeAuthHash(): boolean {
    if (typeof location === 'undefined' || !location.hash || location.hash.length < 2) return false;
    const hash = new URLSearchParams(location.hash.slice(1));
    const token = hash.get('token');
    if (!token) return false;
    this.auth = {
      token,
      grudgeId: hash.get('grudgeId') || '',
      userId: hash.get('grudgeId') || '',
      username: hash.get('name') || 'Player',
    };
    this.persistAuth();
    history.replaceState(null, '', location.pathname + location.search);
    return true;
  }

  // --- Auth ---

  /** Login as guest (auto-creates Grudge ID) */
  async loginAsGuest(): Promise<GrudgeAuth> {
    const res = await fetch(AUTH_API.guest, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userAgent: navigator.userAgent }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Guest login failed: ${res.status}`);
    const data = await res.json();
    return this.setAuthFromResponse(data);
  }

  /** Login with username + password */
  async login(username: string, password: string): Promise<GrudgeAuth> {
    const res = await fetch(AUTH_API.login, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    return this.setAuthFromResponse(data);
  }

  /** Register new Grudge ID */
  async register(username: string, password: string, email?: string): Promise<GrudgeAuth> {
    const res = await fetch(AUTH_API.register, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email }),
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`Registration failed: ${res.status}`);
    const data = await res.json();
    return this.setAuthFromResponse(data);
  }

  /** Verify current token is still valid */
  async verifyToken(): Promise<boolean> {
    if (!this.auth?.token) return false;
    try {
      const res = await fetch(`${AUTH_API.verify}?token=${this.auth.token}`);
      if (!res.ok) return false;
      const data = await res.json();
      return data.valid === true;
    } catch {
      return false;
    }
  }

  private setAuthFromResponse(data: any): GrudgeAuth {
    this.auth = {
      token: data.token,
      grudgeId: data.grudgeId || data.userId,
      userId: data.userId || data.user?.id,
      username: data.username || data.user?.username,
    };
    this.persistAuth();
    return this.auth;
  }

  getAuth(): GrudgeAuth | null { return this.auth; }
  isAuthenticated(): boolean { return !!this.auth?.token; }

  logout() {
    this.auth = null;
    this.stopAutoSync();
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('grudge_auth_token');
      localStorage.removeItem('grudge_auth');
      localStorage.removeItem('grudge_current_user');
    }
  }

  private persistAuth() {
    if (!this.auth || typeof localStorage === 'undefined') return;
    localStorage.setItem('grudge_auth_token', this.auth.token);
    localStorage.setItem('grudge_auth', JSON.stringify(this.auth));
    localStorage.setItem('grudge_current_user', JSON.stringify({
      userId: this.auth.userId,
      username: this.auth.username,
    }));
  }

  // --- Character Management ---

  /** Get all characters for the authenticated user */
  async getCharacters(): Promise<GrudgeCharacter[]> {
    if (!this.auth) throw new Error('Not authenticated');
    const res = await this.authedFetch(`${GAME_API.characters}?userId=${this.auth.userId}`);
    if (!res.ok) return [];
    return res.json();
  }

  /** Get a single character */
  async getCharacter(characterId: string): Promise<GrudgeCharacter | null> {
    const res = await this.authedFetch(GAME_API.character(characterId));
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Create a new character via the unified backend.
   * Backend validates race/class, computes attributes, generates avatar, mints cNFT.
   */
  async createCharacter(name: string, raceId: string, classId: string, manualAttributes?: Record<string, number>): Promise<GrudgeCharacter> {
    if (!this.auth) throw new Error('Not authenticated');
    const res = await this.authedFetch(GAME_API.characters, {
      method: 'POST',
      body: JSON.stringify({
        name,
        raceId,
        classId,
        manualAttributes,
        gameOrigin: 'grim-armada',
      }),
    });
    if (!res.ok) throw new Error(`Create character failed: ${res.status}`);
    const data = await res.json();
    return data.character || data;
  }

  /** Update character data (level, xp, attributes, equipment) */
  async updateCharacter(characterId: string, updates: Partial<GrudgeCharacter>): Promise<boolean> {
    const res = await this.authedFetch(GAME_API.character(characterId), {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
    return res.ok;
  }

  // --- Inventory Sync ---

  /** Get server-side inventory */
  async getInventory(characterId: string): Promise<any[]> {
    const res = await this.authedFetch(GAME_API.inventory(characterId));
    if (!res.ok) return [];
    return res.json();
  }

  /** Get unlocked skills */
  async getSkills(characterId: string): Promise<any[]> {
    const res = await this.authedFetch(GAME_API.skills(characterId));
    if (!res.ok) return [];
    return res.json();
  }

  /** Unlock a skill node */
  async unlockSkill(characterId: string, nodeId: string, profession: string): Promise<boolean> {
    const res = await this.authedFetch(GAME_API.skillUnlock, {
      method: 'POST',
      body: JSON.stringify({ characterId, nodeId, profession }),
    });
    return res.ok;
  }

  // --- Game State Sync ---

  /** Sync full survival game state to backend */
  async syncGameState(gameState: SurvivalGameState): Promise<boolean> {
    if (!this.auth) return false;
    try {
      const res = await this.authedFetch(GAME_API.grudaSync, {
        method: 'POST',
        body: JSON.stringify({
          grudgeId: this.auth.grudgeId,
          gameState,
          source: 'grim-armada-survival',
          timestamp: Date.now(),
        }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  /** Load game state from backend */
  async loadGameState(): Promise<SurvivalGameState | null> {
    if (!this.auth) return null;
    try {
      const res = await this.authedFetch(GAME_API.grudaPlayer(this.auth.grudgeId));
      if (!res.ok) return null;
      const data = await res.json();
      return data.gameState ?? null;
    } catch {
      return null;
    }
  }

  /** Start auto-sync every N seconds */
  startAutoSync(getState: () => SurvivalGameState, intervalMs = 30000) {
    this.stopAutoSync();
    this.syncTimer = setInterval(() => {
      this.syncGameState(getState());
    }, intervalMs);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  // --- Asset URLs ---

  /** Get an ObjectStore asset URL */
  getAssetUrl(path: string): string {
    return ASSET_API.objectStore(path);
  }

  /** Get weapon/armor icon URL */
  getItemIconUrl(category: string, filename: string): string {
    return ASSET_API.itemIcon(category, filename);
  }

  // --- Authed Fetch ---

  private async authedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };
    if (this.auth?.token) {
      headers['Authorization'] = `Bearer ${this.auth.token}`;
    }
    if (this.auth?.userId) {
      headers['X-User-Id'] = this.auth.userId;
    }
    return fetch(url, { ...options, headers, credentials: 'include' });
  }
}

// ============================================================
// Singleton
// ============================================================

let _instance: GrudgeClient | null = null;

/** Get or create the default GrudgeClient singleton */
export function getGrudgeClient(): GrudgeClient {
  if (!_instance) _instance = new GrudgeClient();
  return _instance;
}
