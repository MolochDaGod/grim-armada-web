// ===== SWG-Style Skill Tree System =====
// Each profession has a 4x4 grid of skill boxes.
// Spending XP in a box unlocks abilities, skill mods, or certifications.
// Boxes have prerequisites (must unlock parent first).

import { SkillModType } from '../core/types';

// ===== Skill Box Definition =====

export interface SkillModBonus {
  mod: SkillModType;
  value: number;
}

export interface SkillBox {
  id: string;
  name: string;
  description: string;
  /** Grid position: row 0-3, col 0-3 */
  row: number;
  col: number;
  /** XP cost to unlock this box */
  xpCost: number;
  /** Required hero level */
  requiredLevel: number;
  /** Prerequisite box IDs (must be unlocked first) */
  prerequisites: string[];
  /** Skill mods granted */
  skillMods: SkillModBonus[];
  /** Abilities unlocked */
  abilitiesUnlocked: string[];
  /** Certifications granted (e.g., "can_use_rifle") */
  certifications: string[];
  /** Is this the novice (entry) box? */
  isNovice?: boolean;
  /** Is this the master (final) box? */
  isMaster?: boolean;
}

export interface SkillTree {
  professionId: string;
  professionName: string;
  boxes: SkillBox[];
}

// ===== Skill Tree State =====

export interface SkillTreeState {
  professionId: string;
  unlockedBoxes: Set<string>;
  totalXPSpent: number;
}

export function createSkillTreeState(professionId: string): SkillTreeState {
  return { professionId, unlockedBoxes: new Set(), totalXPSpent: 0 };
}

/** Check if a box can be unlocked */
export function canUnlockBox(
  tree: SkillTree,
  state: SkillTreeState,
  boxId: string,
  availableXP: number,
  heroLevel: number,
): string | null {
  if (state.unlockedBoxes.has(boxId)) return 'Already unlocked';

  const box = tree.boxes.find(b => b.id === boxId);
  if (!box) return 'Unknown skill box';

  if (heroLevel < box.requiredLevel) return `Requires level ${box.requiredLevel}`;
  if (availableXP < box.xpCost) return `Need ${box.xpCost} XP (have ${availableXP})`;

  // Check prerequisites
  for (const prereq of box.prerequisites) {
    if (!state.unlockedBoxes.has(prereq)) {
      const prereqBox = tree.boxes.find(b => b.id === prereq);
      return `Requires: ${prereqBox?.name ?? prereq}`;
    }
  }

  return null;
}

/** Unlock a skill box, returns XP consumed */
export function unlockBox(
  tree: SkillTree,
  state: SkillTreeState,
  boxId: string,
): number {
  const box = tree.boxes.find(b => b.id === boxId);
  if (!box) return 0;

  state.unlockedBoxes.add(boxId);
  state.totalXPSpent += box.xpCost;
  return box.xpCost;
}

/** Get all skill mods from unlocked boxes */
export function getUnlockedSkillMods(tree: SkillTree, state: SkillTreeState): Map<SkillModType, number> {
  const mods = new Map<SkillModType, number>();

  for (const boxId of state.unlockedBoxes) {
    const box = tree.boxes.find(b => b.id === boxId);
    if (!box) continue;
    for (const mod of box.skillMods) {
      mods.set(mod.mod, (mods.get(mod.mod) ?? 0) + mod.value);
    }
  }

  return mods;
}

/** Get all unlocked abilities */
export function getUnlockedAbilities(tree: SkillTree, state: SkillTreeState): string[] {
  const abilities: string[] = [];
  for (const boxId of state.unlockedBoxes) {
    const box = tree.boxes.find(b => b.id === boxId);
    if (box) abilities.push(...box.abilitiesUnlocked);
  }
  return abilities;
}

/** Get all unlocked certifications */
export function getUnlockedCertifications(tree: SkillTree, state: SkillTreeState): string[] {
  const certs: string[] = [];
  for (const boxId of state.unlockedBoxes) {
    const box = tree.boxes.find(b => b.id === boxId);
    if (box) certs.push(...box.certifications);
  }
  return certs;
}

/** Calculate total progress: unlocked/total boxes */
export function getTreeProgress(tree: SkillTree, state: SkillTreeState): { unlocked: number; total: number; pct: number } {
  const total = tree.boxes.length;
  const unlocked = state.unlockedBoxes.size;
  return { unlocked, total, pct: total > 0 ? unlocked / total : 0 };
}

// ===== Skill Tree Definitions =====

export const MARKSMAN_TREE: SkillTree = {
  professionId: 'marksman',
  professionName: 'Marksman',
  boxes: [
    // Row 0: Novice
    { id: 'mk_novice', name: 'Novice Marksman', description: 'Basic ranged combat training', row: 0, col: 1, xpCost: 0, requiredLevel: 1, prerequisites: [],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 10 }], abilitiesUnlocked: ['burstShot'], certifications: ['use_pistol', 'use_carbine'], isNovice: true },

    // Row 1: Specializations
    { id: 'mk_pistol1', name: 'Pistol Training I', description: 'Improved pistol handling', row: 1, col: 0, xpCost: 50, requiredLevel: 2, prerequisites: ['mk_novice'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 5 }, { mod: SkillModType.RangedSpeed, value: 3 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'mk_carbine1', name: 'Carbine Training I', description: 'Improved carbine handling', row: 1, col: 1, xpCost: 50, requiredLevel: 2, prerequisites: ['mk_novice'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 5 }, { mod: SkillModType.WeaponDamage, value: 3 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'mk_rifle1', name: 'Rifle Training I', description: 'Improved rifle handling', row: 1, col: 2, xpCost: 50, requiredLevel: 2, prerequisites: ['mk_novice'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 5 }, { mod: SkillModType.CriticalChance, value: 2 }], abilitiesUnlocked: ['headShot'], certifications: ['use_rifle'] },
    { id: 'mk_ranged_support', name: 'Ranged Support I', description: 'Defensive ranged tactics', row: 1, col: 3, xpCost: 50, requiredLevel: 2, prerequisites: ['mk_novice'],
      skillMods: [{ mod: SkillModType.RangedDefense, value: 5 }, { mod: SkillModType.Dodge, value: 3 }], abilitiesUnlocked: [], certifications: [] },

    // Row 2: Advanced
    { id: 'mk_pistol2', name: 'Pistol Training II', description: 'Advanced pistol techniques', row: 2, col: 0, xpCost: 100, requiredLevel: 5, prerequisites: ['mk_pistol1'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 8 }, { mod: SkillModType.RangedSpeed, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'mk_carbine2', name: 'Carbine Training II', description: 'Advanced carbine techniques', row: 2, col: 1, xpCost: 100, requiredLevel: 5, prerequisites: ['mk_carbine1'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 8 }, { mod: SkillModType.WeaponDamage, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'mk_rifle2', name: 'Rifle Training II', description: 'Advanced rifle techniques', row: 2, col: 2, xpCost: 100, requiredLevel: 5, prerequisites: ['mk_rifle1'],
      skillMods: [{ mod: SkillModType.CriticalChance, value: 5 }, { mod: SkillModType.CriticalDamage, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'mk_ranged_support2', name: 'Ranged Support II', description: 'Advanced defensive tactics', row: 2, col: 3, xpCost: 100, requiredLevel: 5, prerequisites: ['mk_ranged_support'],
      skillMods: [{ mod: SkillModType.RangedDefense, value: 8 }, { mod: SkillModType.Dodge, value: 5 }], abilitiesUnlocked: [], certifications: [] },

    // Row 3: Master
    { id: 'mk_master', name: 'Master Marksman', description: 'Mastery of all ranged weapons', row: 3, col: 1, xpCost: 200, requiredLevel: 10, prerequisites: ['mk_pistol2', 'mk_carbine2', 'mk_rifle2', 'mk_ranged_support2'],
      skillMods: [{ mod: SkillModType.RangedAccuracy, value: 15 }, { mod: SkillModType.CriticalChance, value: 5 }, { mod: SkillModType.WeaponDamage, value: 10 }],
      abilitiesUnlocked: ['powerAttack'], certifications: ['use_heavy_weapon'], isMaster: true },
  ],
};

export const BRAWLER_TREE: SkillTree = {
  professionId: 'brawler',
  professionName: 'Brawler',
  boxes: [
    { id: 'br_novice', name: 'Novice Brawler', description: 'Basic melee combat', row: 0, col: 1, xpCost: 0, requiredLevel: 1, prerequisites: [],
      skillMods: [{ mod: SkillModType.MeleeAccuracy, value: 10 }], abilitiesUnlocked: ['powerAttack'], certifications: ['use_melee'], isNovice: true },

    { id: 'br_1h1', name: 'One-Handed I', description: 'Sword and mace training', row: 1, col: 0, xpCost: 50, requiredLevel: 2, prerequisites: ['br_novice'],
      skillMods: [{ mod: SkillModType.MeleeAccuracy, value: 5 }, { mod: SkillModType.MeleeSpeed, value: 3 }], abilitiesUnlocked: [], certifications: ['use_sword'] },
    { id: 'br_2h1', name: 'Two-Handed I', description: 'Greatsword and polearm', row: 1, col: 1, xpCost: 50, requiredLevel: 2, prerequisites: ['br_novice'],
      skillMods: [{ mod: SkillModType.MeleeAccuracy, value: 5 }, { mod: SkillModType.WeaponDamage, value: 5 }], abilitiesUnlocked: [], certifications: ['use_2h_sword'] },
    { id: 'br_unarmed1', name: 'Unarmed I', description: 'Fist fighting', row: 1, col: 2, xpCost: 50, requiredLevel: 2, prerequisites: ['br_novice'],
      skillMods: [{ mod: SkillModType.MeleeSpeed, value: 5 }, { mod: SkillModType.Dodge, value: 3 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'br_defense1', name: 'Melee Defense I', description: 'Block and parry', row: 1, col: 3, xpCost: 50, requiredLevel: 2, prerequisites: ['br_novice'],
      skillMods: [{ mod: SkillModType.MeleeDefense, value: 5 }, { mod: SkillModType.Block, value: 5 }, { mod: SkillModType.Parry, value: 3 }], abilitiesUnlocked: [], certifications: ['use_shield'] },

    { id: 'br_1h2', name: 'One-Handed II', description: 'Advanced sword work', row: 2, col: 0, xpCost: 100, requiredLevel: 5, prerequisites: ['br_1h1'],
      skillMods: [{ mod: SkillModType.MeleeAccuracy, value: 8 }, { mod: SkillModType.MeleeSpeed, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'br_2h2', name: 'Two-Handed II', description: 'Heavy weapon mastery', row: 2, col: 1, xpCost: 100, requiredLevel: 5, prerequisites: ['br_2h1'],
      skillMods: [{ mod: SkillModType.WeaponDamage, value: 10 }, { mod: SkillModType.CriticalChance, value: 3 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'br_unarmed2', name: 'Unarmed II', description: 'Advanced fist fighting', row: 2, col: 2, xpCost: 100, requiredLevel: 5, prerequisites: ['br_unarmed1'],
      skillMods: [{ mod: SkillModType.MeleeSpeed, value: 8 }, { mod: SkillModType.Dodge, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'br_defense2', name: 'Melee Defense II', description: 'Fortress defense', row: 2, col: 3, xpCost: 100, requiredLevel: 5, prerequisites: ['br_defense1'],
      skillMods: [{ mod: SkillModType.MeleeDefense, value: 10 }, { mod: SkillModType.Block, value: 8 }, { mod: SkillModType.Parry, value: 5 }], abilitiesUnlocked: [], certifications: [] },

    { id: 'br_master', name: 'Master Brawler', description: 'Master of melee combat', row: 3, col: 1, xpCost: 200, requiredLevel: 10, prerequisites: ['br_1h2', 'br_2h2', 'br_unarmed2', 'br_defense2'],
      skillMods: [{ mod: SkillModType.MeleeAccuracy, value: 15 }, { mod: SkillModType.WeaponDamage, value: 10 }, { mod: SkillModType.CriticalChance, value: 5 }],
      abilitiesUnlocked: [], certifications: ['use_polearm'], isMaster: true },
  ],
};

export const MEDIC_TREE: SkillTree = {
  professionId: 'medic',
  professionName: 'Medic',
  boxes: [
    { id: 'md_novice', name: 'Novice Medic', description: 'Basic healing', row: 0, col: 1, xpCost: 0, requiredLevel: 1, prerequisites: [],
      skillMods: [{ mod: SkillModType.HealingPower, value: 10 }], abilitiesUnlocked: ['healDamage'], certifications: ['use_medkit'], isNovice: true },

    { id: 'md_heal1', name: 'Healing I', description: 'Improved healing', row: 1, col: 0, xpCost: 50, requiredLevel: 2, prerequisites: ['md_novice'],
      skillMods: [{ mod: SkillModType.HealingPower, value: 8 }, { mod: SkillModType.HealingRange, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_wounds1', name: 'Wound Treatment I', description: 'Heal wounds', row: 1, col: 1, xpCost: 50, requiredLevel: 2, prerequisites: ['md_novice'],
      skillMods: [{ mod: SkillModType.WoundHealing, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_pharma1', name: 'Pharmacology I', description: 'Better potions', row: 1, col: 2, xpCost: 50, requiredLevel: 2, prerequisites: ['md_novice'],
      skillMods: [{ mod: SkillModType.BuffStrength, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_organic1', name: 'Organic Chemistry I', description: 'Medicine crafting', row: 1, col: 3, xpCost: 50, requiredLevel: 2, prerequisites: ['md_novice'],
      skillMods: [{ mod: SkillModType.ExperimentSuccess, value: 3 }], abilitiesUnlocked: [], certifications: [] },

    { id: 'md_heal2', name: 'Healing II', description: 'Advanced healing', row: 2, col: 0, xpCost: 100, requiredLevel: 5, prerequisites: ['md_heal1'],
      skillMods: [{ mod: SkillModType.HealingPower, value: 12 }, { mod: SkillModType.HealingRange, value: 8 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_wounds2', name: 'Wound Treatment II', description: 'Expert wound healing', row: 2, col: 1, xpCost: 100, requiredLevel: 5, prerequisites: ['md_wounds1'],
      skillMods: [{ mod: SkillModType.WoundHealing, value: 10 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_pharma2', name: 'Pharmacology II', description: 'Expert potions', row: 2, col: 2, xpCost: 100, requiredLevel: 5, prerequisites: ['md_pharma1'],
      skillMods: [{ mod: SkillModType.BuffStrength, value: 10 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'md_organic2', name: 'Organic Chemistry II', description: 'Expert medicine crafting', row: 2, col: 3, xpCost: 100, requiredLevel: 5, prerequisites: ['md_organic1'],
      skillMods: [{ mod: SkillModType.ExperimentSuccess, value: 5 }, { mod: SkillModType.AssemblySuccess, value: 5 }], abilitiesUnlocked: [], certifications: [] },

    { id: 'md_master', name: 'Master Medic', description: 'Master healer', row: 3, col: 1, xpCost: 200, requiredLevel: 10, prerequisites: ['md_heal2', 'md_wounds2', 'md_pharma2', 'md_organic2'],
      skillMods: [{ mod: SkillModType.HealingPower, value: 20 }, { mod: SkillModType.WoundHealing, value: 10 }, { mod: SkillModType.BuffStrength, value: 10 }],
      abilitiesUnlocked: [], certifications: ['master_medic'], isMaster: true },
  ],
};

export const ARTISAN_TREE: SkillTree = {
  professionId: 'artisan',
  professionName: 'Artisan',
  boxes: [
    { id: 'ar_novice', name: 'Novice Artisan', description: 'Basic crafting', row: 0, col: 1, xpCost: 0, requiredLevel: 1, prerequisites: [],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 10 }], abilitiesUnlocked: [], certifications: ['use_workbench', 'use_campfire'], isNovice: true },

    { id: 'ar_engineering1', name: 'Engineering I', description: 'Mechanical crafting', row: 1, col: 0, xpCost: 50, requiredLevel: 2, prerequisites: ['ar_novice'],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 5 }], abilitiesUnlocked: [], certifications: ['use_engineering_station'] },
    { id: 'ar_domestic1', name: 'Domestic Arts I', description: 'Food and medicine', row: 1, col: 1, xpCost: 50, requiredLevel: 2, prerequisites: ['ar_novice'],
      skillMods: [{ mod: SkillModType.ExperimentSuccess, value: 5 }], abilitiesUnlocked: [], certifications: ['use_alchemy_table'] },
    { id: 'ar_business1', name: 'Business I', description: 'Resource management', row: 1, col: 2, xpCost: 50, requiredLevel: 2, prerequisites: ['ar_novice'],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 3 }, { mod: SkillModType.ExperimentSuccess, value: 3 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'ar_survey1', name: 'Surveying I', description: 'Resource surveying', row: 1, col: 3, xpCost: 50, requiredLevel: 2, prerequisites: ['ar_novice'],
      skillMods: [{ mod: SkillModType.Terrain, value: 5 }], abilitiesUnlocked: [], certifications: ['use_survey_tool'] },

    { id: 'ar_engineering2', name: 'Engineering II', description: 'Advanced mechanical crafting', row: 2, col: 0, xpCost: 100, requiredLevel: 5, prerequisites: ['ar_engineering1'],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 8 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'ar_domestic2', name: 'Domestic Arts II', description: 'Advanced cooking/medicine', row: 2, col: 1, xpCost: 100, requiredLevel: 5, prerequisites: ['ar_domestic1'],
      skillMods: [{ mod: SkillModType.ExperimentSuccess, value: 8 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'ar_business2', name: 'Business II', description: 'Expert trader', row: 2, col: 2, xpCost: 100, requiredLevel: 5, prerequisites: ['ar_business1'],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 5 }, { mod: SkillModType.ExperimentSuccess, value: 5 }], abilitiesUnlocked: [], certifications: [] },
    { id: 'ar_survey2', name: 'Surveying II', description: 'Expert surveying', row: 2, col: 3, xpCost: 100, requiredLevel: 5, prerequisites: ['ar_survey1'],
      skillMods: [{ mod: SkillModType.Terrain, value: 10 }], abilitiesUnlocked: [], certifications: [] },

    { id: 'ar_master', name: 'Master Artisan', description: 'Master of all crafts', row: 3, col: 1, xpCost: 200, requiredLevel: 10, prerequisites: ['ar_engineering2', 'ar_domestic2', 'ar_business2', 'ar_survey2'],
      skillMods: [{ mod: SkillModType.AssemblySuccess, value: 15 }, { mod: SkillModType.ExperimentSuccess, value: 15 }],
      abilitiesUnlocked: [], certifications: ['use_anvil', 'use_loom', 'use_enchanting_circle', 'master_artisan'], isMaster: true },
  ],
};

// All skill trees
export const ALL_SKILL_TREES: SkillTree[] = [
  MARKSMAN_TREE,
  BRAWLER_TREE,
  MEDIC_TREE,
  ARTISAN_TREE,
];

/** Get a skill tree by profession ID */
export function getSkillTree(professionId: string): SkillTree | undefined {
  return ALL_SKILL_TREES.find(t => t.professionId === professionId);
}

/** Create default states for all skill trees */
export function createDefaultSkillTreeStates(): SkillTreeState[] {
  return ALL_SKILL_TREES.map(t => createSkillTreeState(t.professionId));
}
