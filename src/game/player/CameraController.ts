/**
 * CameraController — TPS/Action/FPS camera with ADS zoom.
 * Ported from Motion useGameStore CameraSettings + Unity TPS PlayerAim.cs.
 *
 * Call `cameraControllerTick(dt, camera, playerPos)` each frame inside useFrame.
 */

import * as THREE from 'three';
import { useGameStore } from '../store';
import { inputManager } from './InputManager';
import { getRecoil } from '../weapons/WeaponManager';

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

  // ── Smooth follow player ─────────────────────────────────────────────────
  const targetPlayerPos = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
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
  camera.lookAt(_smoothPlayerPos.x, _smoothPlayerPos.y + _currentShY * 0.7, _smoothPlayerPos.z);
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
  _smoothPlayerPos.set(0, 0, 0);
  _smoothCamPos.set(0, 5, 10);
}
