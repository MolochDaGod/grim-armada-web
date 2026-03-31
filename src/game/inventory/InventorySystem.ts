// ===== Inventory & Equipment System =====
// Grid-based inventory (8x6 = 48 slots), equipment paper doll,
// quality-tracked items, resource stacking, hotbar integration.

import type { ResourceQualityStats } from '../crafting/ResourceQuality';

// ===== Item Types =====

export type ItemCategory = 'weapon' | 'armor' | 'consumable' | 'resource' | 'tool' | 'relic' | 'quest';
export type Rarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#9CA3AF',
  uncommon: '#10B981',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
};

export const RARITY_ORDER: Record<Rarity, number> = {
  common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 4,
};

export type EquipSlot =
  | 'Head' | 'Shoulder' | 'Chest' | 'Hands' | 'Feet'
  | 'Ring' | 'Necklace' | 'Relic' | 'Cape'
  | 'MainHand' | 'OffHand';

export const EQUIP_SLOTS: EquipSlot[] = [
  'Head', 'Shoulder', 'Chest', 'Hands', 'Feet',
  'Ring', 'Necklace', 'Relic', 'Cape',
  'MainHand', 'OffHand',
];

// ===== Item Definition (static template) =====

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  category: ItemCategory;
  rarity: Rarity;
  tier: number;
  icon: string; // emoji or icon path
  /** Max stack size. 1 = non-stackable (equipment). Resources default 99. */
  maxStack: number;
  /** If equippable, which slot */
  equipSlot?: EquipSlot;
  /** Base stats for equipment (before quality modifiers) */
  baseStats?: Record<string, number>;
  /** If this is a resource, link to resource type */
  resourceTypeId?: string;
  /** Sell price to vendor */
  vendorPrice?: number;
  /** Profession required to use */
  requiredProfession?: string;
  /** Level required to use */
  requiredLevel?: number;
}

// ===== Item Instance (runtime, in inventory) =====

export interface ItemInstance {
  /** Unique instance id */
  instanceId: string;
  /** Reference to static def */
  defId: string;
  /** Current stack quantity */
  quantity: number;
  /** Resource quality (if this is a harvested resource) */
  quality?: ResourceQualityStats;
  /** Spawn ID (for resource stacking — same spawn + type can stack) */
  spawnId?: string;
  /** Computed stats for crafted equipment (quality-modified) */
  computedStats?: Record<string, number>;
  /** Current durability (if applicable) */
  durability?: number;
  /** Max durability */
  maxDurability?: number;
  /** Custom name (from crafter naming) */
  customName?: string;
  /** Who crafted this */
  craftedBy?: string;
  /** Experimentation bonus applied during crafting */
  experimentBonus?: number;
}

// ===== Inventory Grid =====

export const INVENTORY_COLS = 8;
export const INVENTORY_ROWS = 6;
export const INVENTORY_SIZE = INVENTORY_COLS * INVENTORY_ROWS; // 48

export interface InventorySlot {
  item: ItemInstance | null;
}

// ===== Equipment Loadout =====

export type EquipmentLoadout = Partial<Record<EquipSlot, ItemInstance>>;

// ===== Hotbar =====

export const HOTBAR_SIZE = 8;

export interface HotbarSlot {
  type: 'ability' | 'item' | 'empty';
  /** Ability ID or inventory instanceId */
  referenceId: string | null;
}

// ===== Inventory State =====

export interface InventoryState {
  slots: InventorySlot[];
  equipment: EquipmentLoadout;
  hotbar: HotbarSlot[];
  gold: number;
}

let instanceCounter = 0;

export function generateInstanceId(): string {
  return `item_${Date.now()}_${++instanceCounter}`;
}

// ===== Inventory Operations =====

export function createEmptyInventory(): InventoryState {
  const slots: InventorySlot[] = Array.from({ length: INVENTORY_SIZE }, () => ({ item: null }));
  const hotbar: HotbarSlot[] = [
    { type: 'ability', referenceId: 'burstShot' },
    { type: 'ability', referenceId: 'headShot' },
    { type: 'ability', referenceId: 'powerAttack' },
    { type: 'ability', referenceId: 'healDamage' },
    { type: 'empty', referenceId: null },
    { type: 'item', referenceId: null }, // consumable slot 6
    { type: 'item', referenceId: null }, // consumable slot 7
    { type: 'item', referenceId: null }, // consumable slot 8
  ];

  return { slots, equipment: {}, hotbar, gold: 0 };
}

/** Find first empty slot index, or -1 */
export function findEmptySlot(inventory: InventoryState): number {
  return inventory.slots.findIndex(s => s.item === null);
}

/** Find a stackable slot for a given item def + spawnId. Resources with same def + spawn stack. */
export function findStackableSlot(
  inventory: InventoryState,
  defId: string,
  spawnId?: string,
  maxStack: number = 99,
): number {
  return inventory.slots.findIndex(s => {
    if (!s.item) return false;
    if (s.item.defId !== defId) return false;
    if (s.item.quantity >= maxStack) return false;
    // Resources only stack if same spawn (same quality)
    if (spawnId && s.item.spawnId !== spawnId) return false;
    return true;
  });
}

/**
 * Add an item to inventory. Returns true if successful.
 * Handles stacking for resources.
 */
export function addItemToInventory(
  inventory: InventoryState,
  defId: string,
  quantity: number,
  itemDef: ItemDef,
  quality?: ResourceQualityStats,
  spawnId?: string,
  extraProps?: Partial<ItemInstance>,
): boolean {
  let remaining = quantity;

  // Try to stack first
  while (remaining > 0) {
    const stackIdx = findStackableSlot(inventory, defId, spawnId, itemDef.maxStack);
    if (stackIdx === -1) break;

    const slot = inventory.slots[stackIdx];
    const canAdd = Math.min(remaining, itemDef.maxStack - slot.item!.quantity);
    slot.item!.quantity += canAdd;
    remaining -= canAdd;
  }

  // Fill empty slots with remaining
  while (remaining > 0) {
    const emptyIdx = findEmptySlot(inventory);
    if (emptyIdx === -1) return false; // Inventory full

    const addAmount = Math.min(remaining, itemDef.maxStack);
    inventory.slots[emptyIdx].item = {
      instanceId: generateInstanceId(),
      defId,
      quantity: addAmount,
      quality,
      spawnId,
      ...extraProps,
    };
    remaining -= addAmount;
  }

  return true;
}

/** Remove quantity of an item from inventory. Returns actual amount removed. */
export function removeItemFromInventory(
  inventory: InventoryState,
  defId: string,
  quantity: number,
  spawnId?: string,
): number {
  let remaining = quantity;

  for (const slot of inventory.slots) {
    if (!slot.item || slot.item.defId !== defId) continue;
    if (spawnId && slot.item.spawnId !== spawnId) continue;

    const remove = Math.min(remaining, slot.item.quantity);
    slot.item.quantity -= remove;
    remaining -= remove;

    if (slot.item.quantity <= 0) slot.item = null;
    if (remaining <= 0) break;
  }

  return quantity - remaining;
}

/** Count total quantity of an item in inventory */
export function countItem(inventory: InventoryState, defId: string, spawnId?: string): number {
  let total = 0;
  for (const slot of inventory.slots) {
    if (!slot.item || slot.item.defId !== defId) continue;
    if (spawnId && slot.item.spawnId !== spawnId) continue;
    total += slot.item.quantity;
  }
  return total;
}

/** Move item from one slot to another (for drag-drop) */
export function moveItem(
  inventory: InventoryState,
  fromIdx: number,
  toIdx: number,
): boolean {
  if (fromIdx < 0 || fromIdx >= INVENTORY_SIZE) return false;
  if (toIdx < 0 || toIdx >= INVENTORY_SIZE) return false;
  if (fromIdx === toIdx) return false;

  const from = inventory.slots[fromIdx];
  const to = inventory.slots[toIdx];

  if (!from.item) return false;

  // If target is empty, just move
  if (!to.item) {
    to.item = from.item;
    from.item = null;
    return true;
  }

  // If same item type + spawn, try to stack
  if (to.item.defId === from.item.defId && to.item.spawnId === from.item.spawnId) {
    // would need maxStack from def — for now assume 99 for resources
    const maxStack = 99;
    const canAdd = Math.min(from.item.quantity, maxStack - to.item.quantity);
    if (canAdd > 0) {
      to.item.quantity += canAdd;
      from.item.quantity -= canAdd;
      if (from.item.quantity <= 0) from.item = null;
      return true;
    }
  }

  // Otherwise swap
  const temp = from.item;
  from.item = to.item;
  to.item = temp;
  return true;
}

/** Equip an item from inventory */
export function equipItem(
  inventory: InventoryState,
  slotIdx: number,
  itemDefs: Map<string, ItemDef>,
): boolean {
  const slot = inventory.slots[slotIdx];
  if (!slot.item) return false;

  const def = itemDefs.get(slot.item.defId);
  if (!def || !def.equipSlot) return false;

  const equipSlot = def.equipSlot;

  // If something already equipped, swap it to inventory
  const currentEquipped = inventory.equipment[equipSlot];
  inventory.equipment[equipSlot] = slot.item;

  if (currentEquipped) {
    slot.item = currentEquipped;
  } else {
    slot.item = null;
  }

  return true;
}

/** Unequip an item to inventory */
export function unequipItem(
  inventory: InventoryState,
  equipSlot: EquipSlot,
): boolean {
  const equipped = inventory.equipment[equipSlot];
  if (!equipped) return false;

  const emptyIdx = findEmptySlot(inventory);
  if (emptyIdx === -1) return false; // Inventory full

  inventory.slots[emptyIdx].item = equipped;
  delete inventory.equipment[equipSlot];
  return true;
}

/** Get all resources in inventory (for crafting UI) */
export function getResourcesInInventory(inventory: InventoryState): ItemInstance[] {
  return inventory.slots
    .filter(s => s.item && s.item.quality)
    .map(s => s.item!);
}

/** Sort inventory: by category, then rarity, then name */
export function sortInventory(inventory: InventoryState, itemDefs: Map<string, ItemDef>): void {
  const items = inventory.slots
    .map(s => s.item)
    .filter((item): item is ItemInstance => item !== null);

  items.sort((a, b) => {
    const defA = itemDefs.get(a.defId);
    const defB = itemDefs.get(b.defId);
    if (!defA || !defB) return 0;

    // Category
    const catOrder: Record<ItemCategory, number> = { weapon: 0, armor: 1, tool: 2, consumable: 3, resource: 4, relic: 5, quest: 6 };
    if (catOrder[defA.category] !== catOrder[defB.category]) return catOrder[defA.category] - catOrder[defB.category];

    // Rarity (desc)
    if (RARITY_ORDER[defA.rarity] !== RARITY_ORDER[defB.rarity]) return RARITY_ORDER[defB.rarity] - RARITY_ORDER[defA.rarity];

    // Name
    return defA.name.localeCompare(defB.name);
  });

  // Clear and refill
  for (let i = 0; i < INVENTORY_SIZE; i++) {
    inventory.slots[i].item = items[i] ?? null;
  }
}

// ===== Starter Item Definitions =====

export const STARTER_ITEM_DEFS: ItemDef[] = [
  // Tools
  { id: 'tool_pickaxe', name: 'Pickaxe', description: 'Basic mining tool', category: 'tool', rarity: 'common', tier: 1, icon: '⛏️', maxStack: 1, baseStats: { miningSpeed: 1 } },
  { id: 'tool_axe', name: 'Logging Axe', description: 'Basic logging tool', category: 'tool', rarity: 'common', tier: 1, icon: '🪓', maxStack: 1, baseStats: { loggingSpeed: 1 } },
  { id: 'tool_sickle', name: 'Herb Sickle', description: 'Basic herbalism tool', category: 'tool', rarity: 'common', tier: 1, icon: '🌿', maxStack: 1, baseStats: { herbalismSpeed: 1 } },
  { id: 'tool_rod', name: 'Fishing Rod', description: 'Basic fishing tool', category: 'tool', rarity: 'common', tier: 1, icon: '🎣', maxStack: 1, baseStats: { fishingSpeed: 1 } },
  { id: 'tool_knife', name: 'Skinning Knife', description: 'Basic skinning tool', category: 'tool', rarity: 'common', tier: 1, icon: '🔪', maxStack: 1, baseStats: { skinningSpeed: 1 } },
  { id: 'tool_survey', name: 'Survey Device', description: 'Scan for resource spawns', category: 'tool', rarity: 'common', tier: 1, icon: '📡', maxStack: 1 },

  // Consumables
  { id: 'food_charred_meat', name: 'Charred Meat', description: 'Restores 50 Health', category: 'consumable', rarity: 'common', tier: 0, icon: '🍖', maxStack: 20, baseStats: { healAmount: 50 } },
  { id: 'potion_minor_heal', name: 'Minor Health Potion', description: 'Restores 150 Health', category: 'consumable', rarity: 'uncommon', tier: 1, icon: '🧪', maxStack: 10, baseStats: { healAmount: 150 } },
  { id: 'potion_minor_action', name: 'Minor Action Potion', description: 'Restores 100 Action', category: 'consumable', rarity: 'uncommon', tier: 1, icon: '💧', maxStack: 10, baseStats: { actionAmount: 100 } },

  // Basic resources (for item defs — actual instances get quality from spawns)
  { id: 'res_copper_ore', name: 'Copper Ore', description: 'Raw copper ore', category: 'resource', rarity: 'common', tier: 1, icon: '🪨', maxStack: 99, resourceTypeId: 'copper_ore', vendorPrice: 2 },
  { id: 'res_iron_ore', name: 'Iron Ore', description: 'Raw iron ore', category: 'resource', rarity: 'common', tier: 2, icon: '🪨', maxStack: 99, resourceTypeId: 'iron_ore', vendorPrice: 5 },
  { id: 'res_pine_log', name: 'Pine Log', description: 'Pine wood log', category: 'resource', rarity: 'common', tier: 1, icon: '🪵', maxStack: 99, resourceTypeId: 'pine_log', vendorPrice: 2 },
  { id: 'res_oak_log', name: 'Oak Log', description: 'Oak wood log', category: 'resource', rarity: 'common', tier: 2, icon: '🪵', maxStack: 99, resourceTypeId: 'oak_log', vendorPrice: 5 },
  { id: 'res_wild_herb', name: 'Wild Herbs', description: 'Common herbs', category: 'resource', rarity: 'common', tier: 1, icon: '🌿', maxStack: 99, resourceTypeId: 'wild_herb', vendorPrice: 1 },
  { id: 'res_animal_hide', name: 'Animal Hide', description: 'Raw animal hide', category: 'resource', rarity: 'common', tier: 1, icon: '🐾', maxStack: 99, resourceTypeId: 'animal_hide', vendorPrice: 2 },
  { id: 'res_common_fish', name: 'Common Fish', description: 'Freshwater fish', category: 'resource', rarity: 'common', tier: 1, icon: '🐟', maxStack: 99, resourceTypeId: 'common_fish', vendorPrice: 2 },
];

/** Build a lookup map from item defs array */
export function buildItemDefMap(defs: ItemDef[]): Map<string, ItemDef> {
  return new Map(defs.map(d => [d.id, d]));
}
