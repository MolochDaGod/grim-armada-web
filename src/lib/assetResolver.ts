/**
 * AssetResolver — resolves game asset paths to CDN or local.
 *
 * Production: assets served from assets.grudge-studio.com (Cloudflare R2)
 * Development: assets served from local public/ directory
 *
 * Usage:
 *   resolveModel('/models/enemies/mutant.glb')
 *     → prod: 'https://assets.grudge-studio.com/grim-armada/models/enemies/mutant.glb'
 *     → dev:  '/models/enemies/mutant.glb'
 */

const ASSET_CDN = (() => {
  try {
    if (import.meta.env.VITE_ASSET_CDN_URL) return import.meta.env.VITE_ASSET_CDN_URL as string;
  } catch { /* */ }
  return 'https://assets.grudge-studio.com';
})();
const ASSET_PREFIX = 'grim-armada';

const isProd = typeof window !== 'undefined'
  && window.location.hostname !== 'localhost'
  && !window.location.hostname.includes('127.0.0.1');

/** Prefer same-origin in dev; CDN in production deploys. */
const useCdn = (): boolean => {
  try {
    if (import.meta.env.VITE_USE_LOCAL_ASSETS === 'true') return false;
  } catch { /* */ }
  return isProd;
};

/**
 * Resolve a model path. In production, prepends the CDN URL.
 * Falls back to local path if CDN is not configured or in dev.
 */
export function resolveModel(localPath: string): string {
  if (!useCdn()) return localPath;
  // Strip leading slash for CDN path construction
  const clean = localPath.replace(/^\//, '');
  return `${ASSET_CDN}/${ASSET_PREFIX}/${clean}`;
}

/**
 * Resolve a texture path.
 */
export function resolveTexture(localPath: string): string {
  return resolveModel(localPath); // same logic
}

/**
 * Resolve any asset path (generic).
 */
export function resolveAsset(localPath: string): string {
  return resolveModel(localPath);
}

/**
 * Get the base CDN URL for constructing manual paths.
 */
export function getAssetCDNBase(): string {
  return useCdn() ? `${ASSET_CDN}/${ASSET_PREFIX}` : '';
}

/**
 * Check if CDN is available (for fallback logic).
 */
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
 * All paths relative to the CDN bucket prefix.
 */
export const ASSET_PATHS = {
  // Models
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
      cruiser2: '/models/ships/light_cruiser_02.glb',
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
      // Hero placeholders — point at shipped GLBs until dedicated hero meshes land.
      notableIce: '/models/enemies/mutant.glb',
      superheroSns: '/models/enemies/alien.glb',
      tgeHero: '/models/player/player.glb',
    },
  },
  // Textures
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
  // Animations
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
