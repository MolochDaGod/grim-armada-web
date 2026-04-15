/**
 * AnimationManager — FBX animation loader, clip registry, and crossfade blender.
 *
 * Manages the Rifle 8-Way Locomotion Pack (50 FBX clips) mapped to a biped
 * character skeleton. Uses Three.js AnimationMixer with smooth crossfade
 * transitions (Armory3D blend() pattern).
 *
 * Sources:
 * - Rifle 8-Way Locomotion Pack (Mixamo-compatible FBX)
 * - Motion Player.tsx crossfade timing constants
 * - Armory3D Animation.blend(action1, action2, factor) pattern
 */

import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// ── Animation clip manifest — Rifle 8-Way Locomotion Pack ─────────────────────
const ANIM_BASE = '/models/animations/rifle-locomotion';

export const RIFLE_ANIMS = {
  // Idle
  idle:                    `${ANIM_BASE}/idle.fbx`,
  idleAiming:              `${ANIM_BASE}/idle aiming.fbx`,
  idleCrouching:           `${ANIM_BASE}/idle crouching.fbx`,
  idleCrouchingAiming:     `${ANIM_BASE}/idle crouching aiming.fbx`,

  // Walk — 8 directions
  walkForward:             `${ANIM_BASE}/walk forward.fbx`,
  walkBackward:            `${ANIM_BASE}/walk backward.fbx`,
  walkLeft:                `${ANIM_BASE}/walk left.fbx`,
  walkRight:               `${ANIM_BASE}/walk right.fbx`,
  walkForwardLeft:         `${ANIM_BASE}/walk forward left.fbx`,
  walkForwardRight:        `${ANIM_BASE}/walk forward right.fbx`,
  walkBackwardLeft:        `${ANIM_BASE}/walk backward left.fbx`,
  walkBackwardRight:       `${ANIM_BASE}/walk backward right.fbx`,

  // Walk crouching — 8 directions
  walkCrouchForward:       `${ANIM_BASE}/walk crouching forward.fbx`,
  walkCrouchBackward:      `${ANIM_BASE}/walk crouching backward.fbx`,
  walkCrouchLeft:          `${ANIM_BASE}/walk crouching left.fbx`,
  walkCrouchRight:         `${ANIM_BASE}/walk crouching right.fbx`,
  walkCrouchForwardLeft:   `${ANIM_BASE}/walk crouching forward left.fbx`,
  walkCrouchForwardRight:  `${ANIM_BASE}/walk crouching forward right.fbx`,
  walkCrouchBackwardLeft:  `${ANIM_BASE}/walk crouching backward left.fbx`,
  walkCrouchBackwardRight: `${ANIM_BASE}/walk crouching backward right.fbx`,

  // Run — 8 directions
  runForward:              `${ANIM_BASE}/run forward.fbx`,
  runBackward:             `${ANIM_BASE}/run backward.fbx`,
  runLeft:                 `${ANIM_BASE}/run left.fbx`,
  runRight:                `${ANIM_BASE}/run right.fbx`,
  runForwardLeft:          `${ANIM_BASE}/run forward left.fbx`,
  runForwardRight:         `${ANIM_BASE}/run forward right.fbx`,
  runBackwardLeft:         `${ANIM_BASE}/run backward left.fbx`,
  runBackwardRight:        `${ANIM_BASE}/run backward right.fbx`,

  // Sprint — 8 directions
  sprintForward:           `${ANIM_BASE}/sprint forward.fbx`,
  sprintBackward:          `${ANIM_BASE}/sprint backward.fbx`,
  sprintLeft:              `${ANIM_BASE}/sprint left.fbx`,
  sprintRight:             `${ANIM_BASE}/sprint right.fbx`,
  sprintForwardLeft:       `${ANIM_BASE}/sprint forward left.fbx`,
  sprintForwardRight:      `${ANIM_BASE}/sprint forward right.fbx`,
  sprintBackwardLeft:      `${ANIM_BASE}/sprint backward left.fbx`,
  sprintBackwardRight:     `${ANIM_BASE}/sprint backward right.fbx`,

  // Jump
  jumpUp:                  `${ANIM_BASE}/jump up.fbx`,
  jumpLoop:                `${ANIM_BASE}/jump loop.fbx`,
  jumpDown:                `${ANIM_BASE}/jump down.fbx`,

  // Turn
  turn90Left:              `${ANIM_BASE}/turn 90 left.fbx`,
  turn90Right:             `${ANIM_BASE}/turn 90 right.fbx`,
  crouchTurn90Left:        `${ANIM_BASE}/crouching turn 90 left.fbx`,
  crouchTurn90Right:       `${ANIM_BASE}/crouching turn 90 right.fbx`,

  // Death — 6 variations
  deathFront:              `${ANIM_BASE}/death from the front.fbx`,
  deathBack:               `${ANIM_BASE}/death from the back.fbx`,
  deathRight:              `${ANIM_BASE}/death from right.fbx`,
  deathFrontHeadshot:      `${ANIM_BASE}/death from front headshot.fbx`,
  deathBackHeadshot:       `${ANIM_BASE}/death from back headshot.fbx`,
  deathCrouchHeadshot:     `${ANIM_BASE}/death crouching headshot front.fbx`,
} as const;

export type RifleAnimKey = keyof typeof RIFLE_ANIMS;

// Character mesh path (from the locomotion pack — Mixamo biped)
export const CHARACTER_MESH = `${ANIM_BASE}/Meshy_AI_Captain_Rcalvin_The_P_0331051233_texture_fbx.fbx`;

// ── Crossfade timing constants (from Motion Player.tsx) ───────────────────────
export const FADE = {
  LOCO: 0.18,        // locomotion ↔ locomotion blend
  ATK_START: 0.08,   // locomotion → attack
  ATK_CHAIN: 0.04,   // attack → queued combo
  ATK_REST: 0.22,    // attack → return to idle
  DEATH: 0.15,       // any → death
  JUMP: 0.10,        // ground → jump
  CROUCH: 0.20,      // stand ↔ crouch transition
};

// ── Animation clip cache ──────────────────────────────────────────────────────
const _clipCache = new Map<string, THREE.AnimationClip>();
const _loadingCache = new Map<string, Promise<THREE.AnimationClip>>();
const _fbxLoader = new FBXLoader();

/**
 * Load an FBX animation clip. Caches results.
 * Returns the first animation clip found in the FBX file.
 */
export function loadAnimClip(url: string): Promise<THREE.AnimationClip> {
  if (_clipCache.has(url)) return Promise.resolve(_clipCache.get(url)!);
  if (_loadingCache.has(url)) return _loadingCache.get(url)!;

  const promise = new Promise<THREE.AnimationClip>((resolve, reject) => {
    _fbxLoader.load(url, (group) => {
      if (group.animations.length > 0) {
        const clip = group.animations[0];
        clip.name = url.split('/').pop()?.replace('.fbx', '') ?? clip.name;
        _clipCache.set(url, clip);
        resolve(clip);
      } else {
        reject(new Error(`No animations in ${url}`));
      }
    }, undefined, reject);
  });

  _loadingCache.set(url, promise);
  return promise;
}

/**
 * Load the character mesh (FBX with skeleton).
 * Returns the Three.js Group with SkinnedMesh inside.
 */
export function loadCharacterMesh(url: string = CHARACTER_MESH): Promise<THREE.Group> {
  return new Promise((resolve, reject) => {
    _fbxLoader.load(url, (group) => {
      // Fix materials (from Motion fixMaterials pattern)
      group.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          const mats = Array.isArray((child as THREE.Mesh).material)
            ? (child as THREE.Mesh).material as THREE.Material[]
            : [(child as THREE.Mesh).material as THREE.Material];
          for (const m of mats) {
            const mat = m as THREE.MeshStandardMaterial;
            mat.side = THREE.DoubleSide;
            mat.depthWrite = true;
            if (mat.transparent && mat.map) mat.alphaTest = 0.5;
            mat.needsUpdate = true;
          }
        }
      });
      resolve(group);
    }, undefined, reject);
  });
}

// ── AnimationController — manages mixer, actions, and crossfade ───────────────

export class AnimationController {
  mixer: THREE.AnimationMixer;
  actions = new Map<string, THREE.AnimationAction>();
  currentAction: THREE.AnimationAction | null = null;
  currentKey = '';

  constructor(root: THREE.Object3D) {
    this.mixer = new THREE.AnimationMixer(root);
  }

  /** Register a loaded clip with a key name */
  addClip(key: string, clip: THREE.AnimationClip) {
    const action = this.mixer.clipAction(clip);
    this.actions.set(key, action);
  }

  /**
   * Crossfade to a new animation (Armory3D blend pattern).
   * If the same animation is already playing, does nothing.
   */
  fadeToAction(key: string, fadeTime = FADE.LOCO, timeScale = 1.0, loop = true) {
    if (key === this.currentKey && this.currentAction?.isRunning()) return;

    const nextAction = this.actions.get(key);
    if (!nextAction) return;

    // Configure loop mode
    nextAction.loop = loop ? THREE.LoopRepeat : THREE.LoopOnce;
    if (!loop) nextAction.clampWhenFinished = true;
    nextAction.setEffectiveTimeScale(timeScale);
    nextAction.setEffectiveWeight(1);

    if (this.currentAction) {
      // Crossfade from current to next
      this.currentAction.fadeOut(fadeTime);
      nextAction.reset().fadeIn(fadeTime).play();
    } else {
      nextAction.reset().play();
    }

    this.currentAction = nextAction;
    this.currentKey = key;
  }

  /** Update the mixer (call every frame) */
  update(dt: number) {
    this.mixer.update(dt);
  }

  /** Stop all actions */
  stopAll() {
    this.mixer.stopAllAction();
    this.currentAction = null;
    this.currentKey = '';
  }
}

// ── 8-Way direction resolver ──────────────────────────────────────────────────

export type MoveDirection = 'idle' | 'forward' | 'backward' | 'left' | 'right'
  | 'forwardLeft' | 'forwardRight' | 'backwardLeft' | 'backwardRight';

/**
 * Determine 8-way direction from input axes.
 * Uses the same camera-relative approach as Motion Player.tsx.
 */
export function get8WayDirection(
  forward: boolean, backward: boolean,
  left: boolean, right: boolean,
): MoveDirection {
  const fwd = forward ? 1 : backward ? -1 : 0;
  const side = right ? 1 : left ? -1 : 0;

  if (fwd === 0 && side === 0) return 'idle';
  if (fwd === 1 && side === 0) return 'forward';
  if (fwd === -1 && side === 0) return 'backward';
  if (fwd === 0 && side === -1) return 'left';
  if (fwd === 0 && side === 1) return 'right';
  if (fwd === 1 && side === -1) return 'forwardLeft';
  if (fwd === 1 && side === 1) return 'forwardRight';
  if (fwd === -1 && side === -1) return 'backwardLeft';
  return 'backwardRight';
}

/**
 * Get the correct animation key for the current movement state.
 * Supports: idle, walk, run, sprint, crouch variants — all 8-directional.
 */
export function getLocomotionAnimKey(
  dir: MoveDirection,
  isSprinting: boolean,
  isRunning: boolean,
  isCrouching: boolean,
  isAiming: boolean,
): RifleAnimKey {
  if (dir === 'idle') {
    if (isCrouching && isAiming) return 'idleCrouchingAiming';
    if (isCrouching) return 'idleCrouching';
    if (isAiming) return 'idleAiming';
    return 'idle';
  }

  // Map direction suffix
  const dirMap: Record<MoveDirection, string> = {
    idle: '', forward: 'Forward', backward: 'Backward',
    left: 'Left', right: 'Right',
    forwardLeft: 'ForwardLeft', forwardRight: 'ForwardRight',
    backwardLeft: 'BackwardLeft', backwardRight: 'BackwardRight',
  };
  const suffix = dirMap[dir];

  // Choose gait prefix
  if (isCrouching) return `walkCrouch${suffix}` as RifleAnimKey;
  if (isSprinting) return `sprint${suffix}` as RifleAnimKey;
  if (isRunning) return `run${suffix}` as RifleAnimKey;
  return `walk${suffix}` as RifleAnimKey;
}

/**
 * Batch-load all Rifle 8-Way Locomotion clips and register them on a controller.
 * Returns when all clips are loaded.
 */
export async function loadAllRifleAnims(controller: AnimationController): Promise<void> {
  const entries = Object.entries(RIFLE_ANIMS) as [RifleAnimKey, string][];

  // Load in parallel batches of 8 for performance
  const BATCH = 8;
  for (let i = 0; i < entries.length; i += BATCH) {
    const batch = entries.slice(i, i + BATCH);
    const clips = await Promise.all(
      batch.map(([key, url]) =>
        loadAnimClip(url).then(clip => ({ key, clip })).catch(() => null)
      ),
    );
    for (const result of clips) {
      if (result) controller.addClip(result.key, result.clip);
    }
  }
}
