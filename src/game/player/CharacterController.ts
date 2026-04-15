/**
 * CharacterController — Rapier capsule physics for the player.
 * Ported from Motion Player.tsx movement constants + Unity TPS PlayerMovement.cs.
 *
 * Usage: call `characterControllerTick(dt, rapierWorld, body, cameraYaw)` every frame.
 * The body must be a dynamic RigidBody with a CapsuleCollider.
 */

import * as THREE from 'three';
import { inputManager } from './InputManager';
import { useGameStore } from '../store';

// ── Motion constants ──────────────────────────────────────────────────────────
export const CAPSULE_HH = 0.5;      // half-height of cylindrical section
export const CAPSULE_R  = 0.35;     // capsule radius
export const CAPSULE_CY = CAPSULE_HH + CAPSULE_R; // centre Y above ground

const WALK_SPEED    = 4.5;
const RUN_SPEED     = 9.0;
const JUMP_FORCE    = 9;
const DODGE_SPEED   = 10;
const DODGE_DURATION = 0.38;
const ROLL_SPEED    = 14;
const ROLL_DURATION = 0.45;
const ROLL_COOLDOWN = 1.2;
const CROUCH_SPEED_MULT = 0.55;
const GRAVITY       = -22;

// ── Internal mutable state ────────────────────────────────────────────────────
let _isGrounded = true;
let _velY = 0;
let _dodgeTimer = 0;
let _dodgeDir = new THREE.Vector3();
let _rollTimer = 0;
let _rollCooldownTimer = 0;
let _facingAngle = 0;

const _tmpVec = new THREE.Vector3();
const _moveDir = new THREE.Vector3();

export function isGrounded() { return _isGrounded; }
export function getFacingAngle() { return _facingAngle; }

/**
 * Tick the character controller.
 * `bodyApi` should be a ref to the Rapier RigidBody (from @react-three/rapier useRef).
 * Returns the new world position for syncing with the store.
 */
export function characterControllerTick(
  dt: number,
  bodyApi: { translation(): { x: number; y: number; z: number }; setTranslation(t: { x: number; y: number; z: number }, wake: boolean): void; setLinvel(v: { x: number; y: number; z: number }, wake: boolean): void; linvel(): { x: number; y: number; z: number } } | null,
  cameraYaw: number,
): [number, number, number] {
  if (!bodyApi) return [0, 0, 0];
  const input = inputManager;
  const store = useGameStore.getState();
  const pos = bodyApi.translation();

  // ── Ground check (simple Y threshold for now; upgrade to castRay later) ──
  _isGrounded = pos.y <= CAPSULE_CY + 0.1;

  // ── Gravity ──────────────────────────────────────────────────────────────
  if (!_isGrounded) {
    _velY += GRAVITY * dt;
  } else if (_velY < 0) {
    _velY = 0;
  }

  // ── Jump ──────────────────────────────────────────────────────────────────
  if (input.keys.jump && _isGrounded) {
    _velY = JUMP_FORCE;
    input.keys.jump = false;
  }

  // ── Dodge (from Motion double-tap) ────────────────────────────────────────
  if (_dodgeTimer > 0) {
    _dodgeTimer -= dt;
    const dv = _dodgeDir.clone().multiplyScalar(DODGE_SPEED * dt);
    bodyApi.setTranslation({ x: pos.x + dv.x, y: pos.y + _velY * dt, z: pos.z + dv.z }, true);
    const p = bodyApi.translation();
    return [p.x, p.y, p.z];
  }

  // ── Roll ──────────────────────────────────────────────────────────────────
  _rollCooldownTimer = Math.max(0, _rollCooldownTimer - dt);
  if (_rollTimer > 0) {
    _rollTimer -= dt;
    const fwd = new THREE.Vector3(Math.sin(_facingAngle), 0, Math.cos(_facingAngle));
    const rv = fwd.multiplyScalar(ROLL_SPEED * dt);
    bodyApi.setTranslation({ x: pos.x + rv.x, y: pos.y + _velY * dt, z: pos.z + rv.z }, true);
    const p = bodyApi.translation();
    return [p.x, p.y, p.z];
  }

  // ── Wire double-tap → dodge ───────────────────────────────────────────────
  inputManager.onDoubleTap = (dir: string) => {
    if (_dodgeTimer > 0 || !_isGrounded) return;
    _dodgeTimer = DODGE_DURATION;
    const fwd = new THREE.Vector3(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
    switch (dir) {
      case 'w': _dodgeDir.copy(fwd).negate(); break; // forward is -Z in camera space
      case 's': _dodgeDir.copy(fwd); break;
      case 'a': _dodgeDir.copy(right).negate(); break;
      case 'd': _dodgeDir.copy(right); break;
    }
    _dodgeDir.normalize();
  };

  // ── Movement direction (camera-relative WASD, matches Motion + Unity TPS) ──
  const forward = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw)).normalize();
  const right = new THREE.Vector3(forward.z, 0, -forward.x);

  _moveDir.set(0, 0, 0);
  if (input.keys.forward)  _moveDir.add(forward);
  if (input.keys.backward) _moveDir.sub(forward);
  if (input.keys.left)     _moveDir.sub(right);  // turn left
  if (input.keys.right)    _moveDir.add(right);  // turn right
  if (input.keys.strafeL)  _moveDir.sub(right);
  if (input.keys.strafeR)  _moveDir.add(right);

  const isMoving = _moveDir.lengthSq() > 0.001;
  if (isMoving) _moveDir.normalize();

  // Speed
  let speed = input.keys.sprint ? RUN_SPEED : WALK_SPEED;
  if (input.keys.crouch) speed *= CROUCH_SPEED_MULT;
  if (store.isAiming) speed *= 0.5; // slow while aiming (Unity TPS AimMovement)

  // Apply movement
  const mx = _moveDir.x * speed * dt;
  const mz = _moveDir.z * speed * dt;
  const my = _velY * dt;

  // Clamp to world bounds (±150)
  const BOUND = 150;
  const nx = Math.max(-BOUND, Math.min(BOUND, pos.x + mx));
  const ny = Math.max(0, pos.y + my); // don't fall below ground
  const nz = Math.max(-BOUND, Math.min(BOUND, pos.z + mz));

  bodyApi.setTranslation({ x: nx, y: ny, z: nz }, true);
  bodyApi.setLinvel({ x: 0, y: _velY, z: 0 }, true);

  // Face movement direction (slerp, mirrors Unity Quaternion.Slerp)
  if (isMoving && !store.isAiming) {
    const targetAngle = Math.atan2(_moveDir.x, _moveDir.z);
    _facingAngle = lerpAngle(_facingAngle, targetAngle, dt * 10);
  } else if (store.isAiming) {
    // Face camera direction when aiming (Unity FixedUpdate pattern)
    _facingAngle = cameraYaw + Math.PI;
  }

  // Sync back to store
  const finalPos = bodyApi.translation();
  store.movePlayer(finalPos.x - store.playerPosition[0], finalPos.z - store.playerPosition[2]);

  return [finalPos.x, finalPos.y, finalPos.z];
}

function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return a + diff * Math.min(t, 1);
}

export function resetCharacterController() {
  _isGrounded = true;
  _velY = 0;
  _dodgeTimer = 0;
  _rollTimer = 0;
  _rollCooldownTimer = 0;
  _facingAngle = 0;
}
