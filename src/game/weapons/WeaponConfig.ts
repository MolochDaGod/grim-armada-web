/**
 * WeaponConfig — every tunable parameter for each weapon mode.
 * Ported from Motion WeaponConfig.ts.
 * Player.tsx, BulletSystem, WeaponTrail, and HUD all read from WEAPON_CONFIGS.
 */

import type { WeaponMode } from '../store';

export interface WeaponConfig {
  // Base damage & timing
  damage:       number;
  attackSpeed:  number;   // seconds between attacks (cooldown); 0 = melee combo-driven
  range:        number;   // effective reach (world units)
  hitArc:       number;   // melee sweep arc degrees; 0 for ranged
  knockback:    number;   // impulse strength on hit (0 = none)

  // Combo
  comboWindow:  number;   // seconds after attack anim ends to chain combo
  comboDmgDelay: number;  // ms into anim when damage fires

  // Projectile (ranged only)
  projectileSpeed:   number;
  projectileGravity: number;
  projectileLifetime: number;
  bulletHitRadius:   number;

  // Trail & VFX
  trailColor:   string;
  trailLength:  number;
  trailWidth:   number;
  muzzleFlash:  boolean;
  impactSparks: boolean;

  // Camera
  cameraShake:  number;

  // Ammo (ranged weapons)
  magSize:      number;
  totalAmmo:    number;
  reloadTime:   number;   // seconds

  // Recoil (ranged)
  verticalRecoil:   number;
  horizontalRecoil: number;
  crosshairSpread:  number;
}

export const WEAPON_CONFIGS: Record<WeaponMode, WeaponConfig> = {
  pistol: {
    damage: 30, attackSpeed: 0.12, range: 40, hitArc: 0, knockback: 0,
    comboWindow: 0, comboDmgDelay: 0,
    projectileSpeed: 35, projectileGravity: 0, projectileLifetime: 2.5, bulletHitRadius: 1.0,
    trailColor: '#ffdd44', trailLength: 12, trailWidth: 0.03, muzzleFlash: true, impactSparks: true,
    cameraShake: 0.15,
    magSize: 12, totalAmmo: 120, reloadTime: 1.5,
    verticalRecoil: 0.008, horizontalRecoil: 0.004, crosshairSpread: 3,
  },
  rifle: {
    damage: 35, attackSpeed: 0.18, range: 48, hitArc: 0, knockback: 0,
    comboWindow: 0, comboDmgDelay: 0,
    projectileSpeed: 50, projectileGravity: 0, projectileLifetime: 2.5, bulletHitRadius: 1.0,
    trailColor: '#aaffaa', trailLength: 16, trailWidth: 0.025, muzzleFlash: true, impactSparks: true,
    cameraShake: 0.25,
    magSize: 30, totalAmmo: 300, reloadTime: 2.0,
    verticalRecoil: 0.012, horizontalRecoil: 0.006, crosshairSpread: 4,
  },
  sword: {
    damage: 80, attackSpeed: 0, range: 2.6, hitArc: 120, knockback: 2.0,
    comboWindow: 0.70, comboDmgDelay: 350,
    projectileSpeed: 0, projectileGravity: 0, projectileLifetime: 0, bulletHitRadius: 0,
    trailColor: '#ccddff', trailLength: 8, trailWidth: 0.12, muzzleFlash: false, impactSparks: true,
    cameraShake: 0.3,
    magSize: 0, totalAmmo: 0, reloadTime: 0,
    verticalRecoil: 0, horizontalRecoil: 0, crosshairSpread: 0,
  },
  axe: {
    damage: 100, attackSpeed: 0, range: 2.8, hitArc: 90, knockback: 3.5,
    comboWindow: 0.70, comboDmgDelay: 400,
    projectileSpeed: 0, projectileGravity: 0, projectileLifetime: 0, bulletHitRadius: 0,
    trailColor: '#ff7755', trailLength: 8, trailWidth: 0.15, muzzleFlash: false, impactSparks: true,
    cameraShake: 0.4,
    magSize: 0, totalAmmo: 0, reloadTime: 0,
    verticalRecoil: 0, horizontalRecoil: 0, crosshairSpread: 0,
  },
  staff: {
    damage: 40, attackSpeed: 0, range: 3.0, hitArc: 60, knockback: 1.0,
    comboWindow: 0, comboDmgDelay: 480,
    projectileSpeed: 0, projectileGravity: 0, projectileLifetime: 0, bulletHitRadius: 0,
    trailColor: '#cc88ff', trailLength: 10, trailWidth: 0.08, muzzleFlash: false, impactSparks: false,
    cameraShake: 0.2,
    magSize: 0, totalAmmo: 0, reloadTime: 0,
    verticalRecoil: 0, horizontalRecoil: 0, crosshairSpread: 0,
  },
  bow: {
    damage: 45, attackSpeed: 0.9, range: 50, hitArc: 0, knockback: 1.5,
    comboWindow: 0, comboDmgDelay: 450,
    projectileSpeed: 28, projectileGravity: 4.5, projectileLifetime: 4.0, bulletHitRadius: 0.8,
    trailColor: '#aed67a', trailLength: 20, trailWidth: 0.02, muzzleFlash: false, impactSparks: true,
    cameraShake: 0.1,
    magSize: 20, totalAmmo: 100, reloadTime: 0,
    verticalRecoil: 0.005, horizontalRecoil: 0.002, crosshairSpread: 2,
  },
  shield: {
    damage: 50, attackSpeed: 0.45, range: 2.5, hitArc: 90, knockback: 4.0,
    comboWindow: 0.60, comboDmgDelay: 290,
    projectileSpeed: 0, projectileGravity: 0, projectileLifetime: 0, bulletHitRadius: 0,
    trailColor: '#8899cc', trailLength: 6, trailWidth: 0.10, muzzleFlash: false, impactSparks: true,
    cameraShake: 0.35,
    magSize: 0, totalAmmo: 0, reloadTime: 0,
    verticalRecoil: 0, horizontalRecoil: 0, crosshairSpread: 0,
  },
  fishingpole: {
    damage: 5, attackSpeed: 1.5, range: 4.0, hitArc: 45, knockback: 0.5,
    comboWindow: 0, comboDmgDelay: 600,
    projectileSpeed: 0, projectileGravity: 0, projectileLifetime: 0, bulletHitRadius: 0,
    trailColor: '#88bbdd', trailLength: 6, trailWidth: 0.02, muzzleFlash: false, impactSparks: false,
    cameraShake: 0,
    magSize: 0, totalAmmo: 0, reloadTime: 0,
    verticalRecoil: 0, horizontalRecoil: 0, crosshairSpread: 0,
  },
  sandstorm: {
    damage: 120, attackSpeed: 0, range: 3.2, hitArc: 130, knockback: 3.5,
    comboWindow: 0.65, comboDmgDelay: 380,
    projectileSpeed: 42, projectileGravity: 1.5, projectileLifetime: 3.0, bulletHitRadius: 1.2,
    trailColor: '#ffaa33', trailLength: 14, trailWidth: 0.14, muzzleFlash: true, impactSparks: true,
    cameraShake: 0.45,
    magSize: 6, totalAmmo: 60, reloadTime: 2.5,
    verticalRecoil: 0.02, horizontalRecoil: 0.015, crosshairSpread: 6,
  },
};

export function getWeaponConfig(mode: WeaponMode): WeaponConfig {
  return WEAPON_CONFIGS[mode];
}

/** Is this weapon mode a ranged weapon? */
export function isRangedWeapon(mode: WeaponMode): boolean {
  return WEAPON_CONFIGS[mode].projectileSpeed > 0;
}

/** Is this weapon mode a melee weapon? */
export function isMeleeWeapon(mode: WeaponMode): boolean {
  return WEAPON_CONFIGS[mode].hitArc > 0 && WEAPON_CONFIGS[mode].projectileSpeed === 0;
}
