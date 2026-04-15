/**
 * Enemy Content Registry — all enemy types with loot tables.
 * Ported from Motion content/enemies.ts, adapted to our models + EnemyTypes.
 */

export interface LootDrop {
  itemId: string;
  chance: number; // 0..1
  min: number;
  max: number;
}

export interface EnemyLoot {
  goldMin: number;
  goldMax: number;
  xp: number;
  drops: LootDrop[];
}

export interface EnemyDef {
  id: string;
  name: string;
  modelUrl: string;
  scale: number;
  icon: string;
  description: string;
  tags: string[];
  level: number;
  combat: {
    health: number;
    damage: number;
    defense: number;
    speed: number;
    attackRange: number;
    attackCooldown: number;
    detectionRange: number;
  };
  loot: EnemyLoot;
}

export interface BossDef extends EnemyDef {
  phases: { hpPercent: number; name: string; speedMult: number; damageMult: number }[];
  enrageTimerSec: number;
}

export const ENEMIES: EnemyDef[] = [
  {
    id: 'enemy/mutant', name: 'Mutant Berserker',
    modelUrl: '/models/enemies/mutant.glb', scale: 2.2,
    icon: '🧟', description: 'Shambling mutant that charges into melee range.',
    tags: ['colony', 'melee', 'undead'], level: 3,
    combat: { health: 600, damage: 15, defense: 2, speed: 5, attackRange: 1.9, attackCooldown: 4.0, detectionRange: 25 },
    loot: { goldMin: 5, goldMax: 20, xp: 30, drops: [
      { itemId: 'material/bone_fragment', chance: 0.4, min: 1, max: 3 },
      { itemId: 'material/tattered_cloth', chance: 0.2, min: 1, max: 1 },
    ] },
  },
  {
    id: 'enemy/alien', name: 'Xenomorph Stalker',
    modelUrl: '/models/enemies/alien.glb', scale: 2.0,
    icon: '👽', description: 'Fast predator with high damage and stealth approach.',
    tags: ['wasteland', 'melee', 'elite'], level: 6,
    combat: { health: 800, damage: 25, defense: 5, speed: 4, attackRange: 2.0, attackCooldown: 3.0, detectionRange: 30 },
    loot: { goldMin: 15, goldMax: 40, xp: 60, drops: [
      { itemId: 'material/xeno_chitin', chance: 0.3, min: 1, max: 2 },
      { itemId: 'item/acid_vial', chance: 0.08, min: 1, max: 1 },
    ] },
  },
  {
    id: 'enemy/spikeball', name: 'Spikeball Drone',
    modelUrl: '/models/enemies/spikeball.glb', scale: 1.2,
    icon: '💣', description: 'Small rolling drone. Appears in swarms.',
    tags: ['colony', 'wasteland', 'ranged'], level: 2,
    combat: { health: 400, damage: 10, defense: 0, speed: 3, attackRange: 1.5, attackCooldown: 2.5, detectionRange: 20 },
    loot: { goldMin: 3, goldMax: 10, xp: 15, drops: [
      { itemId: 'material/scrap_metal', chance: 0.5, min: 1, max: 3 },
    ] },
  },
  {
    id: 'enemy/zombie_horde', name: 'Zombie Horde',
    modelUrl: '/models/enemies/mutant.glb', scale: 1.8,
    icon: '💀', description: 'Weak but appears in groups of 3-5.',
    tags: ['colony', 'melee', 'swarm'], level: 1,
    combat: { health: 200, damage: 8, defense: 0, speed: 2.5, attackRange: 1.9, attackCooldown: 3.5, detectionRange: 20 },
    loot: { goldMin: 2, goldMax: 8, xp: 10, drops: [
      { itemId: 'material/bone_fragment', chance: 0.3, min: 1, max: 2 },
    ] },
  },
  {
    id: 'enemy/dungeon_knight', name: 'Dungeon Knight',
    modelUrl: '/models/enemies/alien.glb', scale: 2.5,
    icon: '⚔️', description: 'Armored knight patrolling dungeon corridors.',
    tags: ['dungeon', 'melee', 'armored'], level: 8,
    combat: { health: 1200, damage: 35, defense: 15, speed: 1.2, attackRange: 2.0, attackCooldown: 2.0, detectionRange: 18 },
    loot: { goldMin: 20, goldMax: 50, xp: 100, drops: [
      { itemId: 'material/dark_steel', chance: 0.3, min: 1, max: 2 },
      { itemId: 'item/knight_sword', chance: 0.04, min: 1, max: 1 },
    ] },
  },
];

export const BOSSES: BossDef[] = [
  {
    id: 'boss/elite_warden', name: 'Elite Warden',
    modelUrl: '/models/enemies/alien.glb', scale: 3.0,
    icon: '👑', description: 'Massive warden boss. Souls-like multi-phase fight.',
    tags: ['dungeon', 'boss'], level: 15,
    combat: { health: 2000, damage: 40, defense: 25, speed: 3.5, attackRange: 3.0, attackCooldown: 1.5, detectionRange: 30 },
    loot: { goldMin: 200, goldMax: 500, xp: 1000, drops: [
      { itemId: 'item/warden_blade', chance: 0.15, min: 1, max: 1 },
      { itemId: 'material/dark_steel', chance: 1.0, min: 3, max: 8 },
    ] },
    phases: [
      { hpPercent: 100, name: 'Phase 1 — Measured Strikes', speedMult: 1.0, damageMult: 1.0 },
      { hpPercent: 60, name: 'Phase 2 — Fury', speedMult: 1.3, damageMult: 1.5 },
      { hpPercent: 25, name: 'Phase 3 — Frenzy', speedMult: 1.8, damageMult: 2.0 },
    ],
    enrageTimerSec: 180,
  },
];

export function getEnemyDef(id: string): EnemyDef | undefined {
  return ENEMIES.find(e => e.id === id);
}

export function getBossDef(id: string): BossDef | undefined {
  return BOSSES.find(b => b.id === id);
}

export function getEnemiesForScene(sceneTag: string): EnemyDef[] {
  return ENEMIES.filter(e => e.tags.includes(sceneTag));
}

/** Roll loot from an enemy loot table */
export function rollLoot(loot: EnemyLoot): { gold: number; xp: number; items: { itemId: string; count: number }[] } {
  const gold = loot.goldMin + Math.floor(Math.random() * (loot.goldMax - loot.goldMin + 1));
  const items: { itemId: string; count: number }[] = [];
  for (const drop of loot.drops) {
    if (Math.random() < drop.chance) {
      items.push({ itemId: drop.itemId, count: drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1)) });
    }
  }
  return { gold, xp: loot.xp, items };
}
