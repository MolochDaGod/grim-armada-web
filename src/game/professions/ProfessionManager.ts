// ===== Profession Manager =====
// 5 gathering + 5 crafting professions, each with independent XP/leveling.
// Ported from warlord-crafting-suite/shared/gameDefinitions/professions.ts

export const MAX_PROFESSION_LEVEL = 100;

export type ProfessionType = 'gathering' | 'crafting';

export type GatheringProfession = 'Mining' | 'Logging' | 'Herbalism' | 'Fishing' | 'Skinning';
export type CraftingProfession = 'Blacksmithing' | 'Woodworking' | 'Enchanting' | 'Alchemy' | 'Engineering';
export type ProfessionName = GatheringProfession | CraftingProfession;

export interface ProfessionDef {
  id: string;
  name: ProfessionName;
  type: ProfessionType;
  description: string;
  icon: string;
  primaryStat?: string;
  relatedProfessions?: string[];
}

export const GATHERING_PROFESSIONS: Record<GatheringProfession, ProfessionDef> = {
  Mining: { id: 'mining', name: 'Mining', type: 'gathering', description: 'Extract ore and gems from mineral deposits.', icon: '⛏️', primaryStat: 'strength', relatedProfessions: ['Blacksmithing', 'Engineering'] },
  Logging: { id: 'logging', name: 'Logging', type: 'gathering', description: 'Harvest wood from trees for construction.', icon: '🪓', primaryStat: 'strength', relatedProfessions: ['Woodworking', 'Engineering'] },
  Herbalism: { id: 'herbalism', name: 'Herbalism', type: 'gathering', description: 'Collect herbs and magical essences.', icon: '🌿', primaryStat: 'wisdom', relatedProfessions: ['Alchemy', 'Enchanting'] },
  Fishing: { id: 'fishing', name: 'Fishing', type: 'gathering', description: 'Catch fish for food and rare materials.', icon: '🎣', primaryStat: 'dexterity', relatedProfessions: ['Alchemy'] },
  Skinning: { id: 'skinning', name: 'Skinning', type: 'gathering', description: 'Harvest leather and hides from creatures.', icon: '🔪', primaryStat: 'dexterity', relatedProfessions: ['Woodworking'] },
};

export const CRAFTING_PROFESSIONS: Record<CraftingProfession, ProfessionDef> = {
  Blacksmithing: { id: 'blacksmithing', name: 'Blacksmithing', type: 'crafting', description: 'Forge weapons and heavy armor from metal.', icon: '🔨', primaryStat: 'strength', relatedProfessions: ['Mining'] },
  Woodworking: { id: 'woodworking', name: 'Woodworking', type: 'crafting', description: 'Craft bows, staves, and light armor.', icon: '🏹', primaryStat: 'dexterity', relatedProfessions: ['Logging', 'Skinning'] },
  Enchanting: { id: 'enchanting', name: 'Enchanting', type: 'crafting', description: 'Create magical staves and enchant items.', icon: '✨', primaryStat: 'intellect', relatedProfessions: ['Herbalism', 'Mining'] },
  Alchemy: { id: 'alchemy', name: 'Alchemy', type: 'crafting', description: 'Brew potions, cook food, transmute materials.', icon: '⚗️', primaryStat: 'wisdom', relatedProfessions: ['Herbalism', 'Fishing'] },
  Engineering: { id: 'engineering', name: 'Engineering', type: 'crafting', description: 'Build crossbows, guns, and mechanical devices.', icon: '⚙️', primaryStat: 'intellect', relatedProfessions: ['Mining', 'Logging'] },
};

export const ALL_PROFESSION_DEFS: ProfessionDef[] = [
  ...Object.values(GATHERING_PROFESSIONS),
  ...Object.values(CRAFTING_PROFESSIONS),
];

// ===== Profession XP Curve =====

/** XP required to reach a given profession level (exponential curve) */
export function getProfessionXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(Math.pow(level - 1, 2) * 10);
}

/** Calculate profession level from total XP */
export function getProfessionLevelFromXP(totalXP: number): number {
  for (let level = MAX_PROFESSION_LEVEL; level >= 1; level--) {
    if (totalXP >= getProfessionXPForLevel(level)) return level;
  }
  return 1;
}

/** XP needed to reach next level */
export function getXPToNextProfLevel(currentLevel: number, currentXP: number): number {
  if (currentLevel >= MAX_PROFESSION_LEVEL) return 0;
  return getProfessionXPForLevel(currentLevel + 1) - currentXP;
}

/** Progress 0-1 toward next level */
export function getProfessionLevelProgress(currentLevel: number, currentXP: number): number {
  if (currentLevel >= MAX_PROFESSION_LEVEL) return 1;
  const currentLevelXP = getProfessionXPForLevel(currentLevel);
  const nextLevelXP = getProfessionXPForLevel(currentLevel + 1);
  const range = nextLevelXP - currentLevelXP;
  if (range <= 0) return 1;
  return Math.min(1, (currentXP - currentLevelXP) / range);
}

// ===== Milestones =====

export interface ProfessionMilestone {
  level: number;
  name: string;
  description: string;
  unlocks: string;
}

export function getMilestones(professionName: ProfessionName): ProfessionMilestone[] {
  const isCrafting = (CRAFTING_PROFESSIONS as Record<string, ProfessionDef>)[professionName] !== undefined;

  if (isCrafting) {
    return [
      { level: 1, name: 'Novice', description: 'Begin your craft', unlocks: 'T1 recipes' },
      { level: 10, name: 'Apprentice', description: 'Learning the basics', unlocks: 'T2 recipes, Assembly bonus +5%' },
      { level: 25, name: 'Journeyman', description: 'A competent crafter', unlocks: 'T3 recipes, Experimentation unlocked' },
      { level: 40, name: 'Expert', description: 'Recognized skill', unlocks: 'T4 recipes, Assembly bonus +10%' },
      { level: 50, name: 'Specialist', description: 'Choose your first specialization', unlocks: 'Specialization 1' },
      { level: 60, name: 'Artisan', description: 'Master of technique', unlocks: 'T5 recipes, Experiment bonus +5%' },
      { level: 75, name: 'Master', description: 'Choose your second specialization', unlocks: 'Specialization 2, T6 recipes' },
      { level: 85, name: 'Grand Master', description: 'Among the finest', unlocks: 'T7 recipes' },
      { level: 95, name: 'Legendary', description: 'Legendary crafter', unlocks: 'T8 recipes' },
      { level: 100, name: 'Supreme', description: 'Choose final specialization', unlocks: 'Specialization 3, Supreme recipes' },
    ];
  }

  return [
    { level: 1, name: 'Novice', description: 'Begin gathering', unlocks: 'T1 nodes' },
    { level: 10, name: 'Apprentice', description: 'Improved yield', unlocks: 'T2 nodes, +1 yield' },
    { level: 25, name: 'Journeyman', description: 'Faster gathering', unlocks: 'T3 nodes, -15% gather time' },
    { level: 40, name: 'Expert', description: 'Keen eye for quality', unlocks: 'T4 nodes, Survey device bonus' },
    { level: 50, name: 'Specialist', description: 'Choose specialization', unlocks: 'Specialization 1, rare node chance' },
    { level: 60, name: 'Artisan', description: 'Expert gatherer', unlocks: 'T5 nodes, +2 yield' },
    { level: 75, name: 'Master', description: 'Master gatherer', unlocks: 'Specialization 2, T6 nodes' },
    { level: 85, name: 'Grand Master', description: 'Among the finest', unlocks: 'T7 nodes, critical harvest chance' },
    { level: 95, name: 'Legendary', description: 'Legendary gatherer', unlocks: 'T8 nodes' },
    { level: 100, name: 'Supreme', description: 'Supreme gatherer', unlocks: 'Specialization 3, supreme yield' },
  ];
}

/** Get the current milestone name for a profession level */
export function getCurrentMilestone(professionName: ProfessionName, level: number): ProfessionMilestone {
  const milestones = getMilestones(professionName);
  let current = milestones[0];
  for (const m of milestones) {
    if (level >= m.level) current = m;
    else break;
  }
  return current;
}

// ===== Profession State =====

export interface ProfessionState {
  profession: ProfessionName;
  level: number;
  experience: number;
  specializations: string[];
}

export function createDefaultProfessionStates(): ProfessionState[] {
  return ALL_PROFESSION_DEFS.map(def => ({
    profession: def.name,
    level: 1,
    experience: 0,
    specializations: [],
  }));
}

/** Add XP to a profession, returns whether it leveled up */
export function addProfessionXP(
  state: ProfessionState,
  amount: number,
): { leveledUp: boolean; newLevel: number; oldLevel: number } {
  const oldLevel = state.level;
  state.experience += amount;
  state.level = getProfessionLevelFromXP(state.experience);
  return { leveledUp: state.level > oldLevel, newLevel: state.level, oldLevel };
}

/** Get the max resource tier a profession level can access */
export function getMaxTierForLevel(level: number): number {
  if (level >= 95) return 8;
  if (level >= 85) return 7;
  if (level >= 75) return 6;
  if (level >= 60) return 5;
  if (level >= 40) return 4;
  if (level >= 25) return 3;
  if (level >= 10) return 2;
  return 1;
}

/** Get a profession state by name */
export function getProfessionState(
  states: ProfessionState[],
  name: ProfessionName,
): ProfessionState | undefined {
  return states.find(s => s.profession === name);
}

/** Map resource profession strings to ProfessionName */
export function resolveGatheringProfession(profString: string): GatheringProfession {
  const map: Record<string, GatheringProfession> = {
    Mining: 'Mining', Logging: 'Logging', Herbalism: 'Herbalism',
    Fishing: 'Fishing', Skinning: 'Skinning',
  };
  return map[profString] ?? 'Mining';
}
