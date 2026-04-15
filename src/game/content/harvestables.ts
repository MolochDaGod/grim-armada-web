/**
 * Harvestable Content Registry — resource nodes with yields and tool requirements.
 * Ported from Motion content/harvestables.ts.
 */

export type HarvestType = 'tree' | 'ore' | 'herb' | 'fish' | 'salvage';
export type ToolType = 'hatchet' | 'pickaxe' | 'fishingpole' | 'none';

export interface HarvestYield {
  itemId: string;
  chance: number; // 0..1
  min: number;
  max: number;
}

export interface HarvestableDef {
  id: string;
  name: string;
  harvestType: HarvestType;
  toolRequired: ToolType;
  levelRequired: number;
  icon: string;
  description: string;
  tags: string[];
  yields: HarvestYield[];
  respawnTime: number; // seconds
  hitPoints: number;   // hits to fully harvest
}

export const HARVESTABLES: HarvestableDef[] = [
  {
    id: 'harvestable/oak_tree', name: 'Oak Tree',
    harvestType: 'tree', toolRequired: 'hatchet',
    levelRequired: 1, icon: '🌳',
    description: 'A sturdy oak. Yields lumber and occasionally sap.',
    tags: ['colony', 'tree', 'tier1'],
    yields: [
      { itemId: 'material/lumber', chance: 1.0, min: 2, max: 5 },
      { itemId: 'material/sap', chance: 0.2, min: 1, max: 1 },
    ],
    respawnTime: 60, hitPoints: 5,
  },
  {
    id: 'harvestable/iron_vein', name: 'Iron Vein',
    harvestType: 'ore', toolRequired: 'pickaxe',
    levelRequired: 1, icon: '⛏️',
    description: 'An exposed iron deposit. Mine for ore.',
    tags: ['colony', 'ore', 'tier1'],
    yields: [
      { itemId: 'material/iron_ore', chance: 1.0, min: 1, max: 3 },
      { itemId: 'material/stone', chance: 0.5, min: 1, max: 2 },
    ],
    respawnTime: 90, hitPoints: 8,
  },
  {
    id: 'harvestable/herb_patch', name: 'Healing Herb',
    harvestType: 'herb', toolRequired: 'none',
    levelRequired: 1, icon: '🌿',
    description: 'Wild herbs with medicinal properties.',
    tags: ['colony', 'wasteland', 'herb', 'tier1'],
    yields: [
      { itemId: 'material/herb', chance: 1.0, min: 1, max: 3 },
      { itemId: 'material/rare_herb', chance: 0.1, min: 1, max: 1 },
    ],
    respawnTime: 45, hitPoints: 1,
  },
  {
    id: 'harvestable/fish_spot', name: 'Fishing Spot',
    harvestType: 'fish', toolRequired: 'fishingpole',
    levelRequired: 1, icon: '🐟',
    description: 'Calm waters teeming with fish. Equip a fishing pole.',
    tags: ['colony', 'fish', 'tier1'],
    yields: [
      { itemId: 'material/raw_fish', chance: 1.0, min: 1, max: 2 },
      { itemId: 'material/pearl', chance: 0.05, min: 1, max: 1 },
    ],
    respawnTime: 30, hitPoints: 1,
  },
  {
    id: 'harvestable/dark_ore', name: 'Dark Steel Vein',
    harvestType: 'ore', toolRequired: 'pickaxe',
    levelRequired: 10, icon: '💎',
    description: 'Rare dark steel deposit found deep in dungeons.',
    tags: ['dungeon', 'ore', 'tier3'],
    yields: [
      { itemId: 'material/dark_steel', chance: 1.0, min: 1, max: 2 },
      { itemId: 'material/gem_shard', chance: 0.15, min: 1, max: 1 },
    ],
    respawnTime: 300, hitPoints: 15,
  },
  {
    id: 'harvestable/salvage_pile', name: 'Scrap Salvage',
    harvestType: 'salvage', toolRequired: 'none',
    levelRequired: 1, icon: '🔩',
    description: 'Pile of scrap metal and machine parts.',
    tags: ['wasteland', 'forge', 'salvage', 'tier2'],
    yields: [
      { itemId: 'material/scrap_metal', chance: 1.0, min: 2, max: 5 },
      { itemId: 'material/circuit_board', chance: 0.15, min: 1, max: 1 },
    ],
    respawnTime: 120, hitPoints: 3,
  },
];

export function getHarvestablesByScene(sceneTag: string): HarvestableDef[] {
  return HARVESTABLES.filter(h => h.tags.includes(sceneTag));
}

/** Roll harvest yields */
export function rollHarvest(def: HarvestableDef): { itemId: string; count: number }[] {
  const items: { itemId: string; count: number }[] = [];
  for (const y of def.yields) {
    if (Math.random() < y.chance) {
      items.push({ itemId: y.itemId, count: y.min + Math.floor(Math.random() * (y.max - y.min + 1)) });
    }
  }
  return items;
}
