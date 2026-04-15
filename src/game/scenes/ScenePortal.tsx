/**
 * ScenePortal — glowing portal pillar with E-key interaction.
 * Player approaches within 4m, presses E to transition to target scene.
 * Ported from Motion scenes/ScenePortal.tsx.
 */

import { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { useSceneStore, type SceneId, SCENE_META } from './useSceneStore';
import { useGameStore } from '../store';

interface ScenePortalProps {
  position: [number, number, number];
  targetScene: SceneId;
  label?: string;
  color?: string;
}

export function ScenePortal({ position, targetScene, label, color }: ScenePortalProps) {
  const meta = SCENE_META[targetScene];
  const portalColor = color ?? meta.color;
  const portalLabel = label ?? meta.name;

  const ringRef = useRef<THREE.Mesh>(null!);
  const glowRef = useRef<THREE.PointLight>(null!);
  const transitionTo = useSceneStore(s => s.transitionTo);
  const playerPosition = useGameStore(s => s.playerPosition);
  const [nearby, setNearby] = useState(false);

  // E key to activate
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyE' && nearby) {
        transitionTo(targetScene);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [nearby, targetScene, transitionTo]);

  useFrame(({ clock }) => {
    // Proximity check
    const dx = playerPosition[0] - position[0];
    const dz = playerPosition[2] - position[2];
    setNearby(Math.sqrt(dx * dx + dz * dz) < 4);

    // Animate ring + glow
    if (ringRef.current) {
      ringRef.current.rotation.y = clock.elapsedTime * 1.5;
      ringRef.current.position.y = position[1] + 1.5 + Math.sin(clock.elapsedTime * 2) * 0.2;
    }
    if (glowRef.current) {
      glowRef.current.intensity = 2 + Math.sin(clock.elapsedTime * 3) * 0.5;
    }
  });

  return (
    <group position={position}>
      {/* Base pillar */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.4, 1, 8]} />
        <meshStandardMaterial color="#333" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Spinning ring */}
      <mesh ref={ringRef} position={[0, 1.5, 0]}>
        <torusGeometry args={[0.8, 0.08, 16, 32]} />
        <meshStandardMaterial
          color={portalColor} emissive={portalColor} emissiveIntensity={1.5}
          transparent opacity={0.85}
        />
      </mesh>

      {/* Inner glow sphere */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial
          color={portalColor} emissive={portalColor} emissiveIntensity={2}
          transparent opacity={0.4}
        />
      </mesh>

      {/* Point light */}
      <pointLight ref={glowRef} position={[0, 1.5, 0]} color={portalColor} intensity={2} distance={8} />

      {/* Label */}
      <Text
        position={[0, 3, 0]}
        fontSize={0.25}
        color={portalColor}
        anchorX="center"
        font={undefined}
      >
        {portalLabel}
      </Text>
      <Text
        position={[0, 2.7, 0]}
        fontSize={0.15}
        color="#aaa"
        anchorX="center"
        font={undefined}
      >
        {nearby ? '[ Press E ]' : ''}
      </Text>

      {/* Proximity glow ring on ground */}
      {nearby && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[1.2, 1.5, 32]} />
          <meshBasicMaterial
            color={portalColor}
            transparent opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
