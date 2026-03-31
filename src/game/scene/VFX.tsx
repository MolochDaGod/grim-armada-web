import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { shakeState, hitMarkerState, damageNumbers } from './BulletSystem';
import { useGameStore } from '../store';
import { useSurvivalStore } from '../survivalStore';
import { crosshairBloomAmount } from './WeaponSystem';

// ===== Screen Shake (applied to camera) =====
export function ScreenShake() {
  const { camera } = useThree();
  const basePos = useRef(new THREE.Vector3());
  const shaking = useRef(false);

  useFrame(() => {
    if (shakeState.intensity > 0.001) {
      if (!shaking.current) { basePos.current.copy(camera.position); shaking.current = true; }
      const i = shakeState.intensity;
      camera.position.x += (Math.random() - 0.5) * i * 0.3;
      camera.position.y += (Math.random() - 0.5) * i * 0.15;
      camera.rotation.z = (Math.random() - 0.5) * i * 0.02;
    } else if (shaking.current) {
      camera.rotation.z = 0;
      shaking.current = false;
    }
  });

  return null;
}

// ===== Floating Damage Numbers (3D text) =====
export function DamageNumbers() {
  return (
    <>
      {damageNumbers.map((d, i) => (
        d.active && (
          <Text
            key={i}
            position={[d.x, d.y, d.z]}
            fontSize={d.crit ? 0.4 : 0.25}
            color={d.heal ? '#4ade80' : d.crit ? '#ff4444' : '#ffffff'}
            anchorX="center"
            anchorY="middle"
            font={undefined}
            outlineWidth={0.02}
            outlineColor="#000000"
          >
            {d.heal ? '+' : '-'}{d.value}{d.crit ? '!' : ''}
          </Text>
        )
      ))}
    </>
  );
}

// ===== Weapon-Specific Crosshair System =====

type CrosshairStyle = 'rifle' | 'pistol' | 'carbine' | 'melee' | 'harvest';

function getCrosshairStyle(): CrosshairStyle {
  // Check harvest mode from survival store
  const gameMode = useSurvivalStore.getState().gameMode;
  if (gameMode === 'harvest') return 'harvest';

  const weapon = useGameStore.getState().playerActor.weaponType;
  switch (weapon) {
    case 'Rifle': return 'rifle';
    case 'Pistol': return 'pistol';
    case 'Carbine': return 'carbine';
    case 'OneHandMelee': case 'TwoHandMelee': case 'Polearm': case 'Unarmed': return 'melee';
    default: return 'rifle';
  }
}

function RifleCrosshair({ spread, color, glow, hasTarget }: { spread: number; color: string; glow: string; hasTarget: boolean }) {
  return (
    <div style={{ position: 'relative', width: spread * 2 + 10, height: spread * 2 + 10, transition: 'width 0.08s, height 0.08s' }}>
      {/* Tight cross — 4 thin lines with gap */}
      <div style={{ position: 'absolute', left: '50%', top: 0, width: 1.5, height: 10, transform: 'translateX(-50%)', background: color, boxShadow: glow }} />
      <div style={{ position: 'absolute', left: '50%', bottom: 0, width: 1.5, height: 10, transform: 'translateX(-50%)', background: color, boxShadow: glow }} />
      <div style={{ position: 'absolute', top: '50%', left: 0, width: 10, height: 1.5, transform: 'translateY(-50%)', background: color, boxShadow: glow }} />
      <div style={{ position: 'absolute', top: '50%', right: 0, width: 10, height: 1.5, transform: 'translateY(-50%)', background: color, boxShadow: glow }} />
      {/* Center dot */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 2, height: 2, borderRadius: '50%', transform: 'translate(-50%, -50%)', background: hasTarget ? '#ff6666' : '#ffffff88' }} />
    </div>
  );
}

function PistolCrosshair({ spread, color, glow, hasTarget }: { spread: number; color: string; glow: string; hasTarget: boolean }) {
  const size = spread * 1.6 + 16;
  return (
    <div style={{ position: 'relative', width: size, height: size, transition: 'width 0.08s, height 0.08s' }}>
      {/* Circle ring */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: `1.5px solid ${color}`, boxShadow: glow,
      }} />
      {/* Center dot — larger */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, borderRadius: '50%',
        transform: 'translate(-50%, -50%)', background: hasTarget ? '#ff4444' : color,
        boxShadow: hasTarget ? '0 0 6px #ff4444' : glow,
      }} />
    </div>
  );
}

function CarbineCrosshair({ spread, color, glow, hasTarget }: { spread: number; color: string; glow: string; hasTarget: boolean }) {
  const s = spread + 8;
  return (
    <div style={{ position: 'relative', width: s * 2, height: s * 2, transition: 'width 0.08s, height 0.08s' }}>
      {/* Chevron top */}
      <div style={{ position: 'absolute', left: '50%', top: 2, width: 12, height: 1.5, transform: 'translateX(-50%) rotate(0deg)', background: color, boxShadow: glow }} />
      {/* Chevron left */}
      <div style={{ position: 'absolute', top: '50%', left: 2, width: 1.5, height: 12, transform: 'translateY(-50%)', background: color, boxShadow: glow }} />
      {/* Chevron right */}
      <div style={{ position: 'absolute', top: '50%', right: 2, width: 1.5, height: 12, transform: 'translateY(-50%)', background: color, boxShadow: glow }} />
      {/* Bottom tick */}
      <div style={{ position: 'absolute', left: '50%', bottom: 2, width: 12, height: 1.5, transform: 'translateX(-50%)', background: color, boxShadow: glow }} />
      {/* Center diamond */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 5, height: 5,
        transform: 'translate(-50%, -50%) rotate(45deg)',
        border: `1.5px solid ${hasTarget ? '#ff4444' : color}`,
        boxShadow: hasTarget ? '0 0 6px #ff4444' : glow,
      }} />
    </div>
  );
}

function MeleeCrosshair({ hasTarget }: { hasTarget: boolean }) {
  const color = hasTarget ? '#ff4444' : '#ffffff66';
  return (
    <div style={{ position: 'relative', width: 20, height: 20 }}>
      {/* Simple center dot for melee — subtle */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 6, height: 6, borderRadius: '50%',
        transform: 'translate(-50%, -50%)', background: color,
        boxShadow: hasTarget ? '0 0 8px #ff4444, 0 0 16px #ff222244' : '0 0 4px #ffffff22',
      }} />
      {/* Outer ring on target */}
      {hasTarget && <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '1px solid #ff444488',
        animation: 'spin 3s linear infinite',
      }} />}
    </div>
  );
}

function HarvestCrosshair() {
  return (
    <div style={{ position: 'relative', width: 32, height: 32 }}>
      {/* Gather ring — gold, dashed */}
      <div style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        border: '2px dashed #d4af3788',
        boxShadow: '0 0 8px #d4af3722',
      }} />
      {/* Center pip */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%', width: 4, height: 4, borderRadius: '50%',
        transform: 'translate(-50%, -50%)', background: '#d4af37',
        boxShadow: '0 0 4px #d4af3744',
      }} />
    </div>
  );
}

export function Crosshair() {
  const targetId = useGameStore(s => s.targetId);
  const hasTarget = !!targetId;
  const style = getCrosshairStyle();
  const spread = 16 + crosshairBloomAmount * 20;
  const color = hasTarget ? '#ff4444' : '#ffffffaa';
  const glow = hasTarget ? '0 0 6px #ff4444' : '0 0 3px #ffffff44';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 10 }}>
      {style === 'rifle' && <RifleCrosshair spread={spread} color={color} glow={glow} hasTarget={hasTarget} />}
      {style === 'pistol' && <PistolCrosshair spread={spread} color={color} glow={glow} hasTarget={hasTarget} />}
      {style === 'carbine' && <CarbineCrosshair spread={spread} color={color} glow={glow} hasTarget={hasTarget} />}
      {style === 'melee' && <MeleeCrosshair hasTarget={hasTarget} />}
      {style === 'harvest' && <HarvestCrosshair />}
    </div>
  );
}

// ===== Hit Marker (X flash on successful hit) =====
export function HitMarker() {
  // This reads from hitMarkerState directly — re-renders via parent
  const visible = hitMarkerState.active;
  const crit = hitMarkerState.crit;

  if (!visible) return null;

  const color = crit ? '#ff2222' : '#ffffff';
  const size = crit ? 20 : 14;
  const glow = crit ? '0 0 12px #ff4444, 0 0 20px #ff2222' : '0 0 6px #ffffff88';

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ zIndex: 11 }}>
      <div style={{ position: 'relative', width: size * 2, height: size * 2 }}>
        {/* X shape */}
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 3, height: size * 2,
          transform: 'translate(-50%, -50%) rotate(45deg)', background: color, boxShadow: glow,
        }} />
        <div style={{
          position: 'absolute', left: '50%', top: '50%', width: 3, height: size * 2,
          transform: 'translate(-50%, -50%) rotate(-45deg)', background: color, boxShadow: glow,
        }} />
      </div>
    </div>
  );
}

// ===== Damage flash overlay (red flash on screen when hit) =====
export function DamageFlash() {
  // Read from shakeState — if intensity > 0 we were just hit
  const opacity = Math.min(shakeState.intensity * 3, 0.4);
  if (opacity < 0.01) return null;

  return (
    <div className="absolute inset-0 pointer-events-none" style={{
      zIndex: 12,
      background: `radial-gradient(ellipse at center, transparent 40%, rgba(180, 0, 0, ${opacity}) 100%)`,
      transition: 'opacity 0.1s',
    }} />
  );
}
