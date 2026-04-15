/**
 * SkillSystem — 4 skills per weapon mode (36 total).
 * Ported from Motion SkillSystem.ts.
 * Each skill has animation, cooldown, mana cost, damage, hit shape, and VFX config.
 */

import type { WeaponMode } from '../store';

export type SkillEffectType = 'slash' | 'blast' | 'volley' | 'buff';
export type HitShape = 'capsule' | 'sphere' | 'ray';

export interface SkillDef {
  id:          string;
  name:        string;
  icon:        string;
  description: string;
  cooldown:    number;    // seconds
  manaCost:    number;
  damage:      number;
  range:       number;
  arcDeg:      number;    // sweep arc width (360 = full sphere/aoe)
  dmgDelayMs:  number;    // ms after activation before first hit check
  hitShape:    HitShape;
  hitCount:    number;    // sequential damage instances
  effect:      SkillEffectType;
  effectColor: string;
  effectRadius: number;
}

export const WEAPON_SKILLS: Record<WeaponMode, [SkillDef, SkillDef, SkillDef, SkillDef]> = {
  pistol: [
    { id: 'pistol_1', name: 'Fan the Hammer', icon: '🔫', description: '3 rapid shots', cooldown: 3, manaCost: 0, damage: 28, range: 40, arcDeg: 6, dmgDelayMs: 60, hitShape: 'ray', hitCount: 3, effect: 'volley', effectColor: '#ffcc44', effectRadius: 0.4 },
    { id: 'pistol_2', name: 'Snapshot', icon: '🎯', description: 'Precision aimed shot — 2× damage', cooldown: 5, manaCost: 0, damage: 65, range: 55, arcDeg: 3, dmgDelayMs: 280, hitShape: 'ray', hitCount: 1, effect: 'slash', effectColor: '#80cfff', effectRadius: 0.5 },
    { id: 'pistol_3', name: 'Pistol Whip', icon: '👊', description: 'Melee butt strike — knockback', cooldown: 6, manaCost: 0, damage: 45, range: 2.5, arcDeg: 90, dmgDelayMs: 300, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#ffaa44', effectRadius: 1.5 },
    { id: 'pistol_4', name: 'Smoke & Fire', icon: '💨', description: 'Dodge back + 2-shot burst', cooldown: 8, manaCost: 5, damage: 24, range: 32, arcDeg: 20, dmgDelayMs: 200, hitShape: 'ray', hitCount: 2, effect: 'blast', effectColor: '#88aaff', effectRadius: 2.0 },
  ],
  rifle: [
    { id: 'rifle_1', name: 'Full Auto', icon: '⚡', description: '5-round rapid burst', cooldown: 4, manaCost: 0, damage: 22, range: 48, arcDeg: 5, dmgDelayMs: 70, hitShape: 'ray', hitCount: 5, effect: 'volley', effectColor: '#aaffaa', effectRadius: 0.3 },
    { id: 'rifle_2', name: 'Precision Shot', icon: '🎯', description: 'Single devastating shot — 3× damage', cooldown: 6, manaCost: 0, damage: 95, range: 60, arcDeg: 2, dmgDelayMs: 700, hitShape: 'ray', hitCount: 1, effect: 'slash', effectColor: '#ff4444', effectRadius: 0.5 },
    { id: 'rifle_3', name: 'Suppressive Fire', icon: '🌊', description: 'Wide 50° arc spray', cooldown: 7, manaCost: 0, damage: 18, range: 16, arcDeg: 50, dmgDelayMs: 90, hitShape: 'capsule', hitCount: 4, effect: 'blast', effectColor: '#aaffaa', effectRadius: 4.0 },
    { id: 'rifle_4', name: 'Rifle Butt', icon: '💥', description: 'Close-range melee butt strike', cooldown: 5, manaCost: 0, damage: 55, range: 2.0, arcDeg: 80, dmgDelayMs: 340, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#ccddff', effectRadius: 1.2 },
  ],
  sword: [
    { id: 'sword_1', name: 'Cleave', icon: '⚔️', description: 'Wide 150° arc slash', cooldown: 3, manaCost: 0, damage: 75, range: 3.2, arcDeg: 150, dmgDelayMs: 320, hitShape: 'capsule', hitCount: 1, effect: 'slash', effectColor: '#ffaa55', effectRadius: 3.2 },
    { id: 'sword_2', name: 'Whirlwind', icon: '🌀', description: '360° spinning combo — 3 hits', cooldown: 8, manaCost: 10, damage: 45, range: 3.5, arcDeg: 360, dmgDelayMs: 180, hitShape: 'sphere', hitCount: 3, effect: 'slash', effectColor: '#ff6600', effectRadius: 3.5 },
    { id: 'sword_3', name: 'Lunge', icon: '⚡', description: 'Forward dash + overhead strike', cooldown: 5, manaCost: 5, damage: 90, range: 4.5, arcDeg: 55, dmgDelayMs: 400, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#ffdd88', effectRadius: 2.2 },
    { id: 'sword_4', name: 'Execute', icon: '💀', description: 'Devastating finisher — massive damage', cooldown: 12, manaCost: 15, damage: 145, range: 2.8, arcDeg: 90, dmgDelayMs: 600, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#ff3300', effectRadius: 2.5 },
  ],
  axe: [
    { id: 'axe_1', name: 'Overhead Chop', icon: '🪓', description: 'Heavy downward chop', cooldown: 4, manaCost: 0, damage: 105, range: 2.8, arcDeg: 90, dmgDelayMs: 500, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#ff7777', effectRadius: 2.0 },
    { id: 'axe_2', name: 'Axe Throw', icon: '🌀', description: 'Hurl the axe as a ranged projectile', cooldown: 7, manaCost: 0, damage: 70, range: 30, arcDeg: 7, dmgDelayMs: 380, hitShape: 'ray', hitCount: 1, effect: 'volley', effectColor: '#ff5555', effectRadius: 0.7 },
    { id: 'axe_3', name: 'Ground Slam', icon: '💥', description: 'AoE shockwave from feet', cooldown: 9, manaCost: 10, damage: 60, range: 4.5, arcDeg: 360, dmgDelayMs: 380, hitShape: 'sphere', hitCount: 1, effect: 'blast', effectColor: '#ff4400', effectRadius: 4.5 },
    { id: 'axe_4', name: 'Berserker Fury', icon: '😡', description: 'Rapid 4-hit frenzy attack', cooldown: 10, manaCost: 20, damage: 38, range: 2.5, arcDeg: 120, dmgDelayMs: 110, hitShape: 'capsule', hitCount: 4, effect: 'slash', effectColor: '#ff0000', effectRadius: 2.5 },
  ],
  staff: [
    { id: 'staff_1', name: 'Arcane Bolt', icon: '🔮', description: 'Fast orb of arcane energy', cooldown: 1, manaCost: 20, damage: 40, range: 30, arcDeg: 5, dmgDelayMs: 430, hitShape: 'ray', hitCount: 1, effect: 'blast', effectColor: '#FFE600', effectRadius: 1.2 },
    { id: 'staff_2', name: 'Chain Lightning', icon: '⚡', description: 'Fork lightning — hits up to 3 targets', cooldown: 5, manaCost: 40, damage: 35, range: 10, arcDeg: 360, dmgDelayMs: 300, hitShape: 'sphere', hitCount: 3, effect: 'blast', effectColor: '#aaccff', effectRadius: 10 },
    { id: 'staff_3', name: 'Arcane Beam', icon: '🌟', description: 'Sustained beam — 6 damage ticks', cooldown: 8, manaCost: 50, damage: 18, range: 15, arcDeg: 5, dmgDelayMs: 100, hitShape: 'ray', hitCount: 6, effect: 'slash', effectColor: '#cc88ff', effectRadius: 0.5 },
    { id: 'staff_4', name: 'Mana Surge', icon: '💫', description: 'Massive nova burst — full mana cost', cooldown: 15, manaCost: 75, damage: 100, range: 8, arcDeg: 360, dmgDelayMs: 680, hitShape: 'sphere', hitCount: 1, effect: 'blast', effectColor: '#ff88ff', effectRadius: 8.0 },
  ],
  bow: [
    { id: 'bow_1', name: 'Rapid Volley', icon: '🏹', description: '3 quick arrows', cooldown: 4, manaCost: 0, damage: 30, range: 42, arcDeg: 12, dmgDelayMs: 90, hitShape: 'ray', hitCount: 3, effect: 'volley', effectColor: '#aed67a', effectRadius: 0.4 },
    { id: 'bow_2', name: 'Power Shot', icon: '💪', description: 'Full draw — 3× damage, extreme range', cooldown: 6, manaCost: 5, damage: 110, range: 70, arcDeg: 2, dmgDelayMs: 920, hitShape: 'ray', hitCount: 1, effect: 'slash', effectColor: '#88ff44', effectRadius: 0.7 },
    { id: 'bow_3', name: 'Spread Shot', icon: '🌊', description: '5 arrows in a wide 40° fan', cooldown: 5, manaCost: 5, damage: 22, range: 18, arcDeg: 40, dmgDelayMs: 300, hitShape: 'capsule', hitCount: 5, effect: 'volley', effectColor: '#ccff88', effectRadius: 3.2 },
    { id: 'bow_4', name: 'Rain of Arrows', icon: '☔', description: '8-arrow barrage over a wide area', cooldown: 12, manaCost: 20, damage: 28, range: 5.5, arcDeg: 360, dmgDelayMs: 500, hitShape: 'sphere', hitCount: 8, effect: 'blast', effectColor: '#88cc44', effectRadius: 5.0 },
  ],
  shield: [
    { id: 'shield_1', name: 'Shield Bash', icon: '🛡️', description: 'Stun and push back nearby enemies', cooldown: 4, manaCost: 0, damage: 40, range: 2.5, arcDeg: 90, dmgDelayMs: 290, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#c0c8d8', effectRadius: 2.5 },
    { id: 'shield_2', name: 'Riposte', icon: '⚔️', description: 'Counter-attack after blocking', cooldown: 5, manaCost: 0, damage: 95, range: 2.8, arcDeg: 60, dmgDelayMs: 340, hitShape: 'capsule', hitCount: 1, effect: 'slash', effectColor: '#80aaff', effectRadius: 2.0 },
    { id: 'shield_3', name: 'Spinning Strike', icon: '🌀', description: '360° whirlwind with sword and shield', cooldown: 8, manaCost: 10, damage: 55, range: 3.5, arcDeg: 360, dmgDelayMs: 250, hitShape: 'sphere', hitCount: 2, effect: 'slash', effectColor: '#8899ff', effectRadius: 3.5 },
    { id: 'shield_4', name: 'Rally', icon: '✨', description: 'Draw on resilience — restore 30 HP', cooldown: 20, manaCost: 20, damage: 0, range: 0, arcDeg: 0, dmgDelayMs: 0, hitShape: 'sphere', hitCount: 0, effect: 'buff', effectColor: '#44ffaa', effectRadius: 2.0 },
  ],
  fishingpole: [
    { id: 'fish_1', name: 'Cast Line', icon: '🎣', description: 'Cast your fishing line', cooldown: 2, manaCost: 0, damage: 0, range: 6, arcDeg: 15, dmgDelayMs: 600, hitShape: 'ray', hitCount: 0, effect: 'buff', effectColor: '#88bbdd', effectRadius: 1.0 },
    { id: 'fish_2', name: 'Reel In', icon: '🐟', description: 'Reel in your catch', cooldown: 3, manaCost: 0, damage: 0, range: 6, arcDeg: 15, dmgDelayMs: 800, hitShape: 'ray', hitCount: 0, effect: 'buff', effectColor: '#66aacc', effectRadius: 1.0 },
    { id: 'fish_3', name: 'Bait Hook', icon: '🪱', description: 'Prepare bait for better catches', cooldown: 5, manaCost: 0, damage: 0, range: 0, arcDeg: 0, dmgDelayMs: 0, hitShape: 'sphere', hitCount: 0, effect: 'buff', effectColor: '#ddcc88', effectRadius: 0.5 },
    { id: 'fish_4', name: 'Fish Slap', icon: '🐟', description: 'Whack a nearby enemy with your catch', cooldown: 6, manaCost: 0, damage: 15, range: 2.5, arcDeg: 90, dmgDelayMs: 400, hitShape: 'capsule', hitCount: 1, effect: 'blast', effectColor: '#88ddff', effectRadius: 1.5 },
  ],
  sandstorm: [
    { id: 'sandstorm_1', name: 'Desert Cleave', icon: '⚔️', description: 'Massive greatsword sweep — T8 power', cooldown: 3, manaCost: 0, damage: 130, range: 3.5, arcDeg: 160, dmgDelayMs: 350, hitShape: 'capsule', hitCount: 1, effect: 'slash', effectColor: '#ffaa33', effectRadius: 3.5 },
    { id: 'sandstorm_2', name: 'Cannon Blast', icon: '💥', description: 'Fire the built-in cannon', cooldown: 5, manaCost: 15, damage: 95, range: 45, arcDeg: 8, dmgDelayMs: 200, hitShape: 'ray', hitCount: 1, effect: 'blast', effectColor: '#ff6600', effectRadius: 2.5 },
    { id: 'sandstorm_3', name: 'Sandstorm Whirl', icon: '🌀', description: '360° whirlwind of sand and steel', cooldown: 8, manaCost: 20, damage: 65, range: 4.0, arcDeg: 360, dmgDelayMs: 200, hitShape: 'sphere', hitCount: 3, effect: 'slash', effectColor: '#ddaa44', effectRadius: 4.0 },
    { id: 'sandstorm_4', name: 'Scorched Earth', icon: '🔥', description: 'Plunge blade — cannon detonates AoE', cooldown: 14, manaCost: 35, damage: 160, range: 6.0, arcDeg: 360, dmgDelayMs: 650, hitShape: 'sphere', hitCount: 1, effect: 'blast', effectColor: '#ff4400', effectRadius: 6.0 },
  ],
};

/** Get the 4 skills for a weapon mode */
export function getWeaponSkills(mode: WeaponMode): [SkillDef, SkillDef, SkillDef, SkillDef] {
  return WEAPON_SKILLS[mode];
}
