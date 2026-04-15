/**
 * MuzzleFlash — visual flash VFX on weapon fire.
 * Renders a bright additive-blended sprite at the muzzle with
 * randomized rotation/scale per shot, auto-fading over ~60ms.
 * Ported from three-fps Weapon.js muzzle flash pattern.
 *
 * Mount <MuzzleFlashSystem /> in scene. Call triggerMuzzleFlash() on fire.
 */

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_FLASHES = 4;
const FLASH_LIFETIME = 0.06; // seconds — very fast (from three-fps: fireRate duration)

interface FlashData {
  active: boolean;
  position: THREE.Vector3;
  rotation: number;
  scale: number;
  age: number;
  color: THREE.Color;
}

// ── Global trigger ────────────────────────────────────────────────────────────
const _flashQueue: { position: THREE.Vector3; color: string }[] = [];

export function triggerMuzzleFlash(position: THREE.Vector3, color = '#ffff88') {
  _flashQueue.push({ position: position.clone(), color });
}

export function MuzzleFlashSystem() {
  const flashes = useRef<FlashData[]>(
    Array.from({ length: MAX_FLASHES }, () => ({
      active: false,
      position: new THREE.Vector3(),
      rotation: 0,
      scale: 1,
      age: 0,
      color: new THREE.Color('#ffff88'),
    })),
  );

  useFrame((_, dt) => {
    // Process queue
    while (_flashQueue.length > 0) {
      const data = _flashQueue.shift()!;
      const slot = flashes.current.find(f => !f.active);
      if (!slot) break;

      slot.active = true;
      slot.position.copy(data.position);
      // Random rotation and scale per shot (from three-fps: Math.random() * Math.PI + random scale)
      slot.rotation = Math.random() * Math.PI * 2;
      slot.scale = 0.3 + Math.random() * 0.4;
      slot.age = 0;
      slot.color.set(data.color);
    }

    // Update flashes
    for (const f of flashes.current) {
      if (!f.active) continue;
      f.age += dt;
      if (f.age >= FLASH_LIFETIME) {
        f.active = false;
      }
    }
  });

  return (
    <>
      {flashes.current.map((f, i) => {
        if (!f.active) return null;
        const opacity = 1 - f.age / FLASH_LIFETIME;
        return (
          <group key={`flash-${i}`} position={f.position.toArray()}>
            {/* Core flash — bright center */}
            <mesh rotation={[0, 0, f.rotation]} scale={f.scale * 0.5}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color={f.color}
                transparent
                opacity={opacity}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Outer glow — larger, softer */}
            <mesh rotation={[0, 0, f.rotation + Math.PI / 4]} scale={f.scale}>
              <planeGeometry args={[1, 1]} />
              <meshBasicMaterial
                color="#ff8844"
                transparent
                opacity={opacity * 0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
              />
            </mesh>
            {/* Point light spike */}
            <pointLight
              color={f.color}
              intensity={8 * opacity}
              distance={4}
            />
          </group>
        );
      })}
    </>
  );
}
