/**
 * AssetResolver — resolve game asset paths for Grim Armada.
 *
 * Strategy (fleet best practice):
 *   1. Same-origin `/models|textures|…` first — these ship with the Vercel build
 *      from `public/` and are known-good on grim-armada-web.vercel.app.
 *   2. Optional CDN (`assets.grudge-studio.com/grim-armada/…`) only when
 *      `VITE_ASSET_CDN_URL` is set **and** `VITE_FORCE_ASSET_CDN=true`.
 *
 * Previous prod default always hit CDN → 404 on every GLB → empty scene.
 */

const DEFAULT_CDN = 'https://assets.grudge-studio.com';

const ASSET_CDN = (() => {
  try {
    if (import.meta.env.VITE_ASSET_CDN_URL) {
      return String(import.meta.env.VITE_ASSET_CDN_URL).replace(/\/$/, '');
    }
  } catch { /* */ }
  return DEFAULT_CDN;
})();

const ASSET_PREFIX = 'grim-armada';

const isProd =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  !window.location.hostname.includes('127.0.0.1');

/**
 * Only force CDN when explicitly opted-in. Same-origin public/ assets are
 * the SSOT for Vercel deploys until R2 is fully seeded under grim-armada/.
 */
const forceCdn = (): boolean => {
  try {
    if (import.meta.env.VITE_USE_LOCAL_ASSETS === 'true') return false;
    if (import.meta.env.VITE_FORCE_ASSET_CDN === 'true') return true;
  } catch { /* */ }
  return false;
};

/** Primary URL for a model/texture path. */
export function resolveModel(localPath: string): string {
  if (!localPath) return localPath;
  // Absolute URLs pass through
  if (/^https?:\/\//i.test(localPath)) return localPath;

  const clean = localPath.replace(/^\//, '');
  if (forceCdn() && isProd) {
    // VITE_ASSET_CDN_URL may already include /grim-armada
    if (ASSET_CDN.includes(ASSET_PREFIX)) {
      return `${ASSET_CDN}/${clean}`;
    }
    return `${ASSET_CDN}/${ASSET_PREFIX}/${clean}`;
  }
  return localPath.startsWith('/') ? localPath : `/${clean}`;
}

/**
 * CDN candidate for fallback if same-origin load fails (ModelLoader uses this).
 */
export function resolveModelCdnFallback(localPath: string): string | null {
  if (!localPath || /^https?:\/\//i.test(localPath)) return null;
  if (forceCdn()) return null; // already on CDN as primary
  const clean = localPath.replace(/^\//, '');
  if (ASSET_CDN.includes(ASSET_PREFIX)) {
    return `${ASSET_CDN}/${clean}`;
  }
  return `${ASSET_CDN}/${ASSET_PREFIX}/${clean}`;
}

/** Resolve a texture path. */
export function resolveTexture(localPath: string): string {
  return resolveModel(localPath);
}

/** Resolve any asset path (generic). */
export function resolveAsset(localPath: string): string {
  return resolveModel(localPath);
}

/** Get the base CDN URL for constructing manual paths. */
export function getAssetCDNBase(): string {
  if (ASSET_CDN.includes(ASSET_PREFIX)) return ASSET_CDN;
  return `${ASSET_CDN}/${ASSET_PREFIX}`;
}

/** Check if CDN root responds (optional health). */
export async function isAssetCDNReachable(timeoutMs = 3000): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(`${ASSET_CDN}/health`, { signal: controller.signal });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Object storage paths for Grudge Armada game assets.
 * Paths are same-origin public/ paths (CDN via resolveModel when forced).
 */
export const ASSET_PATHS = {
  models: {
    player: '/models/player/player.glb',
    enemies: {
      mutant: '/models/enemies/mutant.glb',
      alien: '/models/enemies/alien.glb',
      spikeball: '/models/enemies/spikeball.glb',
    },
    weapons: {
      rifle: '/models/weapons/assault_rifle.glb',
      ak74u: '/models/weapons/ak74u.glb',
      smg: '/models/weapons/smg.glb',
    },
    structures: {
      cabin: '/models/structures/cabin.glb',
      watchtower: '/models/structures/watchtower.glb',
      securityPost: '/models/structures/security_post.glb',
      searchlight: '/models/structures/searchlight.glb',
      miningStation: '/models/structures/mining-station/scene.gltf',
    },
    colony: {
      mainHouse: '/models/colony/main_house.glb',
      mainHouse2: '/models/colony/main_house_2lv.glb',
      researchCenter: '/models/colony/research_center.glb',
      farm: '/models/colony/farm.glb',
      warehouse: '/models/colony/resource_warehouse.glb',
      reactor: '/models/colony/reactor.glb',
      solarPanel: '/models/colony/solar_panel.glb',
      droneCarrier: '/models/colony/drone_carrier.glb',
      gateway: '/models/colony/connecting_gateway.glb',
      runway: '/models/colony/runway_strip.glb',
      geoGenerator: '/models/colony/geothermal_generator.glb',
      colonistHome: '/models/colony/home_colonists.glb',
    },
    ships: {
      destroyer1: '/models/ships/destroyer_01.glb',
      destroyer2: '/models/ships/destroyer_02.glb',
      destroyer3: '/models/ships/destroyer_03.glb',
      cruiser1: '/models/ships/light_cruiser_01.glb',
      // light_cruiser_02.glb is an empty FBX2glTF stub (0-byte buffer) — reuse 01
      cruiser2: '/models/ships/light_cruiser_01.glb',
    },
    terrain: {
      rock1: '/models/terrain/rock1.glb',
      rock2: '/models/terrain/rock2.glb',
      cliff1: '/models/terrain/cliff1.glb',
      cliff2: '/models/terrain/cliff2.glb',
      tree1: '/models/terrain/tree1.glb',
      bush: '/models/terrain/bush.glb',
      sandbags: '/models/terrain/sandbags.glb',
      barrel: '/models/terrain/barrel.glb',
    },
    units: {
      notableIce: '/models/enemies/mutant.glb',
      superheroSns: '/models/enemies/alien.glb',
      tgeHero: '/models/player/player.glb',
    },
  },
  textures: {
    terrain: {
      grass: '/textures/terrain/grass.jpg',
      sand: '/textures/terrain/sand.jpg',
      stone: '/textures/terrain/stone.jpg',
      snow: '/textures/terrain/snow.jpg',
      sky: '/textures/terrain/sky.jpg',
      heightmap: '/textures/terrain/heightmap.png',
    },
  },
  animations: {
    rifleLocomotion: '/models/animations/rifle-locomotion/',
  },
} as const;

/** Flat model paths for scene placement (back-compat with DemoScene). */
export const GAME_MODELS = {
  player: ASSET_PATHS.models.player,
  weaponRifle: ASSET_PATHS.models.weapons.rifle,
  weaponAK: ASSET_PATHS.models.weapons.ak74u,
  weaponSMG: ASSET_PATHS.models.weapons.smg,
  mutant: ASSET_PATHS.models.enemies.mutant,
  alien: ASSET_PATHS.models.enemies.alien,
  spikeball: ASSET_PATHS.models.enemies.spikeball,
  rock1: ASSET_PATHS.models.terrain.rock1,
  rock2: ASSET_PATHS.models.terrain.rock2,
  cliff1: ASSET_PATHS.models.terrain.cliff1,
  cliff2: ASSET_PATHS.models.terrain.cliff2,
  tree1: ASSET_PATHS.models.terrain.tree1,
  bush: ASSET_PATHS.models.terrain.bush,
  sandbags: ASSET_PATHS.models.terrain.sandbags,
  barrel: ASSET_PATHS.models.terrain.barrel,
  watchtower: ASSET_PATHS.models.structures.watchtower,
  cabin: ASSET_PATHS.models.structures.cabin,
  securityPost: ASSET_PATHS.models.structures.securityPost,
  searchlight: ASSET_PATHS.models.structures.searchlight,
  mainHouse: ASSET_PATHS.models.colony.mainHouse,
  mainHouse2: ASSET_PATHS.models.colony.mainHouse2,
  researchCenter: ASSET_PATHS.models.colony.researchCenter,
  farm: ASSET_PATHS.models.colony.farm,
  warehouse: ASSET_PATHS.models.colony.warehouse,
  reactor: ASSET_PATHS.models.colony.reactor,
  solarPanel: ASSET_PATHS.models.colony.solarPanel,
  droneCarrier: ASSET_PATHS.models.colony.droneCarrier,
  gateway: ASSET_PATHS.models.colony.gateway,
  runway: ASSET_PATHS.models.colony.runway,
  geoGenerator: ASSET_PATHS.models.colony.geoGenerator,
  colonistHome: ASSET_PATHS.models.colony.colonistHome,
  destroyer1: ASSET_PATHS.models.ships.destroyer1,
  destroyer2: ASSET_PATHS.models.ships.destroyer2,
  destroyer3: ASSET_PATHS.models.ships.destroyer3,
  cruiser1: ASSET_PATHS.models.ships.cruiser1,
  cruiser2: ASSET_PATHS.models.ships.cruiser2,
} as const;
