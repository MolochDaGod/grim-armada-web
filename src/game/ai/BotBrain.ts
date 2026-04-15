/**
 * BotBrain — Goal-driven AI evaluator system.
 * Ported from Dive (Mugen87) Think/Evaluator/Goal architecture + three-fps FSM patterns.
 *
 * Architecture:
 *   BotBrain.arbitrate() → scores each GoalEvaluator → picks highest → sets active Goal
 *   BotBrain.execute()   → ticks the active goal each frame
 *
 * Evaluators: AttackEval, ExploreEval, GetHealthEval, DodgeEval
 * Goals:      AttackGoal (aim+shoot), HuntGoal (path to last seen pos), DodgeGoal (strafe),
 *             ExploreGoal (wander), GetHealthGoal (seek health pack)
 *
 * Also includes: MemorySystem (remember enemy positions), VisionCone (FOV + LOS check),
 *                AimNoise (distance-proportional inaccuracy), ReactionTime (delay before shooting)
 */

import * as THREE from 'three';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BotTarget {
  id: string;
  position: THREE.Vector3;
  lastSeenPosition: THREE.Vector3;
  lastSeenTime: number;
  visible: boolean;
  timeBecameVisible: number;
  isAlive: boolean;
}

export interface BotState {
  id: string;
  position: THREE.Vector3;
  health: number;
  maxHealth: number;
  ammo: number;
  speed: number;
  facing: THREE.Vector3;
  isAlive: boolean;
}

export type GoalType = 'attack' | 'hunt' | 'dodge' | 'explore' | 'getHealth' | 'idle';

// ── Config ────────────────────────────────────────────────────────────────────

export const BOT_CONFIG = {
  VISION_FOV: 120,               // degrees — cone of vision
  VISION_RANGE: 30,              // world units — max detection distance
  VISION_UPDATE_HZ: 5,           // vision checks per second
  MEMORY_SPAN: 20,               // seconds — how long to remember enemies
  REACTION_TIME: 0.8,            // seconds — delay before firing after target becomes visible
  AIM_ACCURACY: 2.5,             // world units — max random aim offset at max distance
  AIM_NOISE_MAX_DISTANCE: 50,    // distance producing max offset
  GOAL_ARBITRATE_HZ: 4,          // re-evaluate goals per second
  DODGE_SIZE: 4,                 // world units — strafe distance
  DODGE_DURATION: 0.6,           // seconds per strafe move
  ATTACK_RANGE: 40,              // world units — max attack range
  FLEE_HEALTH_THRESHOLD: 0.25,   // % health below which bot seeks health
};

// ── Memory System (from Dive MemorySystem) ────────────────────────────────────

export class MemoryRecord {
  entity: BotTarget;
  timeLastSensed = 0;
  lastSensedPosition = new THREE.Vector3();
  visible = false;
  timeBecameVisible = 0;

  constructor(target: BotTarget) {
    this.entity = target;
    this.lastSensedPosition.copy(target.position);
  }
}

export class MemorySystem {
  records = new Map<string, MemoryRecord>();
  memorySpan: number;

  constructor(memorySpan = BOT_CONFIG.MEMORY_SPAN) {
    this.memorySpan = memorySpan;
  }

  getRecord(id: string): MemoryRecord | undefined {
    return this.records.get(id);
  }

  createOrUpdate(target: BotTarget, currentTime: number, visible: boolean) {
    let record = this.records.get(target.id);
    if (!record) {
      record = new MemoryRecord(target);
      this.records.set(target.id, record);
    }
    if (visible) {
      record.timeLastSensed = currentTime;
      record.lastSensedPosition.copy(target.position);
      if (!record.visible) record.timeBecameVisible = currentTime;
      record.visible = true;
    } else {
      record.visible = false;
    }
    record.entity = target;
  }

  /** Get all records still within memory span */
  getValidRecords(currentTime: number): MemoryRecord[] {
    const valid: MemoryRecord[] = [];
    for (const [id, record] of this.records) {
      if (currentTime - record.timeLastSensed <= this.memorySpan && record.entity.isAlive) {
        valid.push(record);
      } else if (!record.entity.isAlive) {
        this.records.delete(id);
      }
    }
    return valid;
  }

  clear() { this.records.clear(); }
}

// ── Vision Cone (from Dive Vision + three-fps CanSeeThePlayer) ────────────────

export function checkVision(
  botPos: THREE.Vector3,
  botFacing: THREE.Vector3,
  targetPos: THREE.Vector3,
  fovDeg = BOT_CONFIG.VISION_FOV,
  maxRange = BOT_CONFIG.VISION_RANGE,
): boolean {
  const toTarget = new THREE.Vector3().subVectors(targetPos, botPos);
  toTarget.y = 0; // ignore height difference for FOV check
  const dist = toTarget.length();
  if (dist > maxRange || dist < 0.1) return dist < 0.1;

  toTarget.normalize();
  const facingFlat = new THREE.Vector3(botFacing.x, 0, botFacing.z).normalize();
  const dot = facingFlat.dot(toTarget);
  const halfFovRad = (fovDeg / 2) * (Math.PI / 180);

  return dot >= Math.cos(halfFovRad);
}

// ── Aim Noise (from Dive WeaponSystem.addNoiseToAim) ──────────────────────────

const _aimOffset = new THREE.Vector3();

export function addAimNoise(targetPos: THREE.Vector3, botPos: THREE.Vector3, accuracy = BOT_CONFIG.AIM_ACCURACY): THREE.Vector3 {
  const noised = targetPos.clone();
  const dist = botPos.distanceTo(targetPos);
  const f = Math.min(dist, BOT_CONFIG.AIM_NOISE_MAX_DISTANCE) / BOT_CONFIG.AIM_NOISE_MAX_DISTANCE;

  _aimOffset.set(
    (Math.random() - 0.5) * 2 * accuracy,
    (Math.random() - 0.5) * 2 * accuracy * 0.5, // less vertical noise
    (Math.random() - 0.5) * 2 * accuracy,
  );
  noised.add(_aimOffset.multiplyScalar(f));
  return noised;
}

// ── Target System (from Dive TargetSystem) ────────────────────────────────────

export function selectTarget(records: MemoryRecord[], botPos: THREE.Vector3): MemoryRecord | null {
  // Prefer visible targets (closest), then most recently seen
  const visible = records.filter(r => r.visible);
  if (visible.length > 0) {
    let minDist = Infinity;
    let best: MemoryRecord | null = null;
    for (const r of visible) {
      const d = botPos.distanceToSquared(r.lastSensedPosition);
      if (d < minDist) { minDist = d; best = r; }
    }
    return best;
  }

  // No visible targets — pick most recently sensed
  const invisible = records.filter(r => !r.visible);
  if (invisible.length > 0) {
    let maxTime = -Infinity;
    let best: MemoryRecord | null = null;
    for (const r of invisible) {
      if (r.timeLastSensed > maxTime) { maxTime = r.timeLastSensed; best = r; }
    }
    return best;
  }

  return null;
}

// ── Goal Evaluators (from Dive AttackEvaluator, ExploreEvaluator, etc.) ───────

export interface GoalEvaluator {
  name: string;
  evaluate(bot: BotState, target: MemoryRecord | null, currentTime: number): number;
}

export const AttackEvaluator: GoalEvaluator = {
  name: 'attack',
  evaluate(bot, target, currentTime) {
    if (!target || !target.visible) return 0;
    const healthFactor = bot.health / bot.maxHealth;
    const ammoFactor = Math.min(bot.ammo / 30, 1);
    const distFactor = 1 - Math.min(bot.position.distanceTo(target.lastSensedPosition) / BOT_CONFIG.ATTACK_RANGE, 1);
    return healthFactor * 0.4 + ammoFactor * 0.3 + distFactor * 0.3;
  },
};

export const HuntEvaluator: GoalEvaluator = {
  name: 'hunt',
  evaluate(bot, target, currentTime) {
    if (!target || target.visible) return 0;
    // Hunt is desirable when we have a target but can't see it
    const recency = 1 - Math.min((currentTime - target.timeLastSensed) / BOT_CONFIG.MEMORY_SPAN, 1);
    return recency * 0.7;
  },
};

export const ExploreEvaluator: GoalEvaluator = {
  name: 'explore',
  evaluate(bot, target) {
    // Explore when no target
    return target ? 0.1 : 0.6;
  },
};

export const DodgeEvaluator: GoalEvaluator = {
  name: 'dodge',
  evaluate(bot, target) {
    if (!target || !target.visible) return 0;
    const dist = bot.position.distanceTo(target.lastSensedPosition);
    // Dodge is most desirable at medium range when under fire
    if (dist < 5 || dist > 20) return 0.1;
    const healthFactor = 1 - (bot.health / bot.maxHealth); // low health = more dodge
    return 0.3 + healthFactor * 0.4;
  },
};

export const GetHealthEvaluator: GoalEvaluator = {
  name: 'getHealth',
  evaluate(bot) {
    const healthPct = bot.health / bot.maxHealth;
    if (healthPct > BOT_CONFIG.FLEE_HEALTH_THRESHOLD) return 0;
    return (1 - healthPct) * 0.9; // very high priority when low health
  },
};

// ── BotBrain (from Dive Think class) ──────────────────────────────────────────

export class BotBrain {
  evaluators: GoalEvaluator[] = [
    AttackEvaluator,
    HuntEvaluator,
    ExploreEvaluator,
    DodgeEvaluator,
    GetHealthEvaluator,
  ];

  memory = new MemorySystem();
  currentGoal: GoalType = 'idle';
  currentTarget: MemoryRecord | null = null;

  // Timers
  private _arbitrateTimer = 0;
  private _visionTimer = 0;
  private _goalTimer = 0;       // time spent in current goal
  private _reactionTimer = 0;   // time since target became visible
  private _dodgeDir = 1;        // 1=right, -1=left
  private _dodgeTimer = 0;
  private _exploreTarget = new THREE.Vector3();
  private _exploreTimer = 0;

  /** Whether the bot should fire this frame */
  shouldFire = false;
  /** Noised aim direction (world-space target point) */
  aimTarget = new THREE.Vector3();
  /** Movement direction (normalized, world-space) */
  moveDirection = new THREE.Vector3();
  /** Whether bot is moving */
  isMoving = false;

  /**
   * Tick the brain. Call every frame.
   * @param bot Current bot state
   * @param targets All potential targets (other players/bots)
   * @param dt Delta time
   * @param currentTime Total elapsed time
   */
  tick(bot: BotState, targets: BotTarget[], dt: number, currentTime: number) {
    this.shouldFire = false;
    this.isMoving = false;

    if (!bot.isAlive) return;

    // ── Vision update (throttled) ──────────────────────────────────────
    this._visionTimer += dt;
    if (this._visionTimer >= 1 / BOT_CONFIG.VISION_UPDATE_HZ) {
      this._visionTimer = 0;
      for (const target of targets) {
        if (target.id === bot.id || !target.isAlive) continue;
        const visible = checkVision(bot.position, bot.facing, target.position);
        this.memory.createOrUpdate(target, currentTime, visible);
      }
    }

    // ── Target selection ────────────────────────────────────────────────
    const validRecords = this.memory.getValidRecords(currentTime);
    this.currentTarget = selectTarget(validRecords, bot.position);

    // ── Goal arbitration (throttled) ───────────────────────────────────
    this._arbitrateTimer += dt;
    if (this._arbitrateTimer >= 1 / BOT_CONFIG.GOAL_ARBITRATE_HZ) {
      this._arbitrateTimer = 0;
      this._arbitrate(bot, currentTime);
    }

    // ── Execute current goal ───────────────────────────────────────────
    this._goalTimer += dt;
    this._executeGoal(bot, dt, currentTime);
  }

  private _arbitrate(bot: BotState, currentTime: number) {
    let bestScore = -1;
    let bestGoal: GoalType = 'idle';

    for (const ev of this.evaluators) {
      const score = ev.evaluate(bot, this.currentTarget, currentTime);
      if (score > bestScore) {
        bestScore = score;
        bestGoal = ev.name as GoalType;
      }
    }

    if (bestGoal !== this.currentGoal) {
      this.currentGoal = bestGoal;
      this._goalTimer = 0;
      this._dodgeTimer = 0;
    }
  }

  private _executeGoal(bot: BotState, dt: number, currentTime: number) {
    const target = this.currentTarget;

    switch (this.currentGoal) {
      case 'attack':
        this._executeAttack(bot, target, dt, currentTime);
        break;
      case 'hunt':
        this._executeHunt(bot, target, dt);
        break;
      case 'dodge':
        this._executeDodge(bot, target, dt, currentTime);
        break;
      case 'explore':
        this._executeExplore(bot, dt);
        break;
      case 'getHealth':
        this._executeExplore(bot, dt); // for now, explore (health packs not placed yet)
        break;
      default:
        break;
    }
  }

  // ── Attack: face target, wait for reaction time, then fire with aim noise ──
  private _executeAttack(bot: BotState, target: MemoryRecord | null, dt: number, currentTime: number) {
    if (!target || !target.visible) {
      this.currentGoal = 'hunt';
      return;
    }

    // Face the target
    const toTarget = new THREE.Vector3().subVectors(target.lastSensedPosition, bot.position).normalize();
    bot.facing.copy(toTarget);

    // Reaction time check (from Dive: reactionTime before firing)
    const timeSinceVisible = currentTime - target.timeBecameVisible;
    if (timeSinceVisible < BOT_CONFIG.REACTION_TIME) return;

    // Fire with aim noise
    this.aimTarget.copy(addAimNoise(target.lastSensedPosition, bot.position));
    this.aimTarget.y += 1.2; // aim at torso height
    this.shouldFire = true;
  }

  // ── Hunt: move toward last known position ──────────────────────────────────
  private _executeHunt(bot: BotState, target: MemoryRecord | null, dt: number) {
    if (!target) {
      this.currentGoal = 'explore';
      return;
    }
    if (target.visible) {
      this.currentGoal = 'attack';
      return;
    }

    const toTarget = new THREE.Vector3().subVectors(target.lastSensedPosition, bot.position);
    toTarget.y = 0;
    const dist = toTarget.length();

    if (dist < 2) {
      // Arrived at last seen position, target gone — explore
      this.memory.records.delete(target.entity.id);
      this.currentGoal = 'explore';
      return;
    }

    toTarget.normalize();
    this.moveDirection.copy(toTarget);
    this.isMoving = true;
    bot.facing.copy(toTarget);
  }

  // ── Dodge: strafe left/right while facing target (from Dive DodgeGoal) ─────
  private _executeDodge(bot: BotState, target: MemoryRecord | null, dt: number, currentTime: number) {
    if (!target || !target.visible) {
      this.currentGoal = target ? 'hunt' : 'explore';
      return;
    }

    // Face target
    const toTarget = new THREE.Vector3().subVectors(target.lastSensedPosition, bot.position).normalize();
    bot.facing.copy(toTarget);

    // Strafe perpendicular to facing
    this._dodgeTimer += dt;
    if (this._dodgeTimer > BOT_CONFIG.DODGE_DURATION) {
      this._dodgeTimer = 0;
      this._dodgeDir *= -1; // alternate left/right
    }

    const right = new THREE.Vector3().crossVectors(toTarget, new THREE.Vector3(0, 1, 0)).normalize();
    this.moveDirection.copy(right).multiplyScalar(this._dodgeDir);
    this.isMoving = true;

    // Also fire while dodging (reaction time already met if we got here)
    const timeSinceVisible = currentTime - target.timeBecameVisible;
    if (timeSinceVisible >= BOT_CONFIG.REACTION_TIME) {
      this.aimTarget.copy(addAimNoise(target.lastSensedPosition, bot.position));
      this.aimTarget.y += 1.2;
      this.shouldFire = true;
    }
  }

  // ── Explore: wander to random positions ────────────────────────────────────
  private _executeExplore(bot: BotState, dt: number) {
    this._exploreTimer -= dt;
    if (this._exploreTimer <= 0) {
      // Pick a new random explore target within 40 units
      this._exploreTarget.set(
        bot.position.x + (Math.random() - 0.5) * 80,
        0,
        bot.position.z + (Math.random() - 0.5) * 80,
      );
      // Clamp to world bounds
      this._exploreTarget.x = Math.max(-120, Math.min(120, this._exploreTarget.x));
      this._exploreTarget.z = Math.max(-120, Math.min(120, this._exploreTarget.z));
      this._exploreTimer = 4 + Math.random() * 4;
    }

    const toTarget = new THREE.Vector3().subVectors(this._exploreTarget, bot.position);
    toTarget.y = 0;
    if (toTarget.length() < 2) {
      this._exploreTimer = 0; // pick new target
      return;
    }

    toTarget.normalize();
    this.moveDirection.copy(toTarget);
    this.isMoving = true;
    bot.facing.copy(toTarget);
  }

  reset() {
    this.memory.clear();
    this.currentGoal = 'idle';
    this.currentTarget = null;
    this._arbitrateTimer = 0;
    this._visionTimer = 0;
    this._goalTimer = 0;
    this._dodgeTimer = 0;
    this._exploreTimer = 0;
    this.shouldFire = false;
    this.isMoving = false;
  }
}
