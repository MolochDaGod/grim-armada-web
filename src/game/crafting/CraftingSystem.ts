// ===== SWG-Style Crafting System =====
// Select schematic → Load resources → Assembly roll → Experimentation → Name & Finalize
// Resource quality (300-1000) directly determines crafted item stats.

import {
  type QualityWeights, type HarvestedResource, QUALITY_PRESETS,
  calculateWeightedQuality, calculateItemStat, getQualityLabel,
} from './ResourceQuality';
import type { ItemInstance } from '../inventory/InventorySystem';

// ===== Crafting Station Types =====

export type CraftingStationType =
  | 'Anvil'          // Blacksmithing — weapons, heavy armor
  | 'Workbench'      // Woodworking/Engineering — bows, gadgets
  | 'AlchemyTable'   // Alchemy — potions, food
  | 'EnchantingCircle' // Enchanting — staves, cloth, enchants
  | 'Loom'           // Tailoring — cloth, light armor
  | 'Campfire';      // T0 basic cooking — anyone can use

export interface CraftingStation {
  id: string;
  type: CraftingStationType;
  position: [number, number, number];
  modelUrl: string;
}

// ===== Schematic (Recipe) =====

export interface SchematicIngredient {
  /** Resource category (ore, wood, herb, etc.) or specific item def ID */
  resourceType: string;
  /** Minimum tier required */
  minTier: number;
  /** Quantity needed */
  quantity: number;
  /** Label shown in UI */
  label: string;
}

export interface Schematic {
  id: string;
  name: string;
  description: string;
  /** Crafting profession required */
  profession: string;
  /** Minimum profession level to learn */
  minLevel: number;
  /** Which station type this needs */
  stationType: CraftingStationType;
  /** Ingredients required */
  ingredients: SchematicIngredient[];
  /** Quality weights — which resource attributes affect the output */
  qualityWeights: QualityWeights;
  /** Base stats of the output item (before quality modifiers) */
  baseStats: Record<string, number>;
  /** Output item def ID */
  outputItemId: string;
  /** Output item tier */
  outputTier: number;
  /** Experimentation categories available */
  experimentCategories: ExperimentCategory[];
  /** Crafting XP reward */
  craftXP: number;
}

export interface ExperimentCategory {
  id: string;
  name: string;
  /** Which stat this category improves */
  stat: string;
  /** Max bonus percentage achievable */
  maxBonus: number;
}

// ===== Assembly Phase =====

export type AssemblyResult = 'criticalSuccess' | 'greatSuccess' | 'success' | 'moderate' | 'failure' | 'criticalFailure';

export interface AssemblyOutcome {
  result: AssemblyResult;
  /** Multiplier to base quality (0.0 = destroyed, 0.5 = half, 1.0 = full, 1.2 = bonus) */
  qualityMultiplier: number;
  message: string;
}

/**
 * Perform the assembly roll.
 * AssemblySuccess skill mod + profession level affect the outcome.
 */
export function performAssembly(
  assemblySkillMod: number,
  professionLevel: number,
): AssemblyOutcome {
  // Base success chance = 40% + skill mod + (profession level * 0.4)
  const successChance = Math.min(95, 40 + assemblySkillMod + professionLevel * 0.4);
  const roll = Math.random() * 100;

  if (roll < successChance * 0.05) {
    return { result: 'criticalSuccess', qualityMultiplier: 1.15, message: 'Critical Success! Exceptional assembly!' };
  }
  if (roll < successChance * 0.2) {
    return { result: 'greatSuccess', qualityMultiplier: 1.08, message: 'Great Success! Superior assembly.' };
  }
  if (roll < successChance) {
    return { result: 'success', qualityMultiplier: 1.0, message: 'Assembly successful.' };
  }
  if (roll < successChance + (100 - successChance) * 0.6) {
    return { result: 'moderate', qualityMultiplier: 0.85, message: 'Moderate result. Some quality lost.' };
  }
  if (roll < successChance + (100 - successChance) * 0.9) {
    return { result: 'failure', qualityMultiplier: 0.6, message: 'Assembly failed. Significant quality loss.' };
  }
  return { result: 'criticalFailure', qualityMultiplier: 0, message: 'Critical Failure! Resources destroyed.' };
}

// ===== Experimentation Phase =====

export type ExperimentResult = 'amazingSuccess' | 'greatSuccess' | 'goodSuccess' | 'moderate' | 'smallGain' | 'failure' | 'criticalFailure';

export interface ExperimentOutcome {
  result: ExperimentResult;
  /** Bonus applied to the stat (percentage) */
  bonus: number;
  message: string;
}

/**
 * Perform a single experimentation roll.
 * Risk/reward: you can gain big bonuses or lose quality.
 * ExperimentSuccess skill mod affects the outcome.
 */
export function performExperiment(
  experimentSkillMod: number,
  professionLevel: number,
  currentBonus: number,
  maxBonus: number,
): ExperimentOutcome {
  // Higher existing bonus = harder to improve (diminishing returns)
  const difficultyPenalty = (currentBonus / maxBonus) * 30;
  const successChance = Math.min(90, 30 + experimentSkillMod + professionLevel * 0.3 - difficultyPenalty);
  const roll = Math.random() * 100;

  const remaining = maxBonus - currentBonus;

  if (roll < successChance * 0.03) {
    const gain = Math.min(remaining, maxBonus * 0.20);
    return { result: 'amazingSuccess', bonus: gain, message: 'Amazing Success! Massive improvement!' };
  }
  if (roll < successChance * 0.1) {
    const gain = Math.min(remaining, maxBonus * 0.12);
    return { result: 'greatSuccess', bonus: gain, message: 'Great Success! Major improvement.' };
  }
  if (roll < successChance * 0.4) {
    const gain = Math.min(remaining, maxBonus * 0.08);
    return { result: 'goodSuccess', bonus: gain, message: 'Good result. Noticeable improvement.' };
  }
  if (roll < successChance) {
    const gain = Math.min(remaining, maxBonus * 0.04);
    return { result: 'moderate', bonus: gain, message: 'Moderate improvement.' };
  }
  if (roll < successChance + (100 - successChance) * 0.5) {
    return { result: 'smallGain', bonus: maxBonus * 0.01, message: 'Slight improvement.' };
  }
  if (roll < successChance + (100 - successChance) * 0.85) {
    return { result: 'failure', bonus: 0, message: 'Experiment failed. No change.' };
  }
  return { result: 'criticalFailure', bonus: -(maxBonus * 0.05), message: 'Critical Failure! Quality decreased!' };
}

// ===== Crafting Session =====

export interface CraftingSession {
  schematic: Schematic;
  /** Resources loaded into each ingredient slot */
  loadedResources: (HarvestedResource | null)[];
  /** Assembly result (null = not yet assembled) */
  assemblyResult: AssemblyOutcome | null;
  /** Experimentation bonuses per category */
  experimentBonuses: Record<string, number>;
  /** Remaining experiment points */
  experimentPointsRemaining: number;
  /** Max experiment points (based on profession level) */
  experimentPointsMax: number;
  /** Custom name for the item */
  customName: string;
  /** Whether the session is finalized */
  finalized: boolean;
}

/** Start a new crafting session */
export function startCraftingSession(
  schematic: Schematic,
  professionLevel: number,
): CraftingSession {
  // Experiment points: base 2, +1 per 25 profession levels
  const expPoints = 2 + Math.floor(professionLevel / 25);

  const bonuses: Record<string, number> = {};
  for (const cat of schematic.experimentCategories) {
    bonuses[cat.id] = 0;
  }

  return {
    schematic,
    loadedResources: schematic.ingredients.map(() => null),
    assemblyResult: null,
    experimentBonuses: bonuses,
    experimentPointsRemaining: expPoints,
    experimentPointsMax: expPoints,
    customName: schematic.name,
    finalized: false,
  };
}

/** Load a resource into an ingredient slot */
export function loadResource(
  session: CraftingSession,
  slotIndex: number,
  resource: HarvestedResource,
): boolean {
  if (slotIndex < 0 || slotIndex >= session.schematic.ingredients.length) return false;
  if (resource.quantity < session.schematic.ingredients[slotIndex].quantity) return false;
  session.loadedResources[slotIndex] = resource;
  return true;
}

/** Check if all ingredient slots are filled */
export function canAssemble(session: CraftingSession): boolean {
  return session.loadedResources.every((r, i) => {
    if (!r) return false;
    return r.quantity >= session.schematic.ingredients[i].quantity;
  });
}

/** Perform assembly on the session */
export function assembleItem(
  session: CraftingSession,
  assemblySkillMod: number,
  professionLevel: number,
): AssemblyOutcome {
  const result = performAssembly(assemblySkillMod, professionLevel);
  session.assemblyResult = result;
  return result;
}

/** Perform an experimentation attempt on a category */
export function experimentOnCategory(
  session: CraftingSession,
  categoryId: string,
  experimentSkillMod: number,
  professionLevel: number,
): ExperimentOutcome | null {
  if (session.experimentPointsRemaining <= 0) return null;
  if (!session.assemblyResult || session.assemblyResult.result === 'criticalFailure') return null;

  const category = session.schematic.experimentCategories.find(c => c.id === categoryId);
  if (!category) return null;

  const currentBonus = session.experimentBonuses[categoryId] ?? 0;
  const result = performExperiment(experimentSkillMod, professionLevel, currentBonus, category.maxBonus);

  session.experimentBonuses[categoryId] = Math.max(0, (session.experimentBonuses[categoryId] ?? 0) + result.bonus);
  session.experimentPointsRemaining--;

  return result;
}

/** Finalize the crafted item — returns the final item instance */
export function finalizeCraftedItem(
  session: CraftingSession,
  crafterName: string,
): ItemInstance | null {
  if (!session.assemblyResult) return null;
  if (session.assemblyResult.result === 'criticalFailure') return null;

  // Calculate weighted resource quality
  const validResources = session.loadedResources.filter((r): r is HarvestedResource => r !== null);
  const baseQuality = calculateWeightedQuality(validResources, session.schematic.qualityWeights);

  // Apply assembly multiplier
  const assemblyQuality = Math.round(baseQuality * session.assemblyResult.qualityMultiplier);

  // Calculate total experiment bonus (average across all categories)
  const bonusValues = Object.values(session.experimentBonuses);
  const totalExpBonus = bonusValues.length > 0
    ? bonusValues.reduce((a, b) => a + b, 0) / bonusValues.length / 100
    : 0;

  // Calculate final stats
  const computedStats: Record<string, number> = {};
  for (const [stat, base] of Object.entries(session.schematic.baseStats)) {
    // Find category-specific bonus for this stat
    const catBonus = session.schematic.experimentCategories.find(c => c.stat === stat);
    const specificBonus = catBonus ? (session.experimentBonuses[catBonus.id] ?? 0) / 100 : totalExpBonus;
    computedStats[stat] = calculateItemStat(base, assemblyQuality, specificBonus);
  }

  session.finalized = true;

  return {
    instanceId: `crafted_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    defId: session.schematic.outputItemId,
    quantity: 1,
    computedStats,
    customName: session.customName || session.schematic.name,
    craftedBy: crafterName,
    experimentBonus: totalExpBonus,
    durability: computedStats.durability ?? 100,
    maxDurability: computedStats.durability ?? 100,
  };
}

// ===== Starter Schematics =====

export const STARTER_SCHEMATICS: Schematic[] = [
  // BLACKSMITHING
  {
    id: 'sch_copper_sword', name: 'Copper Sword', description: 'A basic copper blade',
    profession: 'Blacksmithing', minLevel: 1, stationType: 'Anvil',
    ingredients: [
      { resourceType: 'ore', minTier: 1, quantity: 5, label: 'Metal Ore' },
      { resourceType: 'wood', minTier: 1, quantity: 2, label: 'Wood (Handle)' },
    ],
    qualityWeights: QUALITY_PRESETS.meleeWeapon,
    baseStats: { Damage: 25, Speed: 1.2, durability: 100 },
    outputItemId: 'wpn_copper_sword', outputTier: 1,
    experimentCategories: [
      { id: 'exp_damage', name: 'Damage', stat: 'Damage', maxBonus: 15 },
      { id: 'exp_speed', name: 'Attack Speed', stat: 'Speed', maxBonus: 10 },
    ],
    craftXP: 15,
  },
  {
    id: 'sch_iron_sword', name: 'Iron Longsword', description: 'A sturdy iron blade',
    profession: 'Blacksmithing', minLevel: 10, stationType: 'Anvil',
    ingredients: [
      { resourceType: 'ore', minTier: 2, quantity: 8, label: 'Iron Ore' },
      { resourceType: 'wood', minTier: 1, quantity: 3, label: 'Wood (Handle)' },
      { resourceType: 'hide', minTier: 1, quantity: 2, label: 'Leather (Grip)' },
    ],
    qualityWeights: QUALITY_PRESETS.meleeWeapon,
    baseStats: { Damage: 55, Speed: 1.0, durability: 150 },
    outputItemId: 'wpn_iron_sword', outputTier: 2,
    experimentCategories: [
      { id: 'exp_damage', name: 'Damage', stat: 'Damage', maxBonus: 20 },
      { id: 'exp_speed', name: 'Attack Speed', stat: 'Speed', maxBonus: 12 },
      { id: 'exp_dur', name: 'Durability', stat: 'durability', maxBonus: 15 },
    ],
    craftXP: 25,
  },
  {
    id: 'sch_copper_helm', name: 'Copper Helm', description: 'Basic copper helmet',
    profession: 'Blacksmithing', minLevel: 5, stationType: 'Anvil',
    ingredients: [
      { resourceType: 'ore', minTier: 1, quantity: 6, label: 'Metal Ore' },
      { resourceType: 'hide', minTier: 1, quantity: 2, label: 'Leather (Padding)' },
    ],
    qualityWeights: QUALITY_PRESETS.heavyArmor,
    baseStats: { Armor: 8, durability: 120 },
    outputItemId: 'arm_copper_helm', outputTier: 1,
    experimentCategories: [
      { id: 'exp_armor', name: 'Armor Rating', stat: 'Armor', maxBonus: 15 },
      { id: 'exp_dur', name: 'Durability', stat: 'durability', maxBonus: 20 },
    ],
    craftXP: 15,
  },

  // WOODWORKING
  {
    id: 'sch_pine_bow', name: 'Pine Shortbow', description: 'A simple wooden bow',
    profession: 'Woodworking', minLevel: 1, stationType: 'Workbench',
    ingredients: [
      { resourceType: 'wood', minTier: 1, quantity: 6, label: 'Wood' },
      { resourceType: 'hide', minTier: 1, quantity: 3, label: 'String (Hide)' },
    ],
    qualityWeights: QUALITY_PRESETS.rangedWeapon,
    baseStats: { Damage: 20, Range: 35, Speed: 1.5, durability: 80 },
    outputItemId: 'wpn_pine_bow', outputTier: 1,
    experimentCategories: [
      { id: 'exp_damage', name: 'Damage', stat: 'Damage', maxBonus: 15 },
      { id: 'exp_range', name: 'Range', stat: 'Range', maxBonus: 10 },
    ],
    craftXP: 15,
  },

  // ALCHEMY
  {
    id: 'sch_health_potion', name: 'Health Potion', description: 'Restores health over time',
    profession: 'Alchemy', minLevel: 1, stationType: 'AlchemyTable',
    ingredients: [
      { resourceType: 'herb', minTier: 1, quantity: 3, label: 'Herbs' },
      { resourceType: 'fish', minTier: 1, quantity: 1, label: 'Aquatic Essence' },
    ],
    qualityWeights: QUALITY_PRESETS.potion,
    baseStats: { healAmount: 150, duration: 10 },
    outputItemId: 'potion_health_crafted', outputTier: 1,
    experimentCategories: [
      { id: 'exp_heal', name: 'Healing Power', stat: 'healAmount', maxBonus: 25 },
      { id: 'exp_dur', name: 'Duration', stat: 'duration', maxBonus: 15 },
    ],
    craftXP: 12,
  },
  {
    id: 'sch_cooked_meat', name: 'Cooked Meat', description: 'Restores health when eaten',
    profession: 'Alchemy', minLevel: 1, stationType: 'Campfire',
    ingredients: [
      { resourceType: 'hide', minTier: 1, quantity: 1, label: 'Raw Meat' },
      { resourceType: 'herb', minTier: 1, quantity: 1, label: 'Seasoning' },
    ],
    qualityWeights: QUALITY_PRESETS.food,
    baseStats: { healAmount: 50 },
    outputItemId: 'food_charred_meat', outputTier: 0,
    experimentCategories: [
      { id: 'exp_heal', name: 'Nourishment', stat: 'healAmount', maxBonus: 20 },
    ],
    craftXP: 5,
  },

  // ENCHANTING
  {
    id: 'sch_arcane_staff', name: 'Arcane Staff', description: 'A staff infused with arcane energy',
    profession: 'Enchanting', minLevel: 5, stationType: 'EnchantingCircle',
    ingredients: [
      { resourceType: 'wood', minTier: 1, quantity: 5, label: 'Staff Wood' },
      { resourceType: 'herb', minTier: 1, quantity: 3, label: 'Arcane Herbs' },
      { resourceType: 'ore', minTier: 1, quantity: 2, label: 'Crystal Focus' },
    ],
    qualityWeights: QUALITY_PRESETS.enchanting,
    baseStats: { Damage: 30, MagicPower: 20, durability: 90 },
    outputItemId: 'wpn_arcane_staff', outputTier: 1,
    experimentCategories: [
      { id: 'exp_damage', name: 'Spell Damage', stat: 'Damage', maxBonus: 15 },
      { id: 'exp_magic', name: 'Magic Power', stat: 'MagicPower', maxBonus: 20 },
    ],
    craftXP: 18,
  },
];

/** Get schematics available at a given profession + level */
export function getAvailableSchematics(
  profession: string,
  professionLevel: number,
): Schematic[] {
  return STARTER_SCHEMATICS.filter(
    s => s.profession === profession && s.minLevel <= professionLevel,
  );
}

/** Get all schematics for a station type */
export function getSchematicsForStation(stationType: CraftingStationType): Schematic[] {
  return STARTER_SCHEMATICS.filter(s => s.stationType === stationType);
}
