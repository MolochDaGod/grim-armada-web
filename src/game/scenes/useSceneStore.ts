/**
 * useSceneStore — biome scene state + portal transitions.
 * 4 scenes: colony, wasteland, dungeon, forge.
 *
 * Best practice: scene swap applies spawn pose into game store and
 * exposes biome look metadata for fog/UI (not a full unload of DemoScene).
 */

import { create } from 'zustand';
import { useGameStore } from '../store';

export type SceneId = 'colony' | 'wasteland' | 'dungeon' | 'forge';

export interface SceneSpawn {
  position: [number, number, number];
  rotationY: number;
}

const SCENE_SPAWNS: Record<SceneId, SceneSpawn> = {
  colony: { position: [0, 1, 5], rotationY: 0 },
  wasteland: { position: [80, 1, 80], rotationY: Math.PI },
  dungeon: { position: [0, 1, -80], rotationY: Math.PI },
  forge: { position: [-80, 1, 0], rotationY: Math.PI / 2 },
};

export const SCENE_META: Record<
  SceneId,
  { name: string; color: string; description: string; fogHint: string }
> = {
  colony: {
    name: 'Colony Outpost',
    color: '#6d95c6',
    description: 'Home base — crafting, vendors, safe zone',
    fogHint: '#0a1520',
  },
  wasteland: {
    name: 'Wasteland',
    color: '#c96d63',
    description: 'Hostile desert biome — high-tier enemies',
    fogHint: '#1a1008',
  },
  dungeon: {
    name: 'Dungeon',
    color: '#a855f7',
    description: 'Underground labyrinth — boss encounters',
    fogHint: '#080610',
  },
  forge: {
    name: 'Forge District',
    color: '#f0c978',
    description: 'Industrial zone — blacksmith, salvage',
    fogHint: '#120c08',
  },
};

interface SceneStore {
  activeScene: SceneId;
  spawn: SceneSpawn;
  transitioning: boolean;
  setScene: (id: SceneId) => void;
  transitionTo: (id: SceneId) => void;
}

function applySpawn(id: SceneId) {
  const spawn = SCENE_SPAWNS[id];
  const meta = SCENE_META[id];
  useGameStore.getState().setPlayerPose(spawn.position, spawn.rotationY);
  useGameStore.getState().addLog(`Entered ${meta.name}`, 'system');
  return spawn;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  activeScene: 'colony',
  spawn: SCENE_SPAWNS.colony,
  transitioning: false,

  setScene: (id) => {
    const spawn = applySpawn(id);
    set({ activeScene: id, spawn, transitioning: false });
  },

  transitionTo: (id) => {
    if (get().transitioning || get().activeScene === id) return;
    set({ transitioning: true });
    // Brief black-screen fade, then swap scene + teleport
    window.setTimeout(() => {
      const spawn = applySpawn(id);
      set({ activeScene: id, spawn, transitioning: false });
    }, 600);
  },
}));
