/**
 * WeaponManager — per-frame weapon state machine.
 * Handles fire timing, reload, combo chains, ammo, recoil, crosshair spread.
 * Ported from Motion Player.tsx weapon handling + Unity TPS WeaponManager.cs.
 */

import { useGameStore, type WeaponMode } from '../store';
import { getWeaponConfig, isRangedWeapon, isMeleeWeapon, type WeaponConfig } from './WeaponConfig';
import { getWeaponSkills, type SkillDef } from './SkillSystem';
import { inputManager } from '../player/InputManager';

// ── Internal state (not in Zustand for perf — mutated every frame) ──────────
let _lastFireTime = 0;
let _comboStep = 0;         // 0,1,2 for melee combo chain
let _comboTimer = 0;        // seconds remaining in combo window
let _recoilYaw = 0;
let _recoilPitch = 0;
let _crosshairSpread = 0;   // current spread in pixels
const MIN_SPREAD = 20;
const MAX_SPREAD = 80;
const SPREAD_DECAY = 60;    // pixels/sec shrink rate
const MANA_REGEN_RATE = 5;  // per second

export function getRecoil() { return { yaw: _recoilYaw, pitch: _recoilPitch }; }
export function getCrosshairSpread() { return _crosshairSpread; }
export function getComboStep() { return _comboStep; }

/**
 * Call every frame from the game loop.
 * Returns true if a fire event occurred this frame.
 */
export function weaponManagerTick(dt: number): { fired: boolean; meleeHit: boolean; skillUsed: SkillDef | null } {
  const store = useGameStore.getState();
  const cfg = getWeaponConfig(store.weaponMode);
  const input = inputManager;
  let fired = false;
  let meleeHit = false;
  let skillUsed: SkillDef | null = null;

  // ── Weapon cycling (Q key) ──────────────────────────────────────────────
  if (input.keys.cycleWeapon) {
    store.cycleWeapon();
    input.keys.cycleWeapon = false;
    _comboStep = 0;
    _comboTimer = 0;
  }

  // ── Mode toggle (Tab) ──────────────────────────────────────────────────
  if (input.keys.tab) {
    store.togglePlayerMode();
    input.keys.tab = false;
  }

  // ── Aim (RMB toggle) ──────────────────────────────────────────────────
  if (input.mouse.rmb && isRangedWeapon(store.weaponMode)) {
    if (!store.isAiming) store.setAiming(true);
  } else if (!input.mouse.rmb && store.isAiming) {
    store.setAiming(false);
  }

  // ── Block (RMB for melee) ──────────────────────────────────────────────
  if (input.mouse.rmb && isMeleeWeapon(store.weaponMode)) {
    store.setMeleeBlocking(true);
  } else {
    store.setMeleeBlocking(false);
  }

  // ── Shoulder swap (V) ─────────────────────────────────────────────────
  if (input.keys.shoulderSwap) {
    store.setShoulderSwap();
    input.keys.shoulderSwap = false;
  }

  // ── Reload (R) ────────────────────────────────────────────────────────
  if (input.keys.reload && isRangedWeapon(store.weaponMode) && !store.isReloading) {
    store.reload();
    input.keys.reload = false;
  }

  // ── Ranged fire (LMB while aiming) ────────────────────────────────────
  const now = performance.now() / 1000;
  if (input.mouse.lmb && isRangedWeapon(store.weaponMode) && store.playerMode === 'combat') {
    if (!store.isReloading && now - _lastFireTime >= cfg.attackSpeed) {
      if (store.shoot()) {
        _lastFireTime = now;
        fired = true;

        // Recoil kick (from Unity TPS pov.m_VerticalAxis.Value -= VerticalRecoil)
        _recoilPitch -= cfg.verticalRecoil;
        _recoilYaw += (Math.random() - 0.5) * cfg.horizontalRecoil * 2;
        _crosshairSpread = Math.min(MAX_SPREAD, _crosshairSpread + cfg.crosshairSpread);

        // Camera shake
        store.setCameraShake(cfg.cameraShake);
      }
    }
  }

  // ── Melee attack (LMB) ────────────────────────────────────────────────
  if (input.mouse.lmb && isMeleeWeapon(store.weaponMode) && store.playerMode === 'combat' && !store.meleeBlocking) {
    if (_comboTimer > 0) {
      // Chain combo
      _comboStep = (_comboStep + 1) % 3;
      _comboTimer = cfg.comboWindow;
    } else if (now - _lastFireTime >= 0.4) {
      _comboStep = 0;
      _comboTimer = cfg.comboWindow;
    }
    _lastFireTime = now;
    meleeHit = true;
    store.setCameraShake(cfg.cameraShake);
  }

  // ── Combo timer decay ─────────────────────────────────────────────────
  if (_comboTimer > 0) {
    _comboTimer -= dt;
    if (_comboTimer <= 0) { _comboStep = 0; _comboTimer = 0; }
  }

  // ── Skill keys 1-4 ───────────────────────────────────────────────────
  const skills = getWeaponSkills(store.weaponMode);
  const skillKeys = [input.keys.skill1, input.keys.skill2, input.keys.skill3, input.keys.skill4];
  for (let i = 0; i < 4; i++) {
    if (skillKeys[i]) {
      const skill = skills[i];
      const cd = store.skillCooldowns[skill.id] ?? 0;
      if (cd <= 0 && store.useMana(skill.manaCost)) {
        store.setSkillCooldown(skill.id, skill.cooldown);
        skillUsed = skill;
        store.setCameraShake(0.2);
      }
    }
  }

  // ── Tick skill cooldowns ──────────────────────────────────────────────
  store.tickSkillCooldowns(dt);

  // ── Mana regen ────────────────────────────────────────────────────────
  store.regenMana(MANA_REGEN_RATE * dt);

  // ── Recoil decay ──────────────────────────────────────────────────────
  _recoilYaw *= Math.max(0, 1 - dt * 10);
  _recoilPitch *= Math.max(0, 1 - dt * 10);

  // ── Crosshair spread decay ────────────────────────────────────────────
  const isMoving = input.keys.forward || input.keys.backward || input.keys.left || input.keys.right;
  if (isMoving) {
    _crosshairSpread = Math.min(MAX_SPREAD, _crosshairSpread + dt * 15);
  } else {
    _crosshairSpread = Math.max(MIN_SPREAD, _crosshairSpread - SPREAD_DECAY * dt);
  }

  return { fired, meleeHit, skillUsed };
}

/** Reset weapon manager state (e.g. on game reset) */
export function resetWeaponManager() {
  _lastFireTime = 0;
  _comboStep = 0;
  _comboTimer = 0;
  _recoilYaw = 0;
  _recoilPitch = 0;
  _crosshairSpread = MIN_SPREAD;
}
