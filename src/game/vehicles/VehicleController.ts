/**
 * VehicleController — enter/exit vehicle proximity + flying mount toggle.
 * Sketchbook-inspired state machine adapted for Rapier.
 * Vehicles are stub/placeholder until full Rapier car physics is implemented.
 */

import * as THREE from 'three';
import { useGameStore } from '../store';
import { inputManager } from '../player/InputManager';

// Vehicle spawn positions across the map
export const VEHICLE_SPAWNS: { pos: [number, number, number]; type: 'buggy' | 'transport' }[] = [
  { pos: [ 40, 0,  40], type: 'buggy' },
  { pos: [-40, 0,  40], type: 'buggy' },
  { pos: [ 40, 0, -40], type: 'transport' },
  { pos: [-40, 0, -40], type: 'buggy' },
];

export interface VehicleState {
  id: string;
  type: 'buggy' | 'transport';
  position: THREE.Vector3;
  rotation: number;
  occupied: boolean;
}

const ENTER_RANGE = 4; // world units proximity to enter

let _vehicles: VehicleState[] = [];

export function initVehicles() {
  _vehicles = VEHICLE_SPAWNS.map((v, i) => ({
    id: `vehicle-${i}`,
    type: v.type,
    position: new THREE.Vector3(v.pos[0], v.pos[1], v.pos[2]),
    rotation: 0,
    occupied: false,
  }));
}

export function getVehicles() { return _vehicles; }

/**
 * Tick vehicle interactions. Call every frame.
 * Handles F key enter/exit and flying mount toggle.
 */
export function vehicleControllerTick(playerPos: [number, number, number]) {
  const store = useGameStore.getState();
  const input = inputManager;

  if (!input.keys.mount) return;
  input.keys.mount = false;

  // ── Flying mount toggle ────────────────────────────────────────────────
  if (store.isMounted) {
    store.setMounted(false);
    return;
  }

  // ── Vehicle enter/exit ─────────────────────────────────────────────────
  if (store.isInVehicle) {
    // Exit current vehicle
    store.setInVehicle(false);
    _vehicles.forEach(v => { if (v.occupied) v.occupied = false; });
    return;
  }

  // Check proximity to any vehicle
  const pp = new THREE.Vector3(playerPos[0], playerPos[1], playerPos[2]);
  for (const v of _vehicles) {
    if (v.occupied) continue;
    if (pp.distanceTo(v.position) < ENTER_RANGE) {
      v.occupied = true;
      store.setInVehicle(true);
      return;
    }
  }

  // No vehicle nearby — toggle flying mount
  store.setMounted(true);
}

export function resetVehicles() {
  _vehicles = [];
}
