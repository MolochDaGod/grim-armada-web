/**
 * WaveSpawner — wave-based enemy spawning system.
 * 12 spawn positions across the 300×300 world, escalating difficulty.
 * Ported from Motion Game.tsx spawn logic.
 */

import { createEnemyFSM, type EnemyFSMData } from './EnemyFSM';
import { ENEMY_TYPES, type EnemyTypeDef } from './EnemyTypes';

const MAX_ENEMIES = 18;
const WAVE_INTERVAL = 60; // seconds between waves
const ENEMIES_PER_WAVE_BASE = 4;
const ENEMIES_PER_WAVE_SCALE = 2;

let _spawnIdCounter = 0;

// Spawn positions spread across the 300×300 world (from Motion)
export const SPAWN_POSITIONS: [number, number, number][] = [
  [ 60, 0,   0], [-60, 0,   0], [  0, 0,  60], [  0, 0, -60],
  [ 60, 0,  60], [-60, 0,  60], [ 60, 0, -60], [-60, 0, -60],
  [ 90, 0,  30], [-90, 0,  30], [ 90, 0, -30], [-90, 0, -30],
];

/**
 * Spawn a wave of enemies.
 * @param wave Current wave number (1-based)
 * @param existingCount Current number of alive enemies
 * @returns Array of new EnemyFSMData to add
 */
export function spawnWave(wave: number, existingCount: number): EnemyFSMData[] {
  const budget = Math.min(
    ENEMIES_PER_WAVE_BASE + wave * ENEMIES_PER_WAVE_SCALE,
    MAX_ENEMIES - existingCount,
  );
  if (budget <= 0) return [];

  const spawned: EnemyFSMData[] = [];
  let remaining = budget;

  while (remaining > 0) {
    // Pick random enemy type — bosses only after wave 3
    let typeIdx = Math.floor(Math.random() * ENEMY_TYPES.length);
    if (ENEMY_TYPES[typeIdx].name === 'Elite Warden' && wave < 3) {
      typeIdx = Math.floor(Math.random() * (ENEMY_TYPES.length - 1)); // skip boss
    }
    const typeDef = ENEMY_TYPES[typeIdx];

    // Pick random spawn position
    const basePos = SPAWN_POSITIONS[Math.floor(Math.random() * SPAWN_POSITIONS.length)];
    const jitter = () => (Math.random() - 0.5) * 8;

    // Spawn group
    const groupSize = typeDef.groupSize[0] + Math.floor(Math.random() * (typeDef.groupSize[1] - typeDef.groupSize[0] + 1));
    const count = Math.min(groupSize, remaining);

    for (let i = 0; i < count; i++) {
      const pos: [number, number, number] = [
        basePos[0] + jitter(),
        0,
        basePos[2] + jitter(),
      ];
      // Scale health and speed by wave
      const hp = typeDef.baseHealth + wave * 10;
      const spd = typeDef.baseSpeed + wave * 0.3;
      const dmg = typeDef.baseDamage + wave * 2;

      const enemy = createEnemyFSM(
        `enemy-${++_spawnIdCounter}`,
        pos,
        hp,
        spd,
        dmg,
      );
      // Store type info for rendering
      (enemy as any)._typeDef = typeDef;
      spawned.push(enemy);
      remaining--;
    }
  }

  return spawned;
}

/**
 * Wave timer management — call every frame.
 * Returns wave number if a new wave should spawn, or 0.
 */
let _waveTimer = WAVE_INTERVAL;
let _currentWave = 1;

export function tickWaveTimer(dt: number): number {
  _waveTimer -= dt;
  if (_waveTimer <= 0) {
    _waveTimer = WAVE_INTERVAL;
    _currentWave++;
    return _currentWave;
  }
  return 0;
}

export function getWaveTimer() { return _waveTimer; }
export function getCurrentWave() { return _currentWave; }

export function resetWaveSpawner() {
  _waveTimer = WAVE_INTERVAL;
  _currentWave = 1;
  _spawnIdCounter = 0;
}
