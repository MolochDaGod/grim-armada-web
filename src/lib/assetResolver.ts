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

const ASSET_CDN = 'https://assets.grudge-studio.com';
const ASSET_PREFIX = 'grim-armada'; // bucket prefix for this game

const isProd = typeof window !== 'undefined'
  && window.location.hostname !== 'localhost'
  && !window.location.hostname.includes('127.0.0.1');

/**
 * Resolve a model path. In production, prepends the CDN URL.
 * Falls back to local path if CDN is not configured or in dev.
 */
export function resolveModel(localPath: string): string {
  if (!isProd) return localPath;
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
  return isProd ? `${ASSET_CDN}/${ASSET_PREFIX}` : '';
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
      notableIce: '/models/units/notable-ice.glb',
      superheroSns: '/models/units/superhero-sns.glb',
      tgeHero: '/models/units/tge-hero.glb',
    },
  },
  // Textures
  textures: {
    terrain: {
      grass: '/textures/terrain/grass.png',
      sand: '/textures/terrain/sand.png',
      stone: '/textures/terrain/stone.png',
      snow: '/textures/terrain/snow.png',
    },
  },
  // Animations
  animations: {
    rifleLocomotion: '/models/animations/rifle-locomotion/',
  },
} as const;
