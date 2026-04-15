/**
 * EnemyFSM — finite state machine for enemy NPCs.
 * 6 states: idle → wander → run (chase) → attack → hit → dead.
 * Ported from Motion Zombie.tsx FSM + Unity Enemy-AI BaseStateMachine.cs.
 */

import * as THREE from 'three';

export type EnemyState = 'idle' | 'wander' | 'run' | 'attack' | 'hit' | 'dead';

const ATTACK_RANGE    = 1.9;
const ATTACK_COOLDOWN = 4.0;
const DEAD_LINGER     = 3.5;
const WANDER_SPEED    = 0.30; // fraction of move speed while wandering
const WANDER_BOUNDS   = 120;  // world boundary for wander
const AGGRO_RANGE     = 25;   // distance to start chasing
const AGGRO_FOV       = 120;  // degrees — cone of vision

export interface EnemyFSMData {
  id: string;
  state: EnemyState;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  position: THREE.Vector3;
  spawnPosition: THREE.Vector3;
  facing: number; // radians
  // Timers
  attackCooldown: number;
  deadTimer: number;
  hitTimer: number;
  wanderDir: THREE.Vector3;
  wanderTimer: number;
}

/**
 * Create fresh FSM data for a new enemy.
 */
export function createEnemyFSM(
  id: string,
  pos: [number, number, number],
  health: number,
  speed: number,
  damage: number,
): EnemyFSMData {
  const p = new THREE.Vector3(pos[0], pos[1], pos[2]);
  return {
    id,
    state: 'idle',
    health,
    maxHealth: health,
    speed,
    damage,
    position: p.clone(),
    spawnPosition: p.clone(),
    facing: Math.random() * Math.PI * 2,
    attackCooldown: 0,
    deadTimer: 0,
    hitTimer: 0,
    wanderDir: new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize(),
    wanderTimer: Math.random() * 4,
  };
}

/**
 * Tick the enemy FSM. Returns true if enemy should be despawned.
 */
export function tickEnemyFSM(
  e: EnemyFSMData,
  dt: number,
  playerPos: THREE.Vector3,
  onDamagePlayer: (dmg: number) => void,
): boolean {
  // ── Dead ──────────────────────────────────────────────────────────────────
  if (e.state === 'dead') {
    e.deadTimer += dt;
    return e.deadTimer > DEAD_LINGER;
  }

  // ── Death check ───────────────────────────────────────────────────────────
  if (e.health <= 0 && e.state !== 'dead') {
    e.state = 'dead';
    e.deadTimer = 0;
    return false;
  }

  // ── Hit stagger ───────────────────────────────────────────────────────────
  if (e.state === 'hit') {
    e.hitTimer -= dt;
    if (e.hitTimer <= 0) e.state = 'idle';
    return false;
  }

  // ── Cooldowns ─────────────────────────────────────────────────────────────
  e.attackCooldown = Math.max(0, e.attackCooldown - dt);

  // ── Distance to player ────────────────────────────────────────────────────
  const dx = playerPos.x - e.position.x;
  const dz = playerPos.z - e.position.z;
  const distSq = dx * dx + dz * dz;
  const dist = Math.sqrt(distSq);
  const dirToPlayer = Math.atan2(dx, dz);

  // ── FOV check (from Unity EnemyDetectionDecision.cs — angle/2 cone) ─────
  let angleDiff = Math.abs(normalizeAngle(dirToPlayer - e.facing));
  const inFOV = angleDiff < (AGGRO_FOV / 2) * (Math.PI / 180);
  const inRange = dist < AGGRO_RANGE;

  // ── State transitions ─────────────────────────────────────────────────────
  if (e.state === 'idle') {
    e.wanderTimer -= dt;
    if (inRange && inFOV) {
      e.state = 'run';
    } else if (e.wanderTimer <= 0) {
      e.state = 'wander';
      e.wanderDir.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize();
      e.wanderTimer = 3 + Math.random() * 4;
    }
  }

  if (e.state === 'wander') {
    // Move in wander direction
    const ws = e.speed * WANDER_SPEED * dt;
    e.position.x += e.wanderDir.x * ws;
    e.position.z += e.wanderDir.z * ws;
    e.facing = Math.atan2(e.wanderDir.x, e.wanderDir.z);

    // Bounce off world bounds
    if (Math.abs(e.position.x) > WANDER_BOUNDS || Math.abs(e.position.z) > WANDER_BOUNDS) {
      e.wanderDir.negate();
      e.position.x = Math.max(-WANDER_BOUNDS, Math.min(WANDER_BOUNDS, e.position.x));
      e.position.z = Math.max(-WANDER_BOUNDS, Math.min(WANDER_BOUNDS, e.position.z));
    }

    e.wanderTimer -= dt;
    if (e.wanderTimer <= 0) e.state = 'idle';
    if (inRange && inFOV) e.state = 'run';
  }

  if (e.state === 'run') {
    // Chase player
    if (dist > ATTACK_RANGE) {
      const moveX = Math.sin(dirToPlayer) * e.speed * dt;
      const moveZ = Math.cos(dirToPlayer) * e.speed * dt;
      e.position.x += moveX;
      e.position.z += moveZ;
      e.facing = dirToPlayer;
    } else {
      e.state = 'attack';
    }

    // Leash — return to idle if player too far
    const lx = e.position.x - e.spawnPosition.x;
    const lz = e.position.z - e.spawnPosition.z;
    if (Math.sqrt(lx * lx + lz * lz) > AGGRO_RANGE * 2) {
      e.state = 'idle';
    }
  }

  if (e.state === 'attack') {
    e.facing = dirToPlayer;
    if (dist > ATTACK_RANGE * 1.5) {
      e.state = 'run';
    } else if (e.attackCooldown <= 0) {
      // Execute attack
      onDamagePlayer(e.damage);
      e.attackCooldown = ATTACK_COOLDOWN;
    }
  }

  return false;
}

/**
 * Apply damage to an enemy. Returns true if killed.
 */
export function damageEnemy(e: EnemyFSMData, amount: number): boolean {
  if (e.state === 'dead') return false;
  e.health = Math.max(0, e.health - amount);
  if (e.health <= 0) {
    e.state = 'dead';
    e.deadTimer = 0;
    return true;
  }
  // Hit stagger (0.5s)
  e.state = 'hit';
  e.hitTimer = 0.5;
  return false;
}

function normalizeAngle(a: number): number {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}
