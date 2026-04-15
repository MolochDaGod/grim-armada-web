/**
 * NPC & Ally Content Registry — NPC shops, dialogue, and companion definitions.
 * Ported from Motion content/npcs.ts.
 */

export type NPCRole = 'blacksmith' | 'vendor' | 'trainer' | 'questgiver';

export interface NPCDef {
  id: string;
  name: string;
  role: NPCRole;
  icon: string;
  description: string;
  tags: string[];
  faction: string;
  dialogue: { greeting: string; busy?: string };
  shopItems?: string[];
}

export interface AllyDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  tags: string[];
  combat: {
    health: number; maxHealth: number;
    damage: number; defense: number;
    speed: number;
    attackRange: number; attackCooldown: number;
    detectionRange: number;
  };
  followRange: number;
  engageRange: number;
  abilities: string[];
}

export const NPCS: NPCDef[] = [
  {
    id: 'npc/blacksmith', name: 'Grudge Blacksmith',
    role: 'blacksmith', icon: '🔨',
    description: 'Forges and repairs weapons and armor.',
    tags: ['colony', 'forge', 'crafting'],
    faction: 'grudge',
    dialogue: { greeting: "Need something forged, pirate?", busy: "I'm working on an order. Come back later." },
    shopItems: ['item/metal_sword', 'item/iron_shield', 'item/steel_maul'],
  },
  {
    id: 'npc/vendor', name: 'Colony Trader',
    role: 'vendor', icon: '🏪',
    description: 'Buys and sells goods at the colony hub.',
    tags: ['colony', 'vendor'],
    faction: 'neutral',
    dialogue: { greeting: "Got coin? I've got wares." },
    shopItems: ['item/health_potion', 'item/mana_potion', 'item/fishing_pole', 'item/hatchet', 'item/pickaxe'],
  },
  {
    id: 'npc/combat_trainer', name: 'Blade Master Kael',
    role: 'trainer', icon: '⚔️',
    description: 'Teaches advanced combat techniques and weapon skills.',
    tags: ['colony', 'training'],
    faction: 'grudge',
    dialogue: { greeting: 'Ready to learn the blade, recruit?' },
  },
  {
    id: 'npc/quest_warden', name: 'Warden Voss',
    role: 'questgiver', icon: '📜',
    description: 'Offers bounty missions in the wasteland.',
    tags: ['wasteland', 'quest'],
    faction: 'grudge',
    dialogue: { greeting: "The wastes are crawling. I've got a job for you." },
  },
];

export const ALLIES: AllyDef[] = [
  {
    id: 'ally/scout', name: 'Scout',
    icon: '🔵',
    description: 'Fast companion that spots enemies and flanks in combat.',
    tags: ['colony', 'combat'],
    combat: {
      health: 60, maxHealth: 60,
      damage: 8, defense: 2,
      speed: 5.0,
      attackRange: 2.0, attackCooldown: 1.5,
      detectionRange: 20,
    },
    followRange: 4, engageRange: 10,
    abilities: ['quick_strike', 'dodge'],
  },
  {
    id: 'ally/guard', name: 'Guard',
    icon: '🟠',
    description: 'Tanky companion that draws aggro and shields the player.',
    tags: ['colony', 'combat'],
    combat: {
      health: 120, maxHealth: 120,
      damage: 12, defense: 10,
      speed: 3.0,
      attackRange: 2.0, attackCooldown: 2.0,
      detectionRange: 15,
    },
    followRange: 3, engageRange: 8,
    abilities: ['taunt', 'shield_bash'],
  },
];

export function getNPCsForScene(sceneTag: string): NPCDef[] {
  return NPCS.filter(n => n.tags.includes(sceneTag));
}
