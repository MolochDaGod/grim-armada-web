/**
 * GameEngine — single entry for input, movement, camera, and weapons.
 * DemoScene calls initGameEngine once, then tickGameEngine each frame.
 */

import * as THREE from 'three';
import { inputManager } from '../player/InputManager';
import { cameraControllerTick } from '../player/CameraController';
import { weaponManagerTick } from '../weapons/WeaponManager';
import type { SkillDef } from '../weapons/SkillSystem';

export interface WeaponTickResult {
  fired: boolean;
  meleeHit: boolean;
  skillUsed: SkillDef | null;
}
import { characterControllerTick } from '../player/CharacterController';
import { useGameStore } from '../store';

let _inited = false;
let _bodyApi: Parameters<typeof characterControllerTick>[1] = null;

export interface GameEngineContext {
  camera: THREE.PerspectiveCamera;
  playerPos: [number, number, number];
}

export interface GameEngineFrameResult extends WeaponTickResult {
  playerPos: [number, number, number];
  cameraYaw: number;
}

/** Call once when Canvas mounts. */
export function initGameEngine(canvas: HTMLCanvasElement): void {
  if (_inited) return;
  _inited = true;
  inputManager.init();

  const onClick = () => {
    if (!inputManager.isPointerLocked) canvas.requestPointerLock();
  };
  canvas.addEventListener('click', onClick);

  (window as unknown as { __gameEngineCleanup?: () => void }).__gameEngineCleanup = () => {
    canvas.removeEventListener('click', onClick);
    inputManager.destroy();
    _inited = false;
    _bodyApi = null;
  };
}

/** Optional: wire Rapier body when physics character is ready. */
export function setCharacterBody(
  body: Parameters<typeof characterControllerTick>[1],
): void {
  _bodyApi = body;
}

/** Core systems tick — call inside R3F useFrame. */
export function tickGameEngine(dt: number, ctx: GameEngineContext): GameEngineFrameResult {
  const cdt = Math.min(dt, 0.05);
  const store = useGameStore.getState();

  // Combat + survival store tick
  store.tick(cdt);

  // Character movement (when physics body attached)
  let playerPos = ctx.playerPos;
  if (_bodyApi) {
    const yaw = store.cameraYaw;
    const newPos = characterControllerTick(cdt, _bodyApi, yaw);
    if (newPos[0] !== 0 || newPos[2] !== 0) {
      store.movePlayer(newPos[0] - playerPos[0], newPos[2] - playerPos[2]);
      playerPos = store.playerPosition;
    }
  }

  // Camera
  cameraControllerTick(cdt, ctx.camera, playerPos);

  // Weapons, skills, combos
  const weapon = weaponManagerTick(cdt);

  inputManager.resetFrame();

  return {
    ...weapon,
    playerPos,
    cameraYaw: store.cameraYaw,
  };
}

export function destroyGameEngine(): void {
  const cleanup = (window as unknown as { __gameEngineCleanup?: () => void }).__gameEngineCleanup;
  cleanup?.();
}