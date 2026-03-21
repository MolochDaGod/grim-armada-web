// ===== Hero XP & Leveling System =====
// Ported from warlord-crafting-suite/shared/gameDefinitions/levelingSystem.ts
// Hero levels 1-20, XP from combat, harvesting, crafting, quests.

export const MAX_HERO_LEVEL = 20;

// XP required to reach each level (index = level - 1)
export const XP_CURVE: number[] = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  450,    // Level 4
  700,    // Level 5
  1000,   // Level 6
  1350,   // Level 7
  1750,   // Level 8
  2200,   // Level 9
  2700,   // Level 10
  3250,   // Level 11
  3850,   // Level 12
  4500,   // Level 13
  5200,   // Level 14
  5950,   // Level 15
  6750,   // Level 16
  7600,   // Level 17
  8500,   // Level 18
  9450,   // Level 19
  10450,  // Level 20 (cap)
];

// ===== Level-up Rewards =====

export interface LevelUpRewards {
  attributePoints: number;
  skillPoints: number;
  talentUnlock?: string;
}

export function getLevelUpRewards(newLevel: number): LevelUpRewards {
  const rewards: LevelUpRewards = {
    attributePoints: 3, // 3 points per level
    skillPoints: 1,     // 1 skill point per level
  };

  if (newLevel === 5) rewards.talentUnlock = 'tier1_talent';
  else if (newLevel === 10) rewards.talentUnlock = 'tier2_talent';
  else if (newLevel === 15) rewards.talentUnlock = 'tier3_talent';
  else if (newLevel === 20) rewards.talentUnlock = 'tier4_ultimate';

  return rewards;
}

// ===== XP Calculation =====

export function getXPForLevel(level: number): number {
  if (level < 1 || level > MAX_HERO_LEVEL) return 0;
  return XP_CURVE[level - 1];
}

export function getLevelFromXP(totalXP: number): number {
  for (let level = MAX_HERO_LEVEL; level >= 1; level--) {
    if (totalXP >= getXPForLevel(level)) return level;
  }
  return 1;
}

export function getXPToNextLevel(currentLevel: number, currentXP: number): number {
  if (currentLevel >= MAX_HERO_LEVEL) return 0;
  return getXPForLevel(currentLevel + 1) - currentXP;
}

export function getLevelProgress(currentLevel: number, currentXP: number): number {
  if (currentLevel >= MAX_HERO_LEVEL) return 1;
  const currentLevelXP = getXPForLevel(currentLevel);
  const nextLevelXP = getXPForLevel(currentLevel + 1);
  const range = nextLevelXP - currentLevelXP;
  if (range <= 0) return 1;
  return Math.min(1, (currentXP - currentLevelXP) / range);
}

/** Combat XP — scaled by level difference */
export function calculateCombatXP(enemyLevel: number, playerLevel: number): number {
  const baseXP = 50 + (enemyLevel * 10);
  const levelDiff = playerLevel - enemyLevel;

  if (levelDiff > 0) {
    const penalty = Math.min(levelDiff * 0.1, 0.8);
    return Math.floor(baseXP * (1 - penalty));
  }
  if (levelDiff < 0) {
    const bonus = Math.abs(levelDiff) * 0.15;
    return Math.floor(baseXP * (1 + bonus));
  }
  return baseXP;
}

/** Harvesting XP (small hero XP, main XP goes to profession) */
export function calculateHarvestHeroXP(nodeTier: number): number {
  return 5 + (nodeTier * 3);
}

/** Crafting XP */
export function calculateCraftHeroXP(itemTier: number): number {
  return 10 + (itemTier * 10);
}

// ===== Hero State =====

export interface HeroProgression {
  level: number;
  experience: number;
  totalAttributePoints: number;
  spentAttributePoints: number;
  totalSkillPoints: number;
  spentSkillPoints: number;
  attributes: HeroAttributes;
}

export interface HeroAttributes {
  strength: number;
  dexterity: number;
  intellect: number;
  wisdom: number;
  vitality: number;
  luck: number;
}

export function createDefaultProgression(): HeroProgression {
  return {
    level: 1,
    experience: 0,
    totalAttributePoints: 0,
    spentAttributePoints: 0,
    totalSkillPoints: 0,
    spentSkillPoints: 0,
    attributes: {
      strength: 10,
      dexterity: 10,
      intellect: 10,
      wisdom: 10,
      vitality: 10,
      luck: 5,
    },
  };
}

export interface XPGainResult {
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  rewards?: LevelUpRewards;
}

/** Add XP to hero, handle level-ups */
export function addHeroXP(progression: HeroProgression, amount: number): XPGainResult {
  const oldLevel = progression.level;
  progression.experience += amount;

  const newLevel = getLevelFromXP(progression.experience);
  const leveledUp = newLevel > oldLevel;

  let rewards: LevelUpRewards | undefined;
  if (leveledUp) {
    // Grant rewards for each level gained
    for (let lvl = oldLevel + 1; lvl <= newLevel; lvl++) {
      const r = getLevelUpRewards(lvl);
      progression.totalAttributePoints += r.attributePoints;
      progression.totalSkillPoints += r.skillPoints;
    }
    progression.level = newLevel;
    rewards = getLevelUpRewards(newLevel);
  }

  return {
    newXP: progression.experience,
    newLevel: progression.level,
    leveledUp,
    rewards,
  };
}

/** Spend an attribute point */
export function spendAttributePoint(
  progression: HeroProgression,
  attribute: keyof HeroAttributes,
): boolean {
  const available = progression.totalAttributePoints - progression.spentAttributePoints;
  if (available <= 0) return false;

  progression.attributes[attribute] += 1;
  progression.spentAttributePoints += 1;
  return true;
}

/** Get available attribute points */
export function getAvailableAttributePoints(p: HeroProgression): number {
  return p.totalAttributePoints - p.spentAttributePoints;
}

/** Get available skill points */
export function getAvailableSkillPoints(p: HeroProgression): number {
  return p.totalSkillPoints - p.spentSkillPoints;
}
