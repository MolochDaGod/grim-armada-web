/**
 * Browser-side tools for the Grok Coder agent.
 * These probe live production (same-origin preferred) so the chat can
 * diagnose deploy / DB / assets without leaving the game.
 */

import { GRIM_ARMADA_FLEET, fleetMapMarkdown } from './fleetMap';
import { resolveModel, ASSET_PATHS } from '../lib/assetResolver';
import { useGameStore } from '../game/store';
import { useSceneStore, SCENE_META } from '../game/scenes/useSceneStore';
import { getGrudgeClient } from '../lib/grudge-sdk';

export interface ToolResult {
  name: string;
  label: string;
  ok: boolean;
  data?: unknown;
  text: string;
}

async function headOrGet(url: string): Promise<{ status: number; ok: boolean; bytes?: number }> {
  try {
    let res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: 'GET', cache: 'no-store' });
    }
    const len = res.headers.get('content-length');
    return {
      status: res.status,
      ok: res.ok,
      bytes: len ? Number(len) : undefined,
    };
  } catch (e) {
    return { status: 0, ok: false };
  }
}

export async function toolFleetMap(): Promise<ToolResult> {
  return {
    name: 'fleet_map',
    label: 'Fleet map',
    ok: true,
    data: GRIM_ARMADA_FLEET,
    text: fleetMapMarkdown(),
  };
}

export async function toolProbeDeploy(): Promise<ToolResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : GRIM_ARMADA_FLEET.game.origins[0];
  const paths = ['/', '/play', '/auth/callback', '/models/player/player.glb', '/textures/terrain/grass.jpg'];
  const rows: string[] = [];
  let allOk = true;
  for (const p of paths) {
    const r = await headOrGet(origin + p);
    rows.push(`${r.ok ? 'OK' : 'FAIL'} ${r.status} ${p}${r.bytes ? ` (${r.bytes}b)` : ''}`);
    if (!r.ok && p !== '/assets/') allOk = false;
  }
  // Bundle hash
  try {
    const html = await (await fetch(origin + '/')).text();
    const m = html.match(/src="(\/assets\/index-[^"]+\.js)"/);
    if (m) rows.push(`bundle ${m[1]}`);
  } catch { /* */ }

  return {
    name: 'probe_deploy',
    label: allOk ? 'Deploy healthy' : 'Deploy issues',
    ok: allOk,
    text: [`## Deploy probe (${origin})`, ...rows].join('\n'),
  };
}

export async function toolProbeAssets(): Promise<ToolResult> {
  const samples = [
    ASSET_PATHS.models.player,
    ASSET_PATHS.models.enemies.mutant,
    ASSET_PATHS.models.weapons.rifle,
    ASSET_PATHS.models.colony.mainHouse2,
    ASSET_PATHS.textures.terrain.grass,
  ];
  const rows: string[] = [];
  let fails = 0;
  for (const path of samples) {
    const url = resolveModel(path);
    const r = await headOrGet(url);
    rows.push(`${r.ok ? 'OK' : 'FAIL'} ${r.status} ${url}`);
    if (!r.ok) fails++;
  }
  const cdn = GRIM_ARMADA_FLEET.assets.cdn;
  const cdnCheck = await headOrGet(`https://assets.grudge-studio.com/grim-armada/models/player/player.glb`);
  rows.push(
    `CDN player.glb → ${cdnCheck.status} (policy: same-origin first; force CDN only if seeded)`,
  );

  return {
    name: 'probe_assets',
    label: fails === 0 ? 'Assets OK' : `${fails} asset misses`,
    ok: fails === 0,
    text: [
      '## Asset probe',
      `Policy: ${GRIM_ARMADA_FLEET.assets.policy}`,
      `resolveModel sample → ${resolveModel('/models/player/player.glb')}`,
      ...rows,
      '',
      'Edit tip: keep `VITE_FORCE_ASSET_CDN` unset until R2 has grim-armada/*.',
    ].join('\n'),
  };
}

export async function toolProbeGameApi(): Promise<ToolResult> {
  const rows: string[] = [];
  let ok = true;

  for (const path of ['/api/health', '/api/characters']) {
    try {
      const res = await fetch(path, { credentials: 'include', cache: 'no-store' });
      const ct = res.headers.get('content-type') || '';
      let snippet = '';
      try {
        const t = await res.text();
        snippet = t.slice(0, 120).replace(/\s+/g, ' ');
      } catch { /* */ }
      rows.push(`${res.ok ? 'OK' : 'FAIL'} ${res.status} ${path} (${ct}) ${snippet}`);
      // 401 on characters without auth is still "API up"
      if (!res.ok && res.status !== 401 && res.status !== 403) ok = false;
    } catch (e) {
      rows.push(`FAIL 0 ${path} ${e instanceof Error ? e.message : e}`);
      ok = false;
    }
  }

  rows.push(`DB SSOT: ${GRIM_ARMADA_FLEET.gameData.db}`);
  rows.push(`Railway: ${GRIM_ARMADA_FLEET.gameData.railway}`);

  return {
    name: 'probe_game_api',
    label: ok ? 'Game API reachable' : 'Game API issues',
    ok,
    text: ['## Game API / DB', ...rows].join('\n'),
  };
}

export async function toolProbeAuth(): Promise<ToolResult> {
  const client = getGrudgeClient();
  const auth = client.getAuth();
  const rows: string[] = [];
  rows.push(`authenticated: ${client.isAuthenticated()}`);
  rows.push(`user: ${auth?.username ?? 'none'} · grudgeId: ${auth?.grudgeId ?? '—'}`);

  try {
    const res = await fetch('/api/auth/me', {
      headers: auth?.token ? { Authorization: `Bearer ${auth.token}` } : {},
      credentials: 'include',
      cache: 'no-store',
    });
    rows.push(`/api/auth/me → ${res.status}`);
  } catch (e) {
    rows.push(`/api/auth/me → error ${e instanceof Error ? e.message : e}`);
  }

  try {
    const h = await headOrGet('https://id.grudge-studio.com/auth/guest');
    rows.push(`id.grudge-studio.com guest endpoint reachable: ${h.status || 'net'}`);
  } catch { /* */ }

  return {
    name: 'probe_auth',
    label: client.isAuthenticated() ? 'Auth session present' : 'Guest/unauth',
    ok: true,
    text: ['## Auth', ...rows].join('\n'),
  };
}

export async function toolProbeAiHub(): Promise<ToolResult> {
  const rows: string[] = [];
  let ok = false;
  try {
    const res = await fetch('https://ai.grudge-studio.com/health', { cache: 'no-store' });
    const j = await res.json().catch(() => ({}));
    ok = res.ok;
    rows.push(`health ${res.status}: ${JSON.stringify(j).slice(0, 200)}`);
  } catch (e) {
    rows.push(`health error: ${e instanceof Error ? e.message : e}`);
  }
  try {
    const res = await fetch('https://ai.grudge-studio.com/v1/agents', { cache: 'no-store' });
    rows.push(`agents list ${res.status}`);
  } catch { /* */ }
  rows.push('Chat endpoints require D1 API key or hub-signed JWT (guest Grudge JWT may be rejected).');
  rows.push('Local Grok Coder tools always run without hub auth.');

  return {
    name: 'probe_ai_hub',
    label: ok ? 'AI hub up' : 'AI hub down',
    ok,
    text: ['## AI hub', ...rows].join('\n'),
  };
}

export async function toolSceneState(): Promise<ToolResult> {
  const g = useGameStore.getState();
  const sc = useSceneStore.getState();
  const meta = SCENE_META[sc.activeScene];
  const text = [
    '## Live scene state',
    `- biome: ${meta.name} (${sc.activeScene}) transitioning=${sc.transitioning}`,
    `- player: [${g.playerPosition.map((n) => n.toFixed(1)).join(', ')}] rot=${g.playerRotation.toFixed(2)}`,
    `- weapon: ${g.weaponMode} ammo ${g.ammo}/${g.maxAmmo}`,
    `- target: ${g.targetId ?? 'none'} · enemies: ${g.enemies.length}`,
    `- dayTime: ${g.dayTime.toFixed(2)} wave=${g.wave} kills=${g.kills}`,
  ].join('\n');
  return { name: 'scene_state', label: 'Scene snapshot', ok: true, text };
}

export async function toolAssetPolicyEdit(): Promise<ToolResult> {
  const text = [
    '## Asset / deploy edit guide (acute)',
    '',
    '### Files',
    '- `src/lib/assetResolver.ts` — same-origin default; `VITE_FORCE_ASSET_CDN`',
    '- `src/game/scene/ModelLoader.tsx` — load + CDN fallback',
    '- `vercel.json` — rewrites API → Railway; SPA skip models/textures',
    '- `public/models/**` — ship GLBs with the Vercel build',
    '',
    '### DBs',
    '- Characters/account: Railway Postgres via `/api/*` (not Puter SSOT)',
    '- Do not store heroes only in localStorage for production',
    '',
    '### Deploy',
    '- Push `main` → Vercel production auto',
    '- Verify: `npm run probe:live`',
    '',
    '### Broken empty GLB',
    '- `light_cruiser_02.glb` remapped to cruiser_01 in assetResolver',
  ].join('\n');
  return { name: 'edit_guide', label: 'Edit map', ok: true, text };
}

export type ToolName =
  | 'fleet_map'
  | 'probe_deploy'
  | 'probe_assets'
  | 'probe_game_api'
  | 'probe_auth'
  | 'probe_ai_hub'
  | 'scene_state'
  | 'edit_guide'
  | 'full_diag';

export async function runTool(name: ToolName): Promise<ToolResult> {
  switch (name) {
    case 'fleet_map':
      return toolFleetMap();
    case 'probe_deploy':
      return toolProbeDeploy();
    case 'probe_assets':
      return toolProbeAssets();
    case 'probe_game_api':
      return toolProbeGameApi();
    case 'probe_auth':
      return toolProbeAuth();
    case 'probe_ai_hub':
      return toolProbeAiHub();
    case 'scene_state':
      return toolSceneState();
    case 'edit_guide':
      return toolAssetPolicyEdit();
    case 'full_diag': {
      const parts = await Promise.all([
        toolProbeDeploy(),
        toolProbeAssets(),
        toolProbeGameApi(),
        toolProbeAuth(),
        toolProbeAiHub(),
        toolSceneState(),
      ]);
      const ok = parts.every((p) => p.ok);
      return {
        name: 'full_diag',
        label: ok ? 'Full diag green' : 'Full diag found issues',
        ok,
        text: parts.map((p) => p.text).join('\n\n'),
      };
    }
    default:
      return { name: 'unknown', label: 'Unknown', ok: false, text: `Unknown tool: ${name}` };
  }
}

/** Keyword router for slash / natural language → tools */
export function planTools(userText: string): ToolName[] {
  const t = userText.toLowerCase().trim();
  if (t === '/help' || t === 'help') return [];
  if (t.startsWith('/diag') || t.includes('full diag') || t.includes('diagnose everything')) {
    return ['full_diag'];
  }
  if (t.startsWith('/deploy') || t.includes('deploy') || t.includes('vercel') || t.includes('production url')) {
    return ['probe_deploy', 'fleet_map'];
  }
  if (t.startsWith('/assets') || t.includes('asset') || t.includes('glb') || t.includes('model') || t.includes('cdn') || t.includes('texture')) {
    return ['probe_assets', 'edit_guide'];
  }
  if (t.startsWith('/db') || t.includes('database') || t.includes('postgres') || t.includes('railway') || t.includes('character api')) {
    return ['probe_game_api', 'fleet_map'];
  }
  if (t.startsWith('/auth') || t.includes('login') || t.includes('grudge id') || t.includes('sso')) {
    return ['probe_auth'];
  }
  if (t.startsWith('/ai') || t.includes('ai hub') || t.includes('gateway')) {
    return ['probe_ai_hub'];
  }
  if (t.startsWith('/scene') || t.includes('where am i') || t.includes('player position')) {
    return ['scene_state'];
  }
  if (t.startsWith('/map') || t.includes('fleet') || t.includes('where is') || t.includes('topology')) {
    return ['fleet_map'];
  }
  if (t.startsWith('/edit') || t.includes('how to fix') || t.includes('organize') || t.includes('best practice')) {
    return ['edit_guide', 'fleet_map'];
  }
  // Default light probe for open-ended coding questions
  if (
    t.includes('broken') ||
    t.includes('not work') ||
    t.includes('empty') ||
    t.includes('black') ||
    t.includes('404')
  ) {
    return ['full_diag'];
  }
  return ['fleet_map'];
}
