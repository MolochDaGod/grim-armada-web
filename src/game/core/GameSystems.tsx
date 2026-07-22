/**
 * GameSystems — R3F bridge: init GameEngine, tick all helpers, emit combat VFX.
 * Replaces scattered NewCameraController + EngineLoop wiring in DemoScene.
 */

import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { initGameEngine, destroyGameEngine, tickGameEngine } from './GameEngine';
import { getWeaponConfig } from '../weapons/WeaponConfig';
import { getYaw } from '../player/CameraController';
import { getComboStep } from '../weapons/WeaponManager';
import { applyMeleeDamage, applySkillDamage, tickProjectileHits } from '../combat/ProjectileHitSystem';
import { fireShot } from '../scene/BulletSystem';
import { triggerMuzzleFlash } from '../vfx/MuzzleFlash';
import { audioManager } from '../audio/AudioManager';
import { tickDayNight } from '../survival/DayNightCycle';
import { SPELLS } from '../content/spells';
import type { MagicProjectileState } from '../weapons/MagicProjectile';
import type { ArrowData } from '../weapons/Arrow';
import { GrenadeRenderer, createGrenadeFromCamera, type GrenadeData } from '../weapons/Grenade';
import { inputManager } from '../player/InputManager';

export function GameSystems() {
  const { camera, gl } = useThree();
  const position = useGameStore((s) => s.playerPosition);
  const grenadesRef = useRef<GrenadeData[]>([]);

  useEffect(() => {
    initGameEngine(gl.domElement);
    return () => destroyGameEngine();
  }, [gl]);

  useFrame((_state, dt) => {
    const cdt = Math.min(dt, 0.05);
    const weaponResult = tickGameEngine(cdt, {
      camera: camera as THREE.PerspectiveCamera,
      playerPos: position,
    });

    if (weaponResult.fired) {
      const store = useGameStore.getState();
      const cfg = getWeaponConfig(store.weaponMode);
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const origin = new THREE.Vector3();
      camera.getWorldPosition(origin);
      origin.addScaledVector(dir, 1.0);
      const target = origin.clone().addScaledVector(dir, cfg.range);

      if (cfg.muzzleFlash) triggerMuzzleFlash(origin.clone(), cfg.trailColor);

      if (store.weaponMode === 'bow') {
        const arrow: ArrowData = {
          id: `arrow-${Date.now()}-${Math.random()}`,
          position: origin.clone(),
          direction: dir.clone(),
          speed: cfg.projectileSpeed,
          gravity: cfg.projectileGravity,
          lifetime: cfg.projectileLifetime,
          trailColor: cfg.trailColor,
        };
        store.addArrow(arrow);
      } else {
        fireShot(
          { x: origin.x, y: origin.y, z: origin.z },
          { x: target.x, y: target.y, z: target.z },
          cfg.trailColor,
        );
      }
      audioManager.playGunshot(0);
    }

    if (weaponResult.meleeHit) {
      const store = useGameStore.getState();
      const cfg = getWeaponConfig(store.weaponMode);
      applyMeleeDamage(
        store.playerPosition,
        getYaw() + Math.PI,
        cfg.range,
        cfg.hitArc,
        cfg.damage,
        getComboStep(),
      );
    }

    if (weaponResult.skillUsed) {
      const store = useGameStore.getState();
      const skill = weaponResult.skillUsed;
      const yaw = getYaw();

      if (store.weaponMode === 'staff' && skill.hitShape === 'ray') {
        const spellDef = SPELLS.find((s) => s.id === 'orb') ?? SPELLS[0];
        const dir = new THREE.Vector3();
        camera.getWorldDirection(dir);
        const pos = new THREE.Vector3();
        camera.getWorldPosition(pos);
        pos.addScaledVector(dir, 1.5);
        const proj: MagicProjectileState = {
          id: `magic-${Date.now()}-${Math.random()}`,
          spell: {
            type: spellDef.id,
            color: spellDef.color,
            coreColor: spellDef.coreColor,
            damage: skill.damage,
            speed: spellDef.speed,
            radius: spellDef.radius,
          },
          position: pos,
          direction: dir.clone(),
          age: 0,
          maxAge: 4,
        };
        store.addMagicProjectile(proj);
      } else {
        applySkillDamage(store.playerPosition, yaw + Math.PI, skill);
      }
    }

    tickProjectileHits();

    if (inputManager.justPressed('KeyG')) {
      const dir = new THREE.Vector3();
      camera.getWorldDirection(dir);
      const pos = new THREE.Vector3();
      camera.getWorldPosition(pos);
      grenadesRef.current.push(createGrenadeFromCamera(pos, dir));
    }

    const newDayTime = tickDayNight(cdt);
    useGameStore.setState({ dayTime: newDayTime });
  });

  const handleGrenadeExplode = (id: string) => {
    grenadesRef.current = grenadesRef.current.filter((g) => g.id !== id);
  };

  return (
    <GrenadeRenderer grenades={grenadesRef.current} onExplode={handleGrenadeExplode} />
  );
}