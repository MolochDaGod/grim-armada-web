// ===== Survival Game Store =====
// Integrates all new systems: inventory, harvesting, professions, XP, crafting.
// Sits alongside the existing combat store.ts — will be merged when ready.

import { create } from 'zustand';
import {
  createEmptyInventory, addItemToInventory, removeItemFromInventory,
  equipItem, unequipItem, sortInventory, buildItemDefMap, STARTER_ITEM_DEFS,
  type InventoryState, type ItemDef, type EquipSlot,
} from './inventory/InventorySystem';
import {
  createDefaultProfessionStates, addProfessionXP, getProfessionState,
  resolveGatheringProfession, type ProfessionState, type ProfessionName,
} from './professions/ProfessionManager';
import {
  createDefaultProgression, addHeroXP, spendAttributePoint,
  type HeroProgression, type HeroAttributes, calculateCombatXP,
} from './progression/XPSystem';
import {
  createDefaultSkillTreeStates, type SkillTreeState,
} from './progression/SkillTreeSystem';
import {
  type ResourceSpawn,
} from './crafting/ResourceQuality';
import {
  generateInitialSpawns, generateWorldNodes, updateWorldNodes,
  findNearestNode, canHarvest, startHarvest, updateHarvestProgress,
  completeHarvest, type WorldNode, type HarvestProgress, type HarvestResult,
  getProfessionForResource,
} from './harvesting/HarvestingSystem';
import { type CraftingSession } from './crafting/CraftingSystem';

// ===== Game Mode =====

export type GameMode = 'combat' | 'harvest';

// ===== UI Panel State =====

export type ActivePanel = 'none' | 'inventory' | 'professions' | 'crafting' | 'skillTree';

// ===== Store Shape =====

interface SurvivalStore {
  // Inventory
  inventory: InventoryState;
  itemDefs: Map<string, ItemDef>;

  // Professions
  professions: ProfessionState[];
  heroProgression: HeroProgression;
  skillTreeStates: SkillTreeState[];

  // Harvesting
  resourceSpawns: ResourceSpawn[];
  worldNodes: WorldNode[];
  harvestProgress: HarvestProgress | null;
  lastHarvestResult: HarvestResult | null;
  lastHarvestTime: number;
  nearbyNode: WorldNode | null;

  // Crafting
  craftingSession: CraftingSession | null;

  // Game Mode
  gameMode: GameMode;
  activePanel: ActivePanel;

  // Actions
  toggleGameMode: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  togglePanel: (panel: ActivePanel) => void;

  // Inventory actions
  addItem: (defId: string, quantity: number, quality?: any, spawnId?: string) => boolean;
  removeItem: (defId: string, quantity: number) => number;
  equipFromSlot: (slotIdx: number) => boolean;
  unequipFromSlot: (slot: EquipSlot) => boolean;
  sortBag: () => void;

  // Harvesting actions
  startHarvestAction: () => void;
  cancelHarvest: () => void;

  // XP / Profession actions
  addCombatXP: (enemyLevel: number) => void;
  spendAttribute: (attr: keyof HeroAttributes) => boolean;

  // Game tick
  survivalTick: (dt: number, playerPosition: [number, number, number]) => void;

  // Init
  initSurvivalSystems: () => void;
}

export const useSurvivalStore = create<SurvivalStore>((set, get) => ({
  // Initial state
  inventory: createEmptyInventory(),
  itemDefs: buildItemDefMap(STARTER_ITEM_DEFS),
  professions: createDefaultProfessionStates(),
  heroProgression: createDefaultProgression(),
  skillTreeStates: createDefaultSkillTreeStates(),
  resourceSpawns: [],
  worldNodes: [],
  harvestProgress: null,
  lastHarvestResult: null,
  lastHarvestTime: 0,
  nearbyNode: null,
  craftingSession: null,
  gameMode: 'combat',
  activePanel: 'none',

  // === Mode / Panel ===

  toggleGameMode: () => set(s => ({ gameMode: s.gameMode === 'combat' ? 'harvest' : 'combat' })),

  setActivePanel: (panel) => set({ activePanel: panel }),

  togglePanel: (panel) => set(s => ({
    activePanel: s.activePanel === panel ? 'none' : panel,
  })),

  // === Inventory ===

  addItem: (defId, quantity, quality, spawnId) => {
    const s = get();
    const def = s.itemDefs.get(defId);
    if (!def) return false;
    const result = addItemToInventory(s.inventory, defId, quantity, def, quality, spawnId);
    set({}); // trigger re-render
    return result;
  },

  removeItem: (defId, quantity) => {
    const result = removeItemFromInventory(get().inventory, defId, quantity);
    set({});
    return result;
  },

  equipFromSlot: (slotIdx) => {
    const result = equipItem(get().inventory, slotIdx, get().itemDefs);
    set({});
    return result;
  },

  unequipFromSlot: (slot) => {
    const result = unequipItem(get().inventory, slot);
    set({});
    return result;
  },

  sortBag: () => {
    sortInventory(get().inventory, get().itemDefs);
    set({});
  },

  // === Harvesting ===

  startHarvestAction: () => {
    const s = get();
    if (s.harvestProgress) return; // already harvesting
    if (!s.nearbyNode) return;

    const node = s.nearbyNode;
    const profName = resolveGatheringProfession(getProfessionForResource(node.resourceTypeId));
    const profState = getProfessionState(s.professions, profName);
    const profLevel = profState?.level ?? 1;

    // Check if can harvest
    // We can't check position here since we don't have it, but the tick already validates nearby
    const progress = startHarvest(node, profLevel);
    set({ harvestProgress: progress });
  },

  cancelHarvest: () => set({ harvestProgress: null }),

  // === XP ===

  addCombatXP: (enemyLevel) => {
    const s = get();
    const xp = calculateCombatXP(enemyLevel, s.heroProgression.level);
    const result = addHeroXP(s.heroProgression, xp);
    set({});
    return result;
  },

  spendAttribute: (attr) => {
    const result = spendAttributePoint(get().heroProgression, attr);
    set({});
    return result;
  },

  // === Tick ===

  survivalTick: (dt, playerPosition) => {
    const s = get();

    // Update world node respawn timers
    updateWorldNodes(s.worldNodes, dt);

    // Find nearest harvestable node
    const nearest = s.gameMode === 'harvest' ? findNearestNode(s.worldNodes, playerPosition) : null;
    if (nearest !== s.nearbyNode) set({ nearbyNode: nearest });

    // Update harvest progress
    if (s.harvestProgress) {
      const complete = updateHarvestProgress(s.harvestProgress, dt);
      if (complete) {
        // Complete the harvest
        const node = s.worldNodes.find(n => n.id === s.harvestProgress!.nodeId);
        if (node) {
          const profName = resolveGatheringProfession(getProfessionForResource(node.resourceTypeId));
          const profState = getProfessionState(s.professions, profName);
          const profLevel = profState?.level ?? 1;

          const result = completeHarvest(node, s.resourceSpawns, profLevel);
          if (result) {
            // Add resources to inventory
            s.addItem(result.resourceDefId, result.quantity, result.quality, result.spawnId);

            // Add profession XP
            if (profState) {
              addProfessionXP(profState, result.professionXP);
            }

            // Add hero XP
            addHeroXP(s.heroProgression, result.heroXP);

            set({
              harvestProgress: null,
              lastHarvestResult: result,
              lastHarvestTime: Date.now(),
            });
          } else {
            set({ harvestProgress: null });
          }
        } else {
          set({ harvestProgress: null });
        }
      } else {
        set({}); // re-render for progress bar
      }
    }

    // Clear harvest result popup after 3 seconds
    if (s.lastHarvestResult && Date.now() - s.lastHarvestTime > 3000) {
      set({ lastHarvestResult: null });
    }
  },

  // === Init ===

  initSurvivalSystems: () => {
    const spawns = generateInitialSpawns();
    const nodes = generateWorldNodes(spawns, { minX: -40, maxX: 40, minZ: -40, maxZ: 40 }, 0.8);

    // Give starter tools
    const s = get();
    const pickaxeDef = s.itemDefs.get('tool_pickaxe');
    const axeDef = s.itemDefs.get('tool_axe');
    const sickleDef = s.itemDefs.get('tool_sickle');
    if (pickaxeDef) addItemToInventory(s.inventory, 'tool_pickaxe', 1, pickaxeDef);
    if (axeDef) addItemToInventory(s.inventory, 'tool_axe', 1, axeDef);
    if (sickleDef) addItemToInventory(s.inventory, 'tool_sickle', 1, sickleDef);

    set({ resourceSpawns: spawns, worldNodes: nodes });
  },
}));
