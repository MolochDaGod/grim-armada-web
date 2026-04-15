/**
 * EnemyTypes — 5 distinct enemy configurations.
 * Each maps to an existing GLB model in public/models/enemies/.
 */

export interface EnemyTypeDef {
  name: string;
  modelUrl: string;
  baseHealth: number;
  baseSpeed: number;
  baseDamage: number;
  scale: number;      // normalizedHeight for GLTFModel
  color: string;      // fallback color / health bar tint
  groupSize: [number, number]; // [min, max] per spawn cluster
}

export const ENEMY_TYPES: EnemyTypeDef[] = [
  {
    name: 'Mutant Berserker',
    modelUrl: '/models/enemies/mutant.glb',
    baseHealth: 600, baseSpeed: 5, baseDamage: 15,
    scale: 2.2, color: '#8844aa',
    groupSize: [1, 2],
  },
  {
    name: 'Xenomorph Stalker',
    modelUrl: '/models/enemies/alien.glb',
    baseHealth: 800, baseSpeed: 4, baseDamage: 25,
    scale: 2.0, color: '#44aa44',
    groupSize: [1, 2],
  },
  {
    name: 'Spikeball Drone',
    modelUrl: '/models/enemies/spikeball.glb',
    baseHealth: 400, baseSpeed: 3, baseDamage: 10,
    scale: 1.2, color: '#cc4444',
    groupSize: [2, 4],
  },
  {
    name: 'Zombie Horde',
    modelUrl: '/models/enemies/mutant.glb', // reuse mutant with different tint
    baseHealth: 200, baseSpeed: 2.5, baseDamage: 8,
    scale: 1.8, color: '#668844',
    groupSize: [3, 5],
  },
  {
    name: 'Elite Warden',
    modelUrl: '/models/enemies/alien.glb', // reuse alien scaled up
    baseHealth: 1500, baseSpeed: 3.5, baseDamage: 40,
    scale: 3.0, color: '#ff4488',
    groupSize: [1, 1],
  },
];
