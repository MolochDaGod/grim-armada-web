/**
 * MagicProjectile — visual spell projectile system.
 * Renders Orb, Javelin, and Wave projectiles from the store.
 * Ported from Motion MagicProjectile.tsx.
 */

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';

// ── Spell type (matches content/spells.ts ids) ────────────────────────────────
export type SpellType = 'orb' | 'javelin' | 'wave' | 'nova';

export interface MagicProjectileState {
  id: string;
  spell: { type: SpellType; color: string; coreColor: string; damage: number; speed: number; radius: number };
  position: THREE.Vector3;
  direction: THREE.Vector3;
  age: number;
  maxAge: number;
}

// ── Orb Projectile ────────────────────────────────────────────────────────────
const ORB_PARTICLE_COUNT = 8;

function OrbProjectile({ color, coreColor }: { color: string; coreColor: string }) {
  const outerRef = useRef<THREE.Mesh>(null!);
  const innerRef = useRef<THREE.Mesh>(null!);
  const orbitsRef = useRef<THREE.InstancedMesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const t = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, dt) => {
    t.current += dt;
    if (outerRef.current) outerRef.current.rotation.y = t.current * 2.1;
    if (innerRef.current) innerRef.current.rotation.z = t.current * 3.3;
    if (orbitsRef.current) {
      for (let i = 0; i < ORB_PARTICLE_COUNT; i++) {
        const angle = (i / ORB_PARTICLE_COUNT) * Math.PI * 2 + t.current * 3.5;
        const r = 0.35 + Math.sin(t.current * 4 + i) * 0.06;
        const h = Math.sin(angle * 2 + t.current * 2) * 0.12;
        dummy.position.set(Math.cos(angle) * r, h, Math.sin(angle) * r);
        dummy.scale.setScalar(0.04 + Math.sin(t.current * 8 + i * 1.3) * 0.015);
        dummy.updateMatrix();
        orbitsRef.current.setMatrixAt(i, dummy.matrix);
      }
      orbitsRef.current.instanceMatrix.needsUpdate = true;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 3 + Math.sin(t.current * 10) * 1.5;
    }
  });

  return (
    <group>
      <mesh ref={outerRef}>
        <sphereGeometry args={[0.28, 12, 12]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2.5} transparent opacity={0.35} wireframe />
      </mesh>
      <mesh ref={innerRef}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={6} transparent opacity={0.9} />
      </mesh>
      <instancedMesh ref={orbitsRef} args={[undefined, undefined, ORB_PARTICLE_COUNT]}>
        <sphereGeometry args={[1, 4, 4]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={8} />
      </instancedMesh>
      <mesh>
        <sphereGeometry args={[0.42, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={3} distance={6} />
    </group>
  );
}

// ── Javelin Projectile ────────────────────────────────────────────────────────
function JavelinProjectile({ color, coreColor }: { color: string; coreColor: string }) {
  const glowRef = useRef<THREE.Mesh>(null!);
  const lightRef = useRef<THREE.PointLight>(null!);
  const t = useRef(0);

  useFrame((_, dt) => {
    t.current += dt;
    if (glowRef.current) glowRef.current.rotation.z = t.current * 18;
    if (lightRef.current) lightRef.current.intensity = 2.5 + Math.sin(t.current * 14) * 1.0;
  });

  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.03, 0.01, 1.2, 8]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={8} />
      </mesh>
      <mesh ref={glowRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.09, 0.02, 1.0, 6]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, -0.6]}>
        <sphereGeometry args={[0.09, 8, 8]} />
        <meshStandardMaterial color={coreColor} emissive={coreColor} emissiveIntensity={10} />
      </mesh>
      <pointLight ref={lightRef} color={color} intensity={2.5} distance={5} />
    </group>
  );
}

// ── Wave Projectile (expanding ring) ──────────────────────────────────────────
function WaveProjectile({ color, coreColor, age, maxAge }: { color: string; coreColor: string; age: number; maxAge: number }) {
  const t = age / maxAge;
  const scale = t * 6;
  const opacity = 1 - t;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale, scale, 1]}>
        <torusGeometry args={[1, 0.08, 8, 32]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} transparent opacity={opacity * 0.7} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[scale * 0.9, scale * 0.9, 1]}>
        <ringGeometry args={[0.8, 1.0, 32]} />
        <meshBasicMaterial color={coreColor} transparent opacity={opacity * 0.3} side={THREE.DoubleSide} />
      </mesh>
      <pointLight color={color} intensity={3 * opacity} distance={scale * 2 + 2} />
    </group>
  );
}

// ── Single Projectile ─────────────────────────────────────────────────────────
function MagicProjectileEntity({ data }: { data: MagicProjectileState }) {
  const groupRef = useRef<THREE.Group>(null!);

  useFrame((_, dt) => {
    if (!groupRef.current) return;
    // Move along direction
    data.position.addScaledVector(data.direction, data.spell.speed * dt);
    data.age += dt;
    groupRef.current.position.copy(data.position);
    // Orient along direction
    if (data.spell.type !== 'wave' && data.spell.type !== 'nova') {
      groupRef.current.lookAt(
        data.position.x + data.direction.x,
        data.position.y + data.direction.y,
        data.position.z + data.direction.z,
      );
    }
  });

  const { type, color, coreColor } = data.spell;
  return (
    <group ref={groupRef} position={data.position.toArray()}>
      {type === 'orb' && <OrbProjectile color={color} coreColor={coreColor} />}
      {type === 'javelin' && <JavelinProjectile color={color} coreColor={coreColor} />}
      {(type === 'wave' || type === 'nova') && (
        <WaveProjectile color={color} coreColor={coreColor} age={data.age} maxAge={data.maxAge} />
      )}
    </group>
  );
}

// ── Magic System (mount once in scene) ────────────────────────────────────────
export function MagicSystem() {
  const projectiles = useGameStore(s => s.magicProjectiles);
  const removeProjectile = useGameStore(s => s.removeMagicProjectile);

  useFrame(() => {
    // Expire old projectiles
    for (const p of projectiles) {
      if (p.age >= p.maxAge) {
        removeProjectile(p.id);
      }
    }
  });

  return (
    <>
      {projectiles.map(p => (
        <MagicProjectileEntity key={p.id} data={p} />
      ))}
    </>
  );
}
