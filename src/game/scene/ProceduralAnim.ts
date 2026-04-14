import * as THREE from 'three';

export interface AnimState {
  // Movement
  isMoving: boolean;
  moveSpeed: number; // 0-1
  isSprinting: boolean;
  moveDir: number; // radians — direction of movement relative to facing
  // Combat
  isShooting: boolean;
  shootTimer: number;
  isAttacking: boolean;
  attackTimer: number;
  attackCombo: number; // 0-2 for combo chain
  // Defense
  isBlocking: boolean;
  blockTimer: number;
  isDodging: boolean;
  dodgeTimer: number;
  dodgeDir: number; // -1 left, 0 back, 1 right
  isStaggered: boolean;
  staggerTimer: number;
  // Damage
  isHit: boolean;
  hitTimer: number;
  hitDir: number; // direction hit came from
  // Death
  isDead: boolean;
  deathTimer: number;
  // Internal accumulators
  bobTime: number;
  breathTime: number;
  combatStance: number; // 0-1 blend into combat idle
}

export function createAnimState(): AnimState {
  return {
    isMoving: false, moveSpeed: 0, isSprinting: false, moveDir: 0,
    isShooting: false, shootTimer: 0,
    isAttacking: false, attackTimer: 0, attackCombo: 0,
    isBlocking: false, blockTimer: 0,
    isDodging: false, dodgeTimer: 0, dodgeDir: 0,
    isStaggered: false, staggerTimer: 0,
    isHit: false, hitTimer: 0, hitDir: 0,
    isDead: false, deathTimer: 0,
    bobTime: 0, breathTime: Math.random() * 6,
    combatStance: 0,
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
    const t = easeOutQuad(anim.deathTimer);
    // Crumple: lean forward, then fall sideways
    group.rotation.x = THREE.MathUtils.lerp(0, 0.3, Math.min(t * 3, 1));
    group.rotation.z = THREE.MathUtils.lerp(0, Math.PI / 2, t);
    group.position.y = THREE.MathUtils.lerp(0, -0.4, t);
    // Sink slightly
    group.scale.y = THREE.MathUtils.lerp(1, 0.85, t);
    return;
  }

  // Reset death state
  group.rotation.z = 0;
  group.scale.y = 1;

  // ===== Dodge roll =====
  if (anim.isDodging) {
    anim.dodgeTimer += dt * 4;
    if (anim.dodgeTimer >= 1) {
      anim.isDodging = false;
      anim.dodgeTimer = 0;
    }
    const t = anim.dodgeTimer;
    const rollArc = Math.sin(t * Math.PI);
    // Roll direction
    if (anim.dodgeDir !== 0) {
      // Side roll
      group.rotation.z = anim.dodgeDir * rollArc * Math.PI * 0.6;
      group.position.x = anim.dodgeDir * rollArc * 0.3;
    } else {
      // Back roll
      group.rotation.x = -rollArc * Math.PI * 0.5;
      group.position.z = rollArc * 0.4;
    }
    group.position.y = rollArc * 0.15; // slight lift
    group.scale.y = 1 - rollArc * 0.15; // crouch during roll
    return;
  }

  // ===== Stagger =====
  if (anim.isStaggered) {
    anim.staggerTimer += dt * 3;
    if (anim.staggerTimer >= 1) {
      anim.isStaggered = false;
      anim.staggerTimer = 0;
    }
    const t = anim.staggerTimer;
    const staggerShake = Math.sin(t * Math.PI * 4) * (1 - t) * 0.06;
    group.position.x = staggerShake;
    group.rotation.z = staggerShake * 2;
    group.rotation.x = -Math.sin(t * Math.PI) * 0.15;
    return;
  }

  // ===== Block stance =====
  if (anim.isBlocking) {
    anim.blockTimer = Math.min(anim.blockTimer + dt * 6, 1);
    const t = easeOutQuad(anim.blockTimer);
    group.rotation.x = -0.08 * t;
    group.position.y = -0.05 * t;
    group.scale.y = 1 - 0.05 * t; // slight crouch
  } else if (anim.blockTimer > 0) {
    anim.blockTimer = Math.max(anim.blockTimer - dt * 4, 0);
    const t = easeOutQuad(anim.blockTimer);
    group.rotation.x = -0.08 * t;
    group.position.y = -0.05 * t;
  }

  // ===== Melee Attack =====
  if (anim.isAttacking) {
    anim.attackTimer += dt * 5;
    if (anim.attackTimer >= 1) {
      anim.isAttacking = false;
      anim.attackTimer = 0;
    }
    const t = anim.attackTimer;
    const swing = Math.sin(t * Math.PI);
    // Combo variations
    if (anim.attackCombo === 0) {
      // Right swing
      group.rotation.y = swing * 0.4;
      group.rotation.x = -swing * 0.12;
      group.position.z = -swing * 0.08;
    } else if (anim.attackCombo === 1) {
      // Left swing
      group.rotation.y = -swing * 0.45;
      group.rotation.x = -swing * 0.1;
      group.position.z = -swing * 0.1;
    } else {
      // Overhead slam
      group.rotation.x = -swing * 0.35;
      group.position.y = swing * 0.08;
      group.position.z = -swing * 0.15;
    }
    return;
  }

  // ===== Hit react =====
  if (anim.isHit) {
    anim.hitTimer += dt * 5;
    if (anim.hitTimer >= 1) {
      anim.isHit = false;
      anim.hitTimer = 0;
    }
    const hitIntensity = Math.sin(anim.hitTimer * Math.PI);
    // Directional hit react
    group.position.z += hitIntensity * 0.08;
    group.rotation.x = -hitIntensity * 0.12;
    group.rotation.z = hitIntensity * anim.hitDir * 0.06;
    // Quick flash-squash
    group.scale.x = 1 + hitIntensity * 0.03;
    group.scale.z = 1 - hitIntensity * 0.03;
  }

  // ===== Shoot recoil =====
  if (anim.isShooting) {
    anim.shootTimer += dt * 8;
    if (anim.shootTimer >= 1) {
      anim.isShooting = false;
      anim.shootTimer = 0;
    }
    const recoil = Math.sin(anim.shootTimer * Math.PI) * 0.05;
    group.position.z += recoil;
    group.rotation.x = -recoil * 2;
    // Slight shoulder twist
    group.rotation.y = Math.sin(anim.shootTimer * Math.PI * 2) * 0.02;
  }

  // ===== Movement =====
  if (anim.isMoving) {
    const sprintMul = anim.isSprinting ? 1.5 : 1;
    anim.bobTime += dt * 8 * (0.5 + anim.moveSpeed * 0.5) * sprintMul;
    const bob = Math.sin(anim.bobTime * 2) * 0.04 * anim.moveSpeed * sprintMul;
    const sway = Math.sin(anim.bobTime) * 0.015 * anim.moveSpeed;
    group.position.y = bob;
    group.rotation.z = sway;
    // Forward lean when sprinting
    if (anim.isSprinting) {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -0.08, dt * 4);
    } else {
      group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, 0, dt * 6);
    }
    // Subtle arm pump via scale
    group.scale.x = 1 + Math.sin(anim.bobTime * 2) * 0.01 * anim.moveSpeed;
    group.scale.z = 1 - Math.sin(anim.bobTime * 2) * 0.01 * anim.moveSpeed;
  } else {
    anim.bobTime = 0;
    // Idle breathing — more pronounced in combat stance
    const breathAmp = 0.01 + anim.combatStance * 0.008;
    const breath = Math.sin(anim.breathTime * 1.5) * breathAmp;
    group.position.y = breath;
    group.rotation.z = 0;
    group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, -anim.combatStance * 0.04, dt * 4);
    // Reset scale
    group.scale.x = THREE.MathUtils.lerp(group.scale.x, 1, dt * 8);
    group.scale.z = THREE.MathUtils.lerp(group.scale.z, 1, dt * 8);
  }

  // Combat stance blend
  anim.combatStance = THREE.MathUtils.lerp(
    anim.combatStance,
    (anim.isShooting || anim.isAttacking || anim.isBlocking) ? 1 : 0,
    dt * 3,
  );
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
    weaponGroup.position.z = 0.05 * kick;
    weaponGroup.rotation.x = -0.15 * kick;
    weaponGroup.position.y = 0.02 * kick;
  } else if (anim.isAttacking) {
    const swing = Math.sin(anim.attackTimer * Math.PI);
    if (anim.attackCombo === 2) {
      // Overhead: weapon swings down
      weaponGroup.rotation.x = -swing * 1.5;
      weaponGroup.position.y = swing * 0.2;
    } else {
      // Side swings
      const dir = anim.attackCombo === 0 ? 1 : -1;
      weaponGroup.rotation.z = dir * swing * 0.8;
      weaponGroup.rotation.x = -swing * 0.3;
    }
  } else {
    weaponGroup.position.z = THREE.MathUtils.lerp(weaponGroup.position.z, 0, dt * 10);
    weaponGroup.rotation.x = THREE.MathUtils.lerp(weaponGroup.rotation.x, 0, dt * 10);
    weaponGroup.position.y = THREE.MathUtils.lerp(weaponGroup.position.y, 0, dt * 10);
    weaponGroup.rotation.z = THREE.MathUtils.lerp(weaponGroup.rotation.z, 0, dt * 10);
  }

  // Idle weapon sway
  if (!anim.isMoving && !anim.isShooting && !anim.isAttacking) {
    weaponGroup.rotation.z = Math.sin(anim.breathTime * 0.8) * 0.005;
  }
}

function easeOutQuad(t: number) { return t * (2 - t); }

// Trigger a shoot animation
export function triggerShoot(anim: AnimState) {
  anim.isShooting = true;
  anim.shootTimer = 0;
}

// Trigger a melee attack (with combo chain)
export function triggerAttack(anim: AnimState) {
  if (anim.isAttacking && anim.attackTimer > 0.4) {
    // Chain combo
    anim.attackCombo = (anim.attackCombo + 1) % 3;
  }
  anim.isAttacking = true;
  anim.attackTimer = 0;
}

// Trigger a dodge roll
export function triggerDodge(anim: AnimState, dir = 0) {
  if (anim.isDodging) return;
  anim.isDodging = true;
  anim.dodgeTimer = 0;
  anim.dodgeDir = dir; // -1 left, 0 back, 1 right
}

// Trigger block
export function triggerBlock(anim: AnimState, active: boolean) {
  anim.isBlocking = active;
}

// Trigger stagger (heavy hit)
export function triggerStagger(anim: AnimState) {
  anim.isStaggered = true;
  anim.staggerTimer = 0;
}

// Trigger a hit reaction
export function triggerHit(anim: AnimState, fromDir = 0) {
  anim.isHit = true;
  anim.hitTimer = 0;
  anim.hitDir = fromDir || ((Math.random() - 0.5) * 2);
}

// Trigger death
export function triggerDeath(anim: AnimState) {
  anim.isDead = true;
  anim.deathTimer = 0;
}
