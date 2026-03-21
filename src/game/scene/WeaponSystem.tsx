import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { GLTFModel } from './ModelLoader';

/**
 * First-person-style weapon attached to camera with spring physics.
 * Renders the weapon model relative to the camera with:
 * - Idle sway (breathing)
 * - Movement bob
 * - Recoil kick on fire
 * - Return springs for all offsets
 */

// Spring helper — critically damped spring
function springLerp(current: number, target: number, velocity: { v: number }, stiffness: number, damping: number, dt: number): number {
  const force = (target - current) * stiffness;
  velocity.v += force * dt;
  velocity.v *= Math.max(0, 1 - damping * dt);
  return current + velocity.v * dt;
}

interface WeaponState {
  // Position offsets
  swayX: number; swayY: number;
  bobX: number; bobY: number;
  recoilZ: number; recoilRotX: number;
  // Velocities for springs
  swayVelX: { v: number }; swayVelY: { v: number };
  bobVelX: { v: number }; bobVelY: { v: number };
  recoilVelZ: { v: number }; recoilVelRotX: { v: number };
  // Accumulators
  bobTime: number;
  breathTime: number;
  // Crosshair
  crosshairBloom: number;
  crosshairVel: { v: number };
}

function createWeaponState(): WeaponState {
  return {
    swayX: 0, swayY: 0,
    bobX: 0, bobY: 0,
    recoilZ: 0, recoilRotX: 0,
    swayVelX: { v: 0 }, swayVelY: { v: 0 },
    bobVelX: { v: 0 }, bobVelY: { v: 0 },
    recoilVelZ: { v: 0 }, recoilVelRotX: { v: 0 },
    bobTime: 0, breathTime: 0,
    crosshairBloom: 0, crosshairVel: { v: 0 },
  };
}

// Global crosshair bloom state (read by VFX.tsx)
export let crosshairBloomAmount = 0;

export function WeaponView({ weaponUrl, normalizedHeight = 0.5 }: { weaponUrl: string; normalizedHeight?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const ws = useRef<WeaponState>(createWeaponState());
  const prevYaw = useRef(0);
  const prevPitch = useRef(0);

  const position = useGameStore(s => s.playerPosition);
  const prevPos = useRef<[number, number, number]>([0, 0, 0]);

  // Listen for shoot events
  useEffect(() => {
    useGameStore.setState({
      _onAttackVisual: (result) => {
        if (result.attackerId === 'player') {
          // Kick recoil
          ws.current.recoilVelZ.v = 6;
          ws.current.recoilVelRotX.v = -4;
          // Bloom crosshair
          ws.current.crosshairVel.v = 3;
        }
      },
    });
  }, []);

  useFrame((_, dt) => {
    const cdt = Math.min(dt, 0.05);
    const s = useGameStore.getState();
    const w = ws.current;

    // ===== Camera sway (delayed follow of mouse) =====
    const yawDelta = s.cameraYaw - prevYaw.current;
    const pitchDelta = s.cameraPitch - prevPitch.current;
    prevYaw.current = s.cameraYaw;
    prevPitch.current = s.cameraPitch;

    const swayTargetX = -yawDelta * 15;
    const swayTargetY = -pitchDelta * 10;
    w.swayX = springLerp(w.swayX, swayTargetX, w.swayVelX, 80, 8, cdt);
    w.swayY = springLerp(w.swayY, swayTargetY, w.swayVelY, 80, 8, cdt);

    // ===== Movement bob =====
    const dx = position[0] - prevPos.current[0];
    const dz = position[2] - prevPos.current[2];
    const moveSpeed = Math.sqrt(dx * dx + dz * dz) / cdt;
    prevPos.current = [...position];

    if (moveSpeed > 0.5) {
      w.bobTime += cdt * (moveSpeed > 10 ? 14 : 10);
      const bobTargetX = Math.sin(w.bobTime) * 0.015 * Math.min(moveSpeed / 8, 1);
      const bobTargetY = Math.abs(Math.sin(w.bobTime * 2)) * 0.01 * Math.min(moveSpeed / 8, 1);
      w.bobX = springLerp(w.bobX, bobTargetX, w.bobVelX, 60, 6, cdt);
      w.bobY = springLerp(w.bobY, -bobTargetY, w.bobVelY, 60, 6, cdt);
    } else {
      // Idle breathing
      w.breathTime += cdt;
      const breathX = Math.sin(w.breathTime * 1.2) * 0.002;
      const breathY = Math.sin(w.breathTime * 0.8) * 0.001;
      w.bobX = springLerp(w.bobX, breathX, w.bobVelX, 30, 6, cdt);
      w.bobY = springLerp(w.bobY, breathY, w.bobVelY, 30, 6, cdt);
    }

    // ===== Recoil spring (kicks back then returns) =====
    w.recoilZ = springLerp(w.recoilZ, 0, w.recoilVelZ, 120, 10, cdt);
    w.recoilRotX = springLerp(w.recoilRotX, 0, w.recoilVelRotX, 100, 8, cdt);

    // ===== Crosshair bloom =====
    w.crosshairBloom = springLerp(w.crosshairBloom, 0, w.crosshairVel, 40, 6, cdt);
    crosshairBloomAmount = Math.max(0, w.crosshairBloom);

    // ===== Apply to weapon group =====
    if (groupRef.current) {
      groupRef.current.position.set(
        0.25 + w.swayX * 0.02 + w.bobX,
        -0.2 + w.swayY * 0.02 + w.bobY,
        -0.4 + w.recoilZ * 0.03,
      );
      groupRef.current.rotation.set(
        w.recoilRotX * 0.05,
        0,
        w.swayX * -0.01,
      );
    }
  });

  return (
    <group ref={groupRef} position={[0.25, -0.2, -0.4]}>
      <GLTFModel url={weaponUrl} normalizedHeight={normalizedHeight} />
    </group>
  );
}
