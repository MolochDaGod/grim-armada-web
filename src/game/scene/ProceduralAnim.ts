import * as THREE from 'three';

export interface AnimState {
  // Movement
  isMoving: boolean;
  moveSpeed: number; // 0-1
  // Combat
  isShooting: boolean;
  shootTimer: number;
  // Damage
  isHit: boolean;
  hitTimer: number;
  // Death
  isDead: boolean;
  deathTimer: number;
  // Internal accumulators
  bobTime: number;
  breathTime: number;
}

export function createAnimState(): AnimState {
  return {
    isMoving: false, moveSpeed: 0,
    isShooting: false, shootTimer: 0,
    isHit: false, hitTimer: 0,
    isDead: false, deathTimer: 0,
    bobTime: 0, breathTime: Math.random() * 6,
  };
}

// Apply procedural animation to a group (the model root)
export function updateProceduralAnim(
  group: THREE.Group,
  anim: AnimState,
  dt: number,
) {
  if (!group) return;

  anim.breathTime += dt;

  // ===== Death =====
  if (anim.isDead) {
    anim.deathTimer = Math.min(anim.deathTimer + dt * 2, 1);
    // Fall over sideways
    group.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, easeOutQuad(anim.deathTimer));
    group.position.y = THREE.MathUtils.lerp(0, -0.3, easeOutQuad(anim.deathTimer));
    return;
  }

  // Reset death rotation
  group.rotation.z = 0;

  // ===== Hit react =====
  if (anim.isHit) {
    anim.hitTimer += dt * 5;
    if (anim.hitTimer >= 1) {
      anim.isHit = false;
      anim.hitTimer = 0;
    }
    // Quick jerk backward
    const hitIntensity = Math.sin(anim.hitTimer * Math.PI) * 0.1;
    group.position.z += hitIntensity;
    group.rotation.x = -hitIntensity * 0.5;
  }

  // ===== Shoot recoil =====
  if (anim.isShooting) {
    anim.shootTimer += dt * 8;
    if (anim.shootTimer >= 1) {
      anim.isShooting = false;
      anim.shootTimer = 0;
    }
    // Kick back
    const recoil = Math.sin(anim.shootTimer * Math.PI) * 0.05;
    group.position.z += recoil;
    group.rotation.x = -recoil * 2;
  }

  // ===== Movement bob =====
  if (anim.isMoving) {
    anim.bobTime += dt * 8 * (0.5 + anim.moveSpeed * 0.5);
    const bob = Math.sin(anim.bobTime * 2) * 0.04 * anim.moveSpeed;
    const sway = Math.sin(anim.bobTime) * 0.015 * anim.moveSpeed;
    group.position.y = bob;
    group.rotation.z = sway;
  } else {
    anim.bobTime = 0;
    // Idle breathing
    const breath = Math.sin(anim.breathTime * 1.5) * 0.01;
    group.position.y = breath;
    group.rotation.z = 0;
  }
}

// Apply weapon-specific animation (recoil on the weapon attachment point)
export function updateWeaponAnim(
  weaponGroup: THREE.Group,
  anim: AnimState,
  dt: number,
) {
  if (!weaponGroup) return;

  if (anim.isShooting) {
    const kick = Math.sin(anim.shootTimer * Math.PI);
    weaponGroup.position.z = 0.05 * kick; // kick back
    weaponGroup.rotation.x = -0.15 * kick; // barrel rise
    weaponGroup.position.y = 0.02 * kick; // slight lift
  } else {
    weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, 0, dt * 10);
    weaponGroup.rotation.x = THREE.MathUtils.lerp(weaponGroup.rotation.x, 0, dt * 10);
    weaponGroup.position.y = THREE.MathUtils.lerp(weaponGroup.position.y, 0, dt * 10);
  }

  // Idle weapon sway
  if (!anim.isMoving && !anim.isShooting) {
    weaponGroup.rotation.z = Math.sin(anim.breathTime * 0.8) * 0.005;
  }
}

function easeOutQuad(t: number) { return t * (2 - t); }

// Trigger a shoot animation
export function triggerShoot(anim: AnimState) {
  anim.isShooting = true;
  anim.shootTimer = 0;
}

// Trigger a hit reaction
export function triggerHit(anim: AnimState) {
  anim.isHit = true;
  anim.hitTimer = 0;
}

// Trigger death
export function triggerDeath(anim: AnimState) {
  anim.isDead = true;
  anim.deathTimer = 0;
}
