/**
 * CameraController — TPS/Action/FPS camera with ADS zoom.
 * Ported from Motion CameraSettings + Unity TPS PlayerAim.cs.
 * Enhanced with CopperCube behavior_ThirdPersonCamera patterns:
 *   - Smooth base-height tracking (prevents Y jitter on terrain bumps)
 *   - Camera reset key (R) snaps yaw behind player facing
 *   - Focus point uses smoothed height, not raw player Y
 *
 * Call `cameraControllerTick(dt, camera, playerPos)` each frame inside useFrame.
 */

import * as THREE from 'three';
import { useGameStore } from '../store';
import { inputManager } from './InputManager';
import { getRecoil } from '../weapons/WeaponManager';
import { getFacingAngle } from './CharacterController';

// ── Camera presets per view mode ──────────────────────────────────────────────
const PRESETS = {
  tps:    { distance: 5.0,  shoulderX: 0.52, shoulderY: 1.30, fov: 70, pitchMin: -0.35, pitchMax: 1.2 },
  action: { distance: 3.5,  shoulderX: 0.40, shoulderY: 0.90, fov: 65, pitchMin: -0.50, pitchMax: 1.0 },
  fps:    { distance: 0.0,  shoulderX: 0.0,  shoulderY: 1.70, fov: 80, pitchMin: -1.4,  pitchMax: 1.5 },
};

const ADS_FOV = 50;
const ADS_DISTANCE = 2.5;
const ADS_SHOULDER_X = 0.3;
const ADS_LERP_SPEED = 8;

// ── Smooth height tracking (from CopperCube behavior_ThirdPersonCamera) ───────
// Instead of following raw player Y directly, we slowly lerp a "base height"
// toward the player's actual Y. This prevents camera jitter when walking
// over small terrain bumps, steps, or slopes.
const HEIGHT_SMOOTH_FACTOR = 0.05; // low = very smooth, high = snappy
let _baseHeight = 0;
let _baseHeightInit = false;

// ── Internal state ────────────────────────────────────────────────────────────
let _yaw = 0;
let _pitch = 0.3;
let _currentFov = 70;
let _currentDist = 5.0;
let _currentShX = 0.52;
let _currentShY = 1.30;
let _shakeDecay = 0;

const _smoothPlayerPos = new THREE.Vector3();
const _smoothCamPos = new THREE.Vector3();

export function getYaw() { return _yaw; }
export function getPitch() { return _pitch; }

/**
 * Tick the camera. Updates `camera.position`, `camera.lookAt`, and `camera.fov`.
 */
export function cameraControllerTick(
  dt: number,
  camera: THREE.PerspectiveCamera,
  playerPos: [number, number, number],
) {
  const store = useGameStore.getState();
  const input = inputManager;
  const camSettings = store.camera;
  const preset = PRESETS[camSettings.mode];
  const recoil = getRecoil();

  // ── Mouse look ────────────────────────────────────────────────────────────
  if (input.isPointerLocked) {
    const sens = camSettings.sensitivity;
    _yaw -= input.mouse.dx * sens;
    _pitch = Math.max(preset.pitchMin, Math.min(preset.pitchMax, _pitch + input.mouse.dy * sens));
  }

  // ── Recoil offset (from Unity TPS pov axis kick) ─────────────────────────
  _yaw += recoil.yaw;
  _pitch += recoil.pitch;

  // ── Camera reset key (R) — from CopperCube behavior_ThirdPersonCamera ────
  // Snaps the camera yaw to directly behind the player's facing direction.
  // Useful after spinning the camera freely to quickly re-center behind char.
  if (input.justPressed('KeyR') && !store.isReloading) {
    _yaw = getFacingAngle() + Math.PI;
  }

  // ── Scroll wheel zoom (distance adjust) ───────────────────────────────────
  if (input.mouse.wheel !== 0 && camSettings.mode !== 'fps') {
    const zoomDelta = input.mouse.wheel > 0 ? 0.5 : -0.5;
    _currentDist = Math.max(1.5, Math.min(12.0, _currentDist + zoomDelta));
  }

  // ── Camera shake decay ───────────────────────────────────────────────────
  _shakeDecay = Math.max(0, store.cameraShakeIntensity - dt * 3);
  store.setCameraShake(_shakeDecay);
  const shakeX = (Math.random() - 0.5) * _shakeDecay * 0.1;
  const shakeY = (Math.random() - 0.5) * _shakeDecay * 0.1;

  // ── Target parameters (lerp between normal and ADS) ──────────────────────
  let targetDist = preset.distance;
  let targetFov = preset.fov;
  let targetShX = preset.shoulderX * (camSettings.shoulderX >= 0 ? 1 : -1);

  if (store.isAiming && camSettings.mode !== 'fps') {
    targetDist = ADS_DISTANCE;
    targetFov = ADS_FOV;
    targetShX = ADS_SHOULDER_X * (camSettings.shoulderX >= 0 ? 1 : -1);
  }

  // Smooth transitions
  const lerpT = 1 - Math.pow(0.001, dt * ADS_LERP_SPEED);
  _currentDist = THREE.MathUtils.lerp(_currentDist, targetDist, lerpT);
  _currentFov = THREE.MathUtils.lerp(_currentFov, targetFov, lerpT);
  _currentShX = THREE.MathUtils.lerp(_currentShX, targetShX, lerpT);
  _currentShY = THREE.MathUtils.lerp(_currentShY, preset.shoulderY, lerpT);

  // ── Smooth base-height tracking (from CopperCube) ─────────────────────────
  // Slowly lerp _baseHeight toward the player's actual Y. This creates a
  // stable vertical reference point so the camera doesn't bounce on terrain.
  if (!_baseHeightInit) {
    _baseHeight = playerPos[1];
    _baseHeightInit = true;
  }
  _baseHeight += (playerPos[1] - _baseHeight) * HEIGHT_SMOOTH_FACTOR;

  // ── Smooth follow player (XZ from raw pos, Y from smoothed baseHeight) ────
  const targetPlayerPos = new THREE.Vector3(playerPos[0], _baseHeight, playerPos[2]);
  _smoothPlayerPos.lerp(targetPlayerPos, 1 - Math.pow(0.001, dt));

  // ── Compute camera position (spherical offset from player) ────────────────
  const cosPitch = Math.cos(_pitch);
  const sinPitch = Math.sin(_pitch);
  const cosYaw = Math.cos(_yaw);
  const sinYaw = Math.sin(_yaw);

  const camX = _smoothPlayerPos.x + sinYaw * cosPitch * _currentDist + cosYaw * _currentShX + shakeX;
  const camY = _smoothPlayerPos.y + _currentShY + sinPitch * _currentDist + shakeY;
  const camZ = _smoothPlayerPos.z + cosYaw * cosPitch * _currentDist - sinYaw * _currentShX;

  const targetCamPos = new THREE.Vector3(camX, camY, camZ);
  _smoothCamPos.lerp(targetCamPos, 1 - Math.pow(0.001, dt));

  // ── Apply ────────────────────────────────────────────────────────────────
  camera.position.copy(_smoothCamPos);
  // Focus point uses smoothed baseHeight + shoulderY (CopperCube pattern:
  // focusY = baseHeight + Height — the camera looks at a vertically
  // stable point, never bouncing with raw terrain Y)
  const focusY = _baseHeight + _currentShY * 0.7;
  camera.lookAt(_smoothPlayerPos.x, focusY, _smoothPlayerPos.z);
  camera.fov = _currentFov;
  camera.updateProjectionMatrix();

  // ── Sync yaw back to store for movement direction ────────────────────────
  store.setCameraRotation(_yaw, _pitch);
}

export function resetCameraController() {
  _yaw = 0;
  _pitch = 0.3;
  _currentFov = 70;
  _currentDist = 5.0;
  _currentShX = 0.52;
  _currentShY = 1.30;
  _shakeDecay = 0;
  _baseHeight = 0;
  _baseHeightInit = false;
  _smoothPlayerPos.set(0, 0, 0);
  _smoothCamPos.set(0, 5, 10);
}
