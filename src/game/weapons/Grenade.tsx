/**
 * Grenade — throwable projectile with arc physics, ground bounce, fuse timer.
 * Triggers an explosion from the ExplosionSystem on detonation.
 * G key to throw (consumed by InputManager).
 */

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { queueExplosion } from '../vfx/Explosion';

export interface GrenadeData {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  fuse: number;       // seconds remaining
  bounces: number;    // number of times bounced
  active: boolean;
}

const GRAVITY = -22;
const BOUNCE_DAMPING = 0.4;
const MAX_BOUNCES = 3;
const GRENADE_RADIUS = 5;
const GRENADE_DAMAGE = 80;

interface GrenadeProps {
  data: GrenadeData;
  onExplode: (id: string) => void;
}

export function Grenade({ data, onExplode }: GrenadeProps) {
  const groupRef = useRef<THREE.Group>(null!);
  const spinRef = useRef(0);

  useFrame((_, dt) => {
    if (!data.active || !groupRef.current) return;
    const cdt = Math.min(dt, 0.05);

    // Physics
    data.velocity.y += GRAVITY * cdt;
    data.position.addScaledVector(data.velocity, cdt);

    // Ground bounce
    if (data.position.y <= 0.15) {
      data.position.y = 0.15;
      if (data.bounces < MAX_BOUNCES) {
        data.velocity.y = Math.abs(data.velocity.y) * BOUNCE_DAMPING;
        data.velocity.x *= 0.7;
        data.velocity.z *= 0.7;
        data.bounces++;
      } else {
        data.velocity.set(0, 0, 0);
      }
    }

    // Fuse countdown
    data.fuse -= cdt;
    if (data.fuse <= 0) {
      // BOOM
      queueExplosion(data.position, GRENADE_RADIUS, GRENADE_DAMAGE);
      data.active = false;
      onExplode(data.id);
      return;
    }

    // Update visual
    groupRef.current.position.copy(data.position);
    spinRef.current += cdt * 12;
    groupRef.current.rotation.set(spinRef.current, spinRef.current * 0.7, 0);
  });

  if (!data.active) return null;

  // Fuse flash — blink faster as fuse runs out
  const blinkRate = data.fuse < 0.5 ? 20 : data.fuse < 1 ? 10 : 4;
  const blinkOn = Math.sin(Date.now() * 0.001 * blinkRate * Math.PI * 2) > 0;

  return (
    <group ref={groupRef} position={data.position.toArray()}>
      {/* Grenade body */}
      <mesh castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Pin ring */}
      <mesh position={[0, 0.1, 0]}>
        <torusGeometry args={[0.04, 0.01, 6, 12]} />
        <meshStandardMaterial color="#888" metalness={0.9} roughness={0.2} />
      </mesh>
      {/* Fuse indicator light */}
      {blinkOn && (
        <pointLight position={[0, 0.08, 0]} color="#ff2200" intensity={2} distance={2} />
      )}
      {/* Glow ring when about to explode */}
      {data.fuse < 1 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
          <ringGeometry args={[0.2, 0.3, 16]} />
          <meshBasicMaterial color="#ff4400" transparent opacity={0.3} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

// ── Grenade Renderer (renders all active grenades from store) ─────────────────
export function GrenadeRenderer({ grenades, onExplode }: {
  grenades: GrenadeData[];
  onExplode: (id: string) => void;
}) {
  return (
    <>
      {grenades.filter(g => g.active).map(g => (
        <Grenade key={g.id} data={g} onExplode={onExplode} />
      ))}
    </>
  );
}

// ── Helper: create a grenade from camera direction ────────────────────────────
let _grenadeIdCounter = 0;

export function createGrenadeFromCamera(
  cameraPos: THREE.Vector3,
  cameraDir: THREE.Vector3,
  throwForce = 15,
  fuseTime = 2.5,
): GrenadeData {
  const pos = cameraPos.clone().addScaledVector(cameraDir, 1.5);
  pos.y -= 0.3; // slightly below eye height
  const vel = cameraDir.clone().multiplyScalar(throwForce);
  vel.y += 6; // arc upward

  return {
    id: `grenade-${++_grenadeIdCounter}`,
    position: pos,
    velocity: vel,
    fuse: fuseTime,
    bounces: 0,
    active: true,
  };
}
