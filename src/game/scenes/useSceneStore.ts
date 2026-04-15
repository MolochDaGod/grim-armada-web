/**
 * useSceneStore — scene state management with transitions.
 * Ported from Motion scenes/useSceneStore.ts.
 * 4 scenes matching our biome plan: colony, wasteland, dungeon, forge.
 */

import { create } from 'zustand';

export type SceneId = 'colony' | 'wasteland' | 'dungeon' | 'forge';

export interface SceneSpawn {
  position: [number, number, number];
  rotationY: number;
}

const SCENE_SPAWNS: Record<SceneId, SceneSpawn> = {
  colony:    { position: [0, 1, 5],   rotationY: 0 },
  wasteland: { position: [80, 1, 80], rotationY: Math.PI },
  dungeon:   { position: [0, 1, -80], rotationY: Math.PI },
  forge:     { position: [-80, 1, 0], rotationY: Math.PI / 2 },
};

export const SCENE_META: Record<SceneId, { name: string; color: string; description: string }> = {
  colony:    { name: 'Colony Outpost', color: '#6d95c6', description: 'Home base — crafting, vendors, safe zone' },
  wasteland: { name: 'Wasteland',     color: '#c96d63', description: 'Hostile desert biome — high-tier enemies' },
  dungeon:   { name: 'Dungeon',       color: '#a855f7', description: 'Underground labyrinth — boss encounters' },
  forge:     { name: 'Forge District', color: '#f0c978', description: 'Industrial zone — blacksmith, salvage' },
};

interface SceneStore {
  activeScene: SceneId;
  spawn: SceneSpawn;
  transitioning: boolean;
  setScene: (id: SceneId) => void;
  transitionTo: (id: SceneId) => void;
}

export const useSceneStore = create<SceneStore>((set, get) => ({
  activeScene: 'colony',
  spawn: SCENE_SPAWNS.colony,
  transitioning: false,

  setScene: (id) =>
    set({ activeScene: id, spawn: SCENE_SPAWNS[id], transitioning: false }),

  transitionTo: (id) => {
    if (get().transitioning || get().activeScene === id) return;
    set({ transitioning: true });
    // Brief black-screen fade, then swap scene
    setTimeout(() => {
      set({ activeScene: id, spawn: SCENE_SPAWNS[id], transitioning: false });
    }, 600);
  },
}));
