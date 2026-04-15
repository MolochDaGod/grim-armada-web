/**
 * Explosion VFX — fireball + shockwave ring + debris particles + smoke + light flash.
 * Mount <ExplosionSystem /> in scene. Call queueExplosion(pos, radius) to trigger.
 * Uses object pooling to avoid GC spikes.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_EXPLOSIONS = 8;
const FIREBALL_DURATION = 0.4;
const SHOCKWAVE_DURATION = 0.5;
const DEBRIS_COUNT = 12;
const DEBRIS_DURATION = 0.8;
const SMOKE_COUNT = 6;
const SMOKE_DURATION = 1.5;
const LIGHT_DURATION = 0.15;

interface ExplosionData {
  active: boolean;
  position: THREE.Vector3;
  radius: number;
  age: number;
  damage: number;
}

// ── Queue ─────────────────────────────────────────────────────────────────────
const _queue: { position: THREE.Vector3; radius: number; damage: number }[] = [];

export function queueExplosion(position: THREE.Vector3, radius = 5, damage = 60) {
  _queue.push({ position: position.clone(), radius, damage });
}

// ── Debris particle ───────────────────────────────────────────────────────────
interface Debris {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
  color: THREE.Color;
}

// ── Smoke particle ────────────────────────────────────────────────────────────
interface Smoke {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  age: number;
  maxAge: number;
  size: number;
}

export function ExplosionSystem() {
  const groupRef = useRef<THREE.Group>(null!);

  // Pool
  const explosions = useRef<ExplosionData[]>(
    Array.from({ length: MAX_EXPLOSIONS }, () => ({
      active: false, position: new THREE.Vector3(), radius: 5, age: 0, damage: 0,
    })),
  );

  // Fireball meshes
  const fireballRefs = useRef<THREE.Mesh[]>([]);
  const shockwaveRefs = useRef<THREE.Mesh[]>([]);
  const lightRefs = useRef<THREE.PointLight[]>([]);

  // Debris + smoke pools
  const debrisPool = useRef<Debris[]>([]);
  const smokePool = useRef<Smoke[]>([]);

  // Init pools once
  useMemo(() => {
    for (let i = 0; i < MAX_EXPLOSIONS * DEBRIS_COUNT; i++) {
      debrisPool.current.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        age: 999, maxAge: DEBRIS_DURATION, size: 0.05,
        color: new THREE.Color(),
      });
    }
    for (let i = 0; i < MAX_EXPLOSIONS * SMOKE_COUNT; i++) {
      smokePool.current.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(),
        age: 999, maxAge: SMOKE_DURATION, size: 0.2,
      });
    }
  }, []);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);

    // Process queue
    while (_queue.length > 0) {
      const data = _queue.shift()!;
      const slot = explosions.current.find(e => !e.active);
      if (!slot) break;

      slot.active = true;
      slot.position.copy(data.position);
      slot.radius = data.radius;
      slot.damage = data.damage;
      slot.age = 0;

      // Spawn debris
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        const d = debrisPool.current.find(p => p.age >= p.maxAge);
        if (!d) break;
        d.pos.copy(data.position);
        d.vel.set(
          (Math.random() - 0.5) * 12,
          3 + Math.random() * 8,
          (Math.random() - 0.5) * 12,
        );
        d.age = 0;
        d.maxAge = DEBRIS_DURATION + Math.random() * 0.4;
        d.size = 0.04 + Math.random() * 0.06;
        // Random warm color for debris
        d.color.setHSL(0.05 + Math.random() * 0.08, 1, 0.5 + Math.random() * 0.3);
      }

      // Spawn smoke
      for (let i = 0; i < SMOKE_COUNT; i++) {
        const s = smokePool.current.find(p => p.age >= p.maxAge);
        if (!s) break;
        s.pos.copy(data.position);
        s.vel.set(
          (Math.random() - 0.5) * 3,
          1 + Math.random() * 3,
          (Math.random() - 0.5) * 3,
        );
        s.age = 0;
        s.maxAge = SMOKE_DURATION + Math.random() * 0.5;
        s.size = 0.3 + Math.random() * 0.4;
      }
    }

    // Update debris
    for (const d of debrisPool.current) {
      if (d.age >= d.maxAge) continue;
      d.age += cdt;
      d.vel.y -= 15 * cdt; // gravity
      d.pos.addScaledVector(d.vel, cdt);
    }

    // Update smoke
    for (const s of smokePool.current) {
      if (s.age >= s.maxAge) continue;
      s.age += cdt;
      s.vel.y -= 0.5 * cdt; // slow rise
      s.vel.multiplyScalar(1 - 2 * cdt); // drag
      s.pos.addScaledVector(s.vel, cdt);
      s.size += cdt * 0.5; // expand
    }

    // Update explosions age
    for (const e of explosions.current) {
      if (!e.active) continue;
      e.age += cdt;
      if (e.age > Math.max(FIREBALL_DURATION, SHOCKWAVE_DURATION, LIGHT_DURATION) + 0.1) {
        e.active = false;
      }
    }
  });

  // Use instanced meshes for debris and smoke for performance
  const debrisDummy = useMemo(() => new THREE.Object3D(), []);
  const smokeDummy = useMemo(() => new THREE.Object3D(), []);

  return (
    <group ref={groupRef}>
      {/* Fireballs */}
      {explosions.current.map((e, i) => {
        if (!e.active) return null;
        const t = e.age / FIREBALL_DURATION;
        if (t > 1) return null;
        const scale = e.radius * 0.6 * (t < 0.3 ? t / 0.3 : 1 - (t - 0.3) / 0.7);
        const opacity = t < 0.2 ? 1 : 1 - (t - 0.2) / 0.8;
        return (
          <group key={`exp-${i}`} position={e.position.toArray()}>
            {/* Fireball core */}
            <mesh scale={scale}>
              <sphereGeometry args={[1, 12, 12]} />
              <meshBasicMaterial color="#ff6600" transparent opacity={opacity * 0.9} />
            </mesh>
            {/* Bright inner core */}
            <mesh scale={scale * 0.5}>
              <sphereGeometry args={[1, 8, 8]} />
              <meshBasicMaterial color="#ffff88" transparent opacity={opacity} />
            </mesh>
            {/* Shockwave ring */}
            {e.age < SHOCKWAVE_DURATION && (
              <mesh rotation={[-Math.PI / 2, 0, 0]} scale={e.radius * (e.age / SHOCKWAVE_DURATION) * 1.5}>
                <torusGeometry args={[1, 0.06, 8, 32]} />
                <meshBasicMaterial
                  color="#ffaa44"
                  transparent
                  opacity={(1 - e.age / SHOCKWAVE_DURATION) * 0.7}
                  side={THREE.DoubleSide}
                />
              </mesh>
            )}
            {/* Light flash */}
            {e.age < LIGHT_DURATION && (
              <pointLight
                color="#ff8822"
                intensity={20 * (1 - e.age / LIGHT_DURATION)}
                distance={e.radius * 3}
              />
            )}
          </group>
        );
      })}

      {/* Debris particles (rendered as small instanced spheres) */}
      {debrisPool.current.map((d, i) => {
        if (d.age >= d.maxAge) return null;
        const t = d.age / d.maxAge;
        return (
          <mesh key={`deb-${i}`} position={d.pos.toArray()} scale={d.size * (1 - t)}>
            <sphereGeometry args={[1, 4, 4]} />
            <meshBasicMaterial color={d.color} />
          </mesh>
        );
      })}

      {/* Smoke puffs */}
      {smokePool.current.map((s, i) => {
        if (s.age >= s.maxAge) return null;
        const t = s.age / s.maxAge;
        return (
          <mesh key={`smk-${i}`} position={s.pos.toArray()} scale={s.size}>
            <sphereGeometry args={[1, 6, 6]} />
            <meshStandardMaterial
              color="#333333"
              transparent
              opacity={(1 - t) * 0.4}
              roughness={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}
