/**
 * WeaponIK — attach weapons to skeleton hand bones with aim offset.
 * Grudge bone naming: R_hand_container, mixamo: RightHand, etc.
 */

import * as THREE from 'three';

const RIGHT_HAND_PATTERNS = [
  /^R_hand_container$/i,
  /mixamorig:righthand$/i,
  /right.?hand/i,
  /hand\.?r/i,
  /weapon_r/i,
];
const LEFT_HAND_PATTERNS = [
  /^L_hand_container$/i,
  /mixamorig:lefthand$/i,
  /left.?hand/i,
  /hand\.?l/i,
];

export interface WeaponAttachConfig {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

const DEFAULT_ATTACH: WeaponAttachConfig = {
  position: [0.02, 0.0, 0.0],
  rotation: [-Math.PI / 2, 0, 0],
  scale: 1,
};

/** Find a hand bone inside a loaded GLTF scene. */
export function findHandBone(root: THREE.Object3D, side: 'right' | 'left' = 'right'): THREE.Bone | null {
  const patterns = side === 'right' ? RIGHT_HAND_PATTERNS : LEFT_HAND_PATTERNS;
  let found: THREE.Bone | null = null;
  root.traverse((obj) => {
    if (found) return;
    if (obj instanceof THREE.Bone && patterns.some((re) => re.test(obj.name))) {
      found = obj;
    }
  });
  return found;
}

/** Find first SkinnedMesh skeleton in scene. */
export function findSkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
  let mesh: THREE.SkinnedMesh | null = null;
  root.traverse((obj) => {
    if (!mesh && obj instanceof THREE.SkinnedMesh && obj.skeleton) mesh = obj;
  });
  return mesh;
}

/**
 * Parent weapon group to hand bone (or fallback offset group).
 * Returns cleanup function.
 */
export function attachWeaponToHand(
  characterRoot: THREE.Object3D,
  weaponGroup: THREE.Object3D,
  config: WeaponAttachConfig = DEFAULT_ATTACH,
): () => void {
  const bone = findHandBone(characterRoot, 'right');
  const cfg = { ...DEFAULT_ATTACH, ...config };

  weaponGroup.position.set(...(cfg.position ?? [0, 0, 0]));
  weaponGroup.rotation.set(...(cfg.rotation ?? [0, 0, 0]));
  if (cfg.scale) weaponGroup.scale.setScalar(cfg.scale);

  if (bone) {
    bone.add(weaponGroup);
    return () => { bone.remove(weaponGroup); };
  }

  // Fallback: static offset on character (TPS placeholder)
  characterRoot.add(weaponGroup);
  weaponGroup.position.set(0.45, 1.05, -0.15);
  return () => { characterRoot.remove(weaponGroup); };
}

/**
 * Per-frame aim tilt — subtle weapon pitch toward camera pitch.
 */
export function weaponIKTilt(
  weaponGroup: THREE.Object3D,
  cameraPitch: number,
  aiming: boolean,
  dt: number,
) {
  const targetPitch = aiming ? cameraPitch * 0.35 : cameraPitch * 0.1;
  weaponGroup.rotation.x += (targetPitch - weaponGroup.rotation.x) * Math.min(1, dt * 12);
}