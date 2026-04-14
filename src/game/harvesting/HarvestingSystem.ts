// ===== Harvesting System =====
// Profession-gated resource gathering from 3D world nodes.
// E key interaction → progress bar → loot with quality stats → profession XP.

import {
  RESOURCE_TYPES, type ResourceSpawn, type ResourceType,
  createResourceSpawn, isSpawnActive, type ResourceQualityStats,
} from '../crafting/ResourceQuality';

// ===== World Node (3D interactable) =====

export interface WorldNode {
  id: string;
  resourceTypeId: string;
  position: [number, number, number];
  /** GLB model to render */
  modelUrl: string;
  /** Scale for the GLB model */
  modelScale: number;
  /** Is this node currently harvestable (not depleted) */
  available: boolean;
  /** Time until respawn (seconds, counts down when depleted) */
  respawnTimer: number;
  /** Base respawn time */
  respawnTime: number;
  /** The current active spawn providing quality stats */
  activeSpawnId: string | null;
}

/** Harvest progress for the player */
export interface HarvestProgress {
  nodeId: string;
  elapsed: number;
  duration: number;
  resourceTypeId: string;
}

/** Result of completing a harvest */
export interface HarvestResult {
  resourceTypeId: string;
  resourceDefId: string; // item def id for inventory
  spawnId: string;
  quality: ResourceQualityStats;
  quantity: number;
  professionXP: number;
  heroXP: number;
}

// ===== Model Mapping =====

const NODE_MODELS: Record<string, { url: string; scale: number }> = {
  ore: { url: '/models/terrain/rock1.glb', scale: 1.5 },
  wood: { url: '/models/terrain/tree1.glb', scale: 5 },
  herb: { url: '/models/terrain/bush.glb', scale: 1.2 },
  fish: { url: '/models/terrain/barrel.glb', scale: 1 }, // placeholder for fishing spots
  hide: { url: '/models/terrain/sandbags.glb', scale: 1 }, // placeholder for skinning
};

/** Resource type → inventory item def ID mapping */
const RESOURCE_TO_ITEM: Record<string, string> = {
  copper_ore: 'res_copper_ore',
  iron_ore: 'res_iron_ore',
  pine_log: 'res_pine_log',
  oak_log: 'res_oak_log',
  wild_herb: 'res_wild_herb',
  animal_hide: 'res_animal_hide',
  common_fish: 'res_common_fish',
};

// ===== Interaction Range =====

export const HARVEST_INTERACT_RANGE = 4; // meters

// ===== Node Generation =====

let nodeIdCounter = 0;

/** Generate world nodes for a given map area */
export function generateWorldNodes(
  activeSpawns: ResourceSpawn[],
  mapBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
  density: number = 0.5, // nodes per 100 sq units
): WorldNode[] {
  const nodes: WorldNode[] = [];
  const area = (mapBounds.maxX - mapBounds.minX) * (mapBounds.maxZ - mapBounds.minZ);
  const nodeCount = Math.round(area * density / 100);

  // Filter to T1-T3 resources for the demo map
  const eligibleTypes = RESOURCE_TYPES.filter(r => r.tier <= 3);

  for (let i = 0; i < nodeCount; i++) {
    const resType = eligibleTypes[Math.floor(Math.random() * eligibleTypes.length)];
    const model = NODE_MODELS[resType.category] ?? NODE_MODELS.ore;

    // Find an active spawn for this resource type
    const spawn = activeSpawns.find(s => s.resourceTypeId === resType.id && isSpawnActive(s));

    const x = mapBounds.minX + Math.random() * (mapBounds.maxX - mapBounds.minX);
    const z = mapBounds.minZ + Math.random() * (mapBounds.maxZ - mapBounds.minZ);

    nodes.push({
      id: `node_${++nodeIdCounter}`,
      resourceTypeId: resType.id,
      position: [x, 0, z],
      modelUrl: model.url,
      modelScale: model.scale + (Math.random() - 0.5) * 0.5,
      available: true,
      respawnTimer: 0,
      respawnTime: 30 + resType.tier * 15, // 30s base + 15s per tier
      activeSpawnId: spawn?.id ?? null,
    });
  }

  return nodes;
}

// ===== Harvesting Logic =====

/**
 * Check if player can harvest a node.
 * Returns null if allowed, or an error message.
 */
export function canHarvest(
  node: WorldNode,
  playerProfessionLevel: number,
  playerPosition: [number, number, number],
): string | null {
  if (!node.available) return 'Node is depleted';

  const resType = RESOURCE_TYPES.find(r => r.id === node.resourceTypeId);
  if (!resType) return 'Unknown resource';

  // Check range
  const dx = playerPosition[0] - node.position[0];
  const dz = playerPosition[2] - node.position[2];
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > HARVEST_INTERACT_RANGE) return 'Too far away';

  // Check profession level
  if (playerProfessionLevel < resType.minProfessionLevel) {
    return `Requires ${resType.profession} level ${resType.minProfessionLevel}`;
  }

  return null;
}

/** Get the harvest duration for a node (affected by profession level) */
export function getHarvestDuration(
  resourceTypeId: string,
  professionLevel: number,
): number {
  const resType = RESOURCE_TYPES.find(r => r.id === resourceTypeId);
  if (!resType) return 5;

  // Higher profession level = faster harvesting (up to 50% reduction at level 100)
  const speedBonus = Math.min(professionLevel / 200, 0.5);
  return resType.baseHarvestTime * (1 - speedBonus);
}

/** Start a harvest — returns the progress tracker */
export function startHarvest(
  node: WorldNode,
  professionLevel: number,
): HarvestProgress {
  return {
    nodeId: node.id,
    elapsed: 0,
    duration: getHarvestDuration(node.resourceTypeId, professionLevel),
    resourceTypeId: node.resourceTypeId,
  };
}

/** Update harvest progress. Returns true when complete. */
export function updateHarvestProgress(
  progress: HarvestProgress,
  dt: number,
): boolean {
  progress.elapsed += dt;
  return progress.elapsed >= progress.duration;
}

/** Complete a harvest — returns the loot */
export function completeHarvest(
  node: WorldNode,
  activeSpawns: ResourceSpawn[],
  professionLevel: number,
): HarvestResult | null {
  const resType = RESOURCE_TYPES.find(r => r.id === node.resourceTypeId);
  if (!resType) return null;

  // Find the active spawn
  const spawn = activeSpawns.find(s => s.id === node.activeSpawnId && isSpawnActive(s));
  if (!spawn) return null;

  // Calculate yield (base 1-3, +1 per 25 profession levels)
  const baseYield = 1 + Math.floor(Math.random() * 3);
  const levelBonus = Math.floor(professionLevel / 25);
  const quantity = baseYield + levelBonus;

  // XP rewards
  const profXP = 10 + resType.tier * 5;
  const heroXP = 5 + resType.tier * 3;

  // Deplete node
  node.available = false;
  node.respawnTimer = node.respawnTime;

  // Map resource type to item def
  const defId = RESOURCE_TO_ITEM[resType.id] ?? `res_${resType.id}`;

  return {
    resourceTypeId: resType.id,
    resourceDefId: defId,
    spawnId: spawn.id,
    quality: { ...spawn.quality },
    quantity,
    professionXP: profXP,
    heroXP: heroXP,
  };
}

/** Update all world nodes (respawn timers) */
export function updateWorldNodes(nodes: WorldNode[], dt: number): void {
  for (const node of nodes) {
    if (!node.available && node.respawnTimer > 0) {
      node.respawnTimer -= dt;
      if (node.respawnTimer <= 0) {
        node.available = true;
        node.respawnTimer = 0;
      }
    }
  }
}

/** Find the nearest harvestable node to the player */
export function findNearestNode(
  nodes: WorldNode[],
  playerPosition: [number, number, number],
  maxRange: number = HARVEST_INTERACT_RANGE,
): WorldNode | null {
  let nearest: WorldNode | null = null;
  let nearestDist = maxRange;

  for (const node of nodes) {
    if (!node.available) continue;
    const dx = playerPosition[0] - node.position[0];
    const dz = playerPosition[2] - node.position[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < nearestDist) {
      nearest = node;
      nearestDist = dist;
    }
  }

  return nearest;
}

/** Get profession name for a resource type */
export function getProfessionForResource(resourceTypeId: string): string {
  const resType = RESOURCE_TYPES.find(r => r.id === resourceTypeId);
  return resType?.profession ?? 'Unknown';
}

// ===== Default Spawn Generation =====

/** Generate initial resource spawns for all T1-T3 resources */
export function generateInitialSpawns(): ResourceSpawn[] {
  const spawns: ResourceSpawn[] = [];
  const eligibleTypes = RESOURCE_TYPES.filter(r => r.tier <= 3);

  for (const resType of eligibleTypes) {
    // Create 1-2 spawns per resource type
    const count = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < count; i++) {
      spawns.push(createResourceSpawn(resType.id, ['starter_island']));
    }
  }

  return spawns;
}
