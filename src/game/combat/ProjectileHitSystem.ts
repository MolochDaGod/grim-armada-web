/**
 * ProjectileHitSystem — checks projectiles against enemy positions per frame.
 * Applies damage to enemies when arrows or magic projectiles hit.
 * Call tickProjectileHits(dt) from the EngineLoop.
 */

import * as THREE from 'three';
import { useGameStore } from '../store';
import type { ArrowData } from '../weapons/Arrow';
import type { MagicProjectileState } from '../weapons/MagicProjectile';
import { rollLoot, getEnemyDef, ENEMIES } from '../content/enemies';
import { queueExplosion } from '../vfx/Explosion';

const ARROW_HIT_RADIUS = 1.2;
const MAGIC_HIT_RADIUS_MULT = 1.5; // spell radius × this = hit check radius
const BULLET_HIT_RADIUS = 1.0;

/** Tick all projectile-vs-enemy hit checks. Call once per frame from EngineLoop. */
export function tickProjectileHits() {
  const store = useGameStore.getState();
  const enemies = store.enemies;
  const playerPos = store.playerPosition;

  // ── Arrow hits ──────────────────────────────────────────────────────────
  for (const arrow of store.arrows) {
    if (!arrow.position) continue;
    for (const enemy of enemies) {
      if (enemy.ham.isDead) continue;
      const dx = arrow.position.x - enemy.position.x;
      const dy = arrow.position.y - (enemy.position.y + 1);
      const dz = arrow.position.z - enemy.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < ARROW_HIT_RADIUS * ARROW_HIT_RADIUS) {
        // Hit! Apply damage
        const dmg = 45 + Math.random() * 20; // bow base damage + variance
        enemy.ham.applyDamage(dmg, 'health');
        store.addLog(`Arrow hit ${enemy.name} for ${Math.round(dmg)} damage`, 'damage');
        store.addScore(10);

        // Remove arrow
        store.removeArrow(arrow.id);

        // Check kill
        if (enemy.ham.isDead) {
          handleEnemyKill(enemy, store);
        }
        break; // arrow can only hit one enemy
      }
    }
  }

  // ── Magic projectile hits ───────────────────────────────────────────────
  for (const proj of store.magicProjectiles) {
    if (!proj.position) continue;
    const hitRadius = proj.spell.radius * MAGIC_HIT_RADIUS_MULT;
    for (const enemy of enemies) {
      if (enemy.ham.isDead) continue;
      const dx = proj.position.x - enemy.position.x;
      const dy = proj.position.y - (enemy.position.y + 1);
      const dz = proj.position.z - enemy.position.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < hitRadius * hitRadius) {
        // Hit!
        const dmg = proj.spell.damage;
        enemy.ham.applyDamage(dmg, 'health');
        store.addLog(`${proj.spell.type} hit ${enemy.name} for ${dmg} damage`, 'damage');
        store.addScore(15);

        // Nova/wave are AoE — don't remove, let them expire naturally
        if (proj.spell.type === 'orb' || proj.spell.type === 'javelin') {
          store.removeMagicProjectile(proj.id);
          // Small explosion on impact for orb
          if (proj.spell.type === 'orb') {
            queueExplosion(proj.position, 2, 0);
          }
        }

        if (enemy.ham.isDead) {
          handleEnemyKill(enemy, store);
        }

        if (proj.spell.type === 'orb' || proj.spell.type === 'javelin') break;
      }
    }
  }
}

/** Apply melee damage to enemies in range of the player */
export function applyMeleeDamage(
  playerPos: [number, number, number],
  facingAngle: number,
  range: number,
  arcDeg: number,
  damage: number,
  comboStep: number,
) {
  const store = useGameStore.getState();
  const enemies = store.enemies;
  const halfArcRad = (arcDeg / 2) * (Math.PI / 180);

  // Combo damage multiplier: 1.0 → 1.2 → 1.5
  const comboMult = comboStep === 0 ? 1.0 : comboStep === 1 ? 1.2 : 1.5;
  const totalDmg = damage * comboMult;

  const fwd = new THREE.Vector3(Math.sin(facingAngle), 0, Math.cos(facingAngle));

  let hitCount = 0;
  for (const enemy of enemies) {
    if (enemy.ham.isDead) continue;
    const dx = enemy.position.x - playerPos[0];
    const dz = enemy.position.z - playerPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > range) continue;

    // Arc check
    const toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
    const dot = fwd.dot(toEnemy);
    if (dot < Math.cos(halfArcRad)) continue;

    // Hit!
    const finalDmg = totalDmg + Math.random() * 20;
    enemy.ham.applyDamage(finalDmg, 'health');
    store.addLog(`Melee hit ${enemy.name} for ${Math.round(finalDmg)} (combo ${comboStep + 1})`, 'damage');
    store.addScore(8);
    store.setCameraShake(0.15);
    hitCount++;

    if (enemy.ham.isDead) {
      handleEnemyKill(enemy, store);
    }
  }
  return hitCount;
}

/** Apply skill damage (AoE/ray/capsule based on skill hitShape) */
export function applySkillDamage(
  playerPos: [number, number, number],
  facingAngle: number,
  skill: { damage: number; range: number; arcDeg: number; hitCount: number; effectColor: string; effectRadius: number },
) {
  const store = useGameStore.getState();
  const enemies = store.enemies;
  const halfArcRad = (skill.arcDeg / 2) * (Math.PI / 180);
  const fwd = new THREE.Vector3(Math.sin(facingAngle), 0, Math.cos(facingAngle));

  let totalHits = 0;
  for (const enemy of enemies) {
    if (enemy.ham.isDead || totalHits >= skill.hitCount) continue;
    const dx = enemy.position.x - playerPos[0];
    const dz = enemy.position.z - playerPos[2];
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist > skill.range) continue;

    // Arc check (360° = hits everything in range)
    if (skill.arcDeg < 360) {
      const toEnemy = new THREE.Vector3(dx, 0, dz).normalize();
      const dot = fwd.dot(toEnemy);
      if (dot < Math.cos(halfArcRad)) continue;
    }

    const dmg = skill.damage + Math.random() * 10;
    enemy.ham.applyDamage(dmg, 'health');
    store.addLog(`Skill hit ${enemy.name} for ${Math.round(dmg)} damage`, 'damage');
    store.addScore(12);
    totalHits++;

    if (enemy.ham.isDead) {
      handleEnemyKill(enemy, store);
    }
  }
  return totalHits;
}

/** Handle enemy death — gold, XP, kill count, log */
function handleEnemyKill(enemy: any, store: any) {
  store.addKill();
  store.addLog(`${enemy.name} defeated!`, 'death');

  // Roll loot from content registry
  const def = ENEMIES.find(e => e.modelUrl === `/models/enemies/${enemy.name.toLowerCase().replace(/ /g, '_')}.glb`);
  if (def) {
    const loot = rollLoot(def.loot);
    store.addGold(loot.gold);
    store.addScore(loot.xp);
    if (loot.gold > 0) {
      store.addLog(`+${loot.gold} gold`, 'system');
    }
    for (const item of loot.items) {
      store.addLog(`Looted: ${item.itemId} ×${item.count}`, 'system');
    }
  } else {
    // Fallback loot
    const gold = 5 + Math.floor(Math.random() * 15);
    store.addGold(gold);
    store.addScore(50);
    store.addLog(`+${gold} gold`, 'system');
  }
}
