// ===== SWG-Style Resource Quality System =====
// Every resource spawn has quality attributes rated 300–1000.
// Higher quality resources → better crafted items.

export enum QualityAttribute {
  OQ = 'OQ', // Overall Quality — general usefulness
  CD = 'CD', // Conductivity — electronics/enchanting
  DR = 'DR', // Decay Resistance — durability
  FL = 'FL', // Flavor — food/alchemy
  MA = 'MA', // Malleability — forging ease
  PE = 'PE', // Potential Energy — damage potential
  SR = 'SR', // Shock Resistance — armor effectiveness
  UT = 'UT', // Unit Toughness — structural integrity
}

export const QUALITY_ATTRIBUTE_NAMES: Record<QualityAttribute, string> = {
  [QualityAttribute.OQ]: 'Overall Quality',
  [QualityAttribute.CD]: 'Conductivity',
  [QualityAttribute.DR]: 'Decay Resistance',
  [QualityAttribute.FL]: 'Flavor',
  [QualityAttribute.MA]: 'Malleability',
  [QualityAttribute.PE]: 'Potential Energy',
  [QualityAttribute.SR]: 'Shock Resistance',
  [QualityAttribute.UT]: 'Unit Toughness',
};

export const MIN_QUALITY = 300;
export const MAX_QUALITY = 1000;

/** Quality stats for a single resource spawn */
export interface ResourceQualityStats {
  [QualityAttribute.OQ]: number;
  [QualityAttribute.CD]: number;
  [QualityAttribute.DR]: number;
  [QualityAttribute.FL]: number;
  [QualityAttribute.MA]: number;
  [QualityAttribute.PE]: number;
  [QualityAttribute.SR]: number;
  [QualityAttribute.UT]: number;
}

/** A resource type that can spawn in the world */
export type ResourceCategory = 'ore' | 'wood' | 'herb' | 'hide' | 'fish' | 'gem' | 'chemical';

export interface ResourceType {
  id: string;
  name: string;
  category: ResourceCategory;
  tier: number;
  /** Which quality attributes this resource type can have (some resources lack certain attrs) */
  relevantAttributes: QualityAttribute[];
  /** Base harvest time in seconds */
  baseHarvestTime: number;
  /** Profession required to gather */
  profession: string;
  /** Minimum profession level */
  minProfessionLevel: number;
}

/** A specific spawn instance of a resource type with rolled quality stats */
export interface ResourceSpawn {
  id: string;
  resourceTypeId: string;
  quality: ResourceQualityStats;
  /** Spawn location regions */
  regions: string[];
  /** When this spawn appeared (timestamp) */
  spawnedAt: number;
  /** When this spawn expires (timestamp) */
  expiresAt: number;
  /** Density 0-1 at various world positions */
  densityMap: Map<string, number>;
}

/** A harvested resource instance in a player's inventory */
export interface HarvestedResource {
  resourceTypeId: string;
  spawnId: string;
  quality: ResourceQualityStats;
  quantity: number;
}

// ===== Quality Generation =====

/** Roll a random quality value between 300 and 1000 */
function rollQuality(): number {
  // Weighted toward middle — bell curve using two random rolls averaged
  const r1 = Math.random();
  const r2 = Math.random();
  const normalized = (r1 + r2) / 2; // 0-1, bell-curved toward 0.5
  return Math.round(MIN_QUALITY + normalized * (MAX_QUALITY - MIN_QUALITY));
}

/** Generate quality stats for a new resource spawn */
export function generateSpawnQuality(relevantAttributes: QualityAttribute[]): ResourceQualityStats {
  const stats: ResourceQualityStats = {
    [QualityAttribute.OQ]: MIN_QUALITY,
    [QualityAttribute.CD]: MIN_QUALITY,
    [QualityAttribute.DR]: MIN_QUALITY,
    [QualityAttribute.FL]: MIN_QUALITY,
    [QualityAttribute.MA]: MIN_QUALITY,
    [QualityAttribute.PE]: MIN_QUALITY,
    [QualityAttribute.SR]: MIN_QUALITY,
    [QualityAttribute.UT]: MIN_QUALITY,
  };

  // OQ is always rolled
  stats[QualityAttribute.OQ] = rollQuality();

  // Roll relevant attributes
  for (const attr of relevantAttributes) {
    stats[attr] = rollQuality();
  }

  return stats;
}

// ===== Resource Type Definitions =====

export const RESOURCE_TYPES: ResourceType[] = [
  // === ORE (Mining) ===
  { id: 'copper_ore', name: 'Copper Ore', category: 'ore', tier: 1, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR], baseHarvestTime: 3, profession: 'Mining', minProfessionLevel: 1 },
  { id: 'iron_ore', name: 'Iron Ore', category: 'ore', tier: 2, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE], baseHarvestTime: 4, profession: 'Mining', minProfessionLevel: 10 },
  { id: 'steel_ore', name: 'Steel Ore', category: 'ore', tier: 3, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE], baseHarvestTime: 5, profession: 'Mining', minProfessionLevel: 25 },
  { id: 'mithril_ore', name: 'Mithril Ore', category: 'ore', tier: 4, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 6, profession: 'Mining', minProfessionLevel: 40 },
  { id: 'obsidian_ore', name: 'Obsidian Ore', category: 'ore', tier: 5, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 7, profession: 'Mining', minProfessionLevel: 55 },
  { id: 'starmetal_ore', name: 'Starmetal Ore', category: 'ore', tier: 6, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 8, profession: 'Mining', minProfessionLevel: 70 },
  { id: 'void_ore', name: 'Void Ore', category: 'ore', tier: 7, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 9, profession: 'Mining', minProfessionLevel: 85 },
  { id: 'divine_ore', name: 'Divine Ore', category: 'ore', tier: 8, relevantAttributes: [QualityAttribute.CD, QualityAttribute.MA, QualityAttribute.UT, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 10, profession: 'Mining', minProfessionLevel: 95 },

  // === WOOD (Logging) ===
  { id: 'pine_log', name: 'Pine Log', category: 'wood', tier: 1, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA], baseHarvestTime: 3, profession: 'Logging', minProfessionLevel: 1 },
  { id: 'oak_log', name: 'Oak Log', category: 'wood', tier: 2, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR], baseHarvestTime: 4, profession: 'Logging', minProfessionLevel: 10 },
  { id: 'maple_log', name: 'Maple Log', category: 'wood', tier: 3, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR], baseHarvestTime: 5, profession: 'Logging', minProfessionLevel: 25 },
  { id: 'ironwood_log', name: 'Ironwood Log', category: 'wood', tier: 4, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR, QualityAttribute.PE], baseHarvestTime: 6, profession: 'Logging', minProfessionLevel: 40 },
  { id: 'bloodwood_log', name: 'Bloodwood Log', category: 'wood', tier: 5, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR, QualityAttribute.PE], baseHarvestTime: 7, profession: 'Logging', minProfessionLevel: 55 },
  { id: 'spiritwood_log', name: 'Spiritwood Log', category: 'wood', tier: 6, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.CD], baseHarvestTime: 8, profession: 'Logging', minProfessionLevel: 70 },
  { id: 'worldtree_log', name: 'Worldtree Log', category: 'wood', tier: 7, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.CD], baseHarvestTime: 9, profession: 'Logging', minProfessionLevel: 85 },
  { id: 'divine_wood', name: 'Divine Wood', category: 'wood', tier: 8, relevantAttributes: [QualityAttribute.UT, QualityAttribute.DR, QualityAttribute.MA, QualityAttribute.SR, QualityAttribute.PE, QualityAttribute.CD], baseHarvestTime: 10, profession: 'Logging', minProfessionLevel: 95 },

  // === HERB (Herbalism) ===
  { id: 'wild_herb', name: 'Wild Herbs', category: 'herb', tier: 1, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 2, profession: 'Herbalism', minProfessionLevel: 1 },
  { id: 'healing_herbs', name: 'Healing Herbs', category: 'herb', tier: 2, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR, QualityAttribute.CD], baseHarvestTime: 3, profession: 'Herbalism', minProfessionLevel: 10 },
  { id: 'mystic_herbs', name: 'Mystic Herbs', category: 'herb', tier: 3, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR, QualityAttribute.CD], baseHarvestTime: 4, profession: 'Herbalism', minProfessionLevel: 25 },
  { id: 'dragon_herbs', name: 'Dragon Herbs', category: 'herb', tier: 4, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR, QualityAttribute.CD], baseHarvestTime: 5, profession: 'Herbalism', minProfessionLevel: 40 },
  { id: 'void_herbs', name: 'Void Herbs', category: 'herb', tier: 5, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR, QualityAttribute.CD], baseHarvestTime: 6, profession: 'Herbalism', minProfessionLevel: 55 },

  // === FISH (Fishing) ===
  { id: 'common_fish', name: 'Common Fish', category: 'fish', tier: 1, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE], baseHarvestTime: 4, profession: 'Fishing', minProfessionLevel: 1 },
  { id: 'river_fish', name: 'River Fish', category: 'fish', tier: 2, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 5, profession: 'Fishing', minProfessionLevel: 10 },
  { id: 'deep_fish', name: 'Deep Sea Fish', category: 'fish', tier: 3, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR], baseHarvestTime: 6, profession: 'Fishing', minProfessionLevel: 25 },
  { id: 'legendary_fish', name: 'Legendary Fish', category: 'fish', tier: 4, relevantAttributes: [QualityAttribute.FL, QualityAttribute.PE, QualityAttribute.DR, QualityAttribute.CD], baseHarvestTime: 8, profession: 'Fishing', minProfessionLevel: 50 },

  // === HIDE (Skinning) ===
  { id: 'animal_hide', name: 'Animal Hide', category: 'hide', tier: 1, relevantAttributes: [QualityAttribute.DR, QualityAttribute.SR, QualityAttribute.UT], baseHarvestTime: 2, profession: 'Skinning', minProfessionLevel: 1 },
  { id: 'thick_hide', name: 'Thick Hide', category: 'hide', tier: 2, relevantAttributes: [QualityAttribute.DR, QualityAttribute.SR, QualityAttribute.UT, QualityAttribute.MA], baseHarvestTime: 3, profession: 'Skinning', minProfessionLevel: 10 },
  { id: 'exotic_hide', name: 'Exotic Hide', category: 'hide', tier: 3, relevantAttributes: [QualityAttribute.DR, QualityAttribute.SR, QualityAttribute.UT, QualityAttribute.MA], baseHarvestTime: 4, profession: 'Skinning', minProfessionLevel: 25 },
  { id: 'dragon_hide', name: 'Dragon Hide', category: 'hide', tier: 4, relevantAttributes: [QualityAttribute.DR, QualityAttribute.SR, QualityAttribute.UT, QualityAttribute.MA, QualityAttribute.PE], baseHarvestTime: 5, profession: 'Skinning', minProfessionLevel: 50 },
];

// ===== Spawn Manager =====

const SPAWN_DURATION_MIN = 3 * 24 * 60 * 60 * 1000; // 3 days
const SPAWN_DURATION_MAX = 7 * 24 * 60 * 60 * 1000; // 7 days

let spawnCounter = 0;

/** Create a new resource spawn with random quality */
export function createResourceSpawn(resourceTypeId: string, regions: string[]): ResourceSpawn {
  const resType = RESOURCE_TYPES.find(r => r.id === resourceTypeId);
  if (!resType) throw new Error(`Unknown resource type: ${resourceTypeId}`);

  const now = Date.now();
  const duration = SPAWN_DURATION_MIN + Math.random() * (SPAWN_DURATION_MAX - SPAWN_DURATION_MIN);

  return {
    id: `spawn_${resourceTypeId}_${++spawnCounter}`,
    resourceTypeId,
    quality: generateSpawnQuality(resType.relevantAttributes),
    regions,
    spawnedAt: now,
    expiresAt: now + duration,
    densityMap: new Map(),
  };
}

/** Check if a spawn is still active */
export function isSpawnActive(spawn: ResourceSpawn): boolean {
  return Date.now() < spawn.expiresAt;
}

// ===== Quality Calculations for Crafting =====

/** Weight profile for a crafting recipe — which quality attributes matter and how much */
export interface QualityWeights {
  [QualityAttribute.OQ]?: number;
  [QualityAttribute.CD]?: number;
  [QualityAttribute.DR]?: number;
  [QualityAttribute.FL]?: number;
  [QualityAttribute.MA]?: number;
  [QualityAttribute.PE]?: number;
  [QualityAttribute.SR]?: number;
  [QualityAttribute.UT]?: number;
}

/** Common quality weight presets for different recipe types */
export const QUALITY_PRESETS = {
  /** Melee weapons: PE + UT + OQ */
  meleeWeapon: { [QualityAttribute.PE]: 0.4, [QualityAttribute.UT]: 0.3, [QualityAttribute.OQ]: 0.2, [QualityAttribute.MA]: 0.1 } as QualityWeights,
  /** Ranged weapons: PE + CD + OQ */
  rangedWeapon: { [QualityAttribute.PE]: 0.35, [QualityAttribute.CD]: 0.25, [QualityAttribute.OQ]: 0.25, [QualityAttribute.UT]: 0.15 } as QualityWeights,
  /** Heavy armor: SR + DR + UT */
  heavyArmor: { [QualityAttribute.SR]: 0.4, [QualityAttribute.DR]: 0.3, [QualityAttribute.UT]: 0.2, [QualityAttribute.OQ]: 0.1 } as QualityWeights,
  /** Light armor: DR + MA + OQ */
  lightArmor: { [QualityAttribute.DR]: 0.35, [QualityAttribute.MA]: 0.25, [QualityAttribute.OQ]: 0.25, [QualityAttribute.SR]: 0.15 } as QualityWeights,
  /** Food/cooking: FL + PE + OQ */
  food: { [QualityAttribute.FL]: 0.5, [QualityAttribute.PE]: 0.25, [QualityAttribute.OQ]: 0.25 } as QualityWeights,
  /** Potions/alchemy: PE + CD + FL */
  potion: { [QualityAttribute.PE]: 0.35, [QualityAttribute.CD]: 0.3, [QualityAttribute.FL]: 0.2, [QualityAttribute.OQ]: 0.15 } as QualityWeights,
  /** Enchanting: CD + PE + OQ */
  enchanting: { [QualityAttribute.CD]: 0.4, [QualityAttribute.PE]: 0.3, [QualityAttribute.OQ]: 0.2, [QualityAttribute.MA]: 0.1 } as QualityWeights,
  /** Engineering: UT + CD + MA */
  engineering: { [QualityAttribute.UT]: 0.35, [QualityAttribute.CD]: 0.3, [QualityAttribute.MA]: 0.2, [QualityAttribute.OQ]: 0.15 } as QualityWeights,
} as const;

/**
 * Calculate the weighted quality score for a set of resources against a weight profile.
 * Returns a value between 300 and 1000.
 * Used to determine the base quality of a crafted item.
 */
export function calculateWeightedQuality(
  resources: HarvestedResource[],
  weights: QualityWeights,
): number {
  if (resources.length === 0) return MIN_QUALITY;

  // Average the quality stats across all resources, weighted by quantity
  let totalQuantity = 0;
  const avgStats: ResourceQualityStats = {
    [QualityAttribute.OQ]: 0,
    [QualityAttribute.CD]: 0,
    [QualityAttribute.DR]: 0,
    [QualityAttribute.FL]: 0,
    [QualityAttribute.MA]: 0,
    [QualityAttribute.PE]: 0,
    [QualityAttribute.SR]: 0,
    [QualityAttribute.UT]: 0,
  };

  for (const res of resources) {
    for (const attr of Object.values(QualityAttribute)) {
      avgStats[attr] += res.quality[attr] * res.quantity;
    }
    totalQuantity += res.quantity;
  }

  if (totalQuantity === 0) return MIN_QUALITY;
  for (const attr of Object.values(QualityAttribute)) {
    avgStats[attr] /= totalQuantity;
  }

  // Apply weights
  let weightedSum = 0;
  let weightTotal = 0;
  for (const [attr, weight] of Object.entries(weights)) {
    if (weight && weight > 0) {
      weightedSum += avgStats[attr as QualityAttribute] * weight;
      weightTotal += weight;
    }
  }

  if (weightTotal === 0) return avgStats[QualityAttribute.OQ];
  return Math.round(Math.max(MIN_QUALITY, Math.min(MAX_QUALITY, weightedSum / weightTotal)));
}

/**
 * Calculate the final item stat based on resource quality.
 * Formula: baseStat * (weightedQuality / 1000) * (1 + experimentBonus)
 */
export function calculateItemStat(
  baseStat: number,
  weightedQuality: number,
  experimentBonus: number = 0,
): number {
  const qualityMult = weightedQuality / MAX_QUALITY;
  return Math.round(baseStat * qualityMult * (1 + experimentBonus));
}

/** Get a quality rating label */
export function getQualityLabel(quality: number): string {
  if (quality >= 950) return 'Legendary';
  if (quality >= 850) return 'Exceptional';
  if (quality >= 700) return 'Superior';
  if (quality >= 550) return 'Good';
  if (quality >= 400) return 'Average';
  return 'Poor';
}

/** Get a quality color for UI */
export function getQualityColor(quality: number): string {
  if (quality >= 950) return '#F59E0B'; // Gold
  if (quality >= 850) return '#A855F7'; // Purple
  if (quality >= 700) return '#3B82F6'; // Blue
  if (quality >= 550) return '#10B981'; // Green
  if (quality >= 400) return '#9CA3AF'; // Gray
  return '#6B7280'; // Dark gray
}

// ===== Survey System =====

/** Survey result at a specific position */
export interface SurveyResult {
  resourceTypeId: string;
  spawnId: string;
  density: number; // 0-1
  quality: ResourceQualityStats;
  direction: number; // radians toward highest concentration
  distance: number; // meters to richest deposit
}

/**
 * Simulate surveying for resources near a position.
 * In SWG, surveying showed nearby resource concentrations.
 */
export function surveyArea(
  activeSpawns: ResourceSpawn[],
  resourceCategory: ResourceCategory,
  playerX: number,
  playerZ: number,
  surveyRadius: number = 50,
): SurveyResult[] {
  const results: SurveyResult[] = [];

  for (const spawn of activeSpawns) {
    const resType = RESOURCE_TYPES.find(r => r.id === spawn.resourceTypeId);
    if (!resType || resType.category !== resourceCategory) continue;
    if (!isSpawnActive(spawn)) continue;

    // Simulate density based on hash of position + spawn id
    const hash = simpleHash(`${spawn.id}_${Math.round(playerX / 10)}_${Math.round(playerZ / 10)}`);
    const density = 0.1 + (hash % 900) / 1000; // 0.1 to 1.0
    const angle = ((hash * 7) % 628) / 100; // 0 to ~2pi
    const dist = (hash % Math.round(surveyRadius * 10)) / 10;

    results.push({
      resourceTypeId: spawn.resourceTypeId,
      spawnId: spawn.id,
      density,
      quality: spawn.quality,
      direction: angle,
      distance: dist,
    });
  }

  return results.sort((a, b) => b.density - a.density);
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}
