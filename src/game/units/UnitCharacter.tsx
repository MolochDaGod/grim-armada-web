/**
 * UnitCharacter — renders a GLB character unit in-scene.
 * Handles model loading, material fixing (DoubleSide, depthWrite, alphaTest),
 * auto-scaling, shadow casting, selection ring, and name badge.
 * Can be used for the player, AI allies, or NPC units.
 */

import { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { type UnitDef } from './UnitRegistry';

/** Fix materials on imported GLB meshes — prevents see-through at angles */
function fixMaterials(root: THREE.Object3D) {
  root.traverse((c) => {
    if (!(c as THREE.Mesh).isMesh) return;
    c.castShadow = true;
    c.receiveShadow = true;
    const mats = Array.isArray((c as THREE.Mesh).material)
      ? ((c as THREE.Mesh).material as THREE.Material[])
      : [(c as THREE.Mesh).material as THREE.Material];
    for (const m of mats) {
      const mat = m as THREE.MeshStandardMaterial;
      mat.side = THREE.DoubleSide;
      mat.depthWrite = true;
      if (mat.transparent && mat.map) mat.alphaTest = 0.5;
      mat.needsUpdate = true;
    }
  });
}

/** Normalize a model's height to a target value */
function normalizeHeight(root: THREE.Object3D, targetHeight: number) {
  const box = new THREE.Box3().setFromObject(root);
  const currentHeight = box.max.y - box.min.y;
  if (currentHeight > 0.001) {
    const s = targetHeight / currentHeight;
    root.scale.setScalar(s);
  }
}

interface UnitCharacterProps {
  def: UnitDef;
  position: [number, number, number];
  rotation?: number;
  /** Target height in world units (default 2.0) */
  height?: number;
  /** Show name badge above head */
  showName?: boolean;
  /** Show selection ring on ground */
  selected?: boolean;
  /** Color override for selection ring */
  ringColor?: string;
  /** Called on click */
  onClick?: () => void;
}

export function UnitCharacter({
  def,
  position,
  rotation = 0,
  height = 2.0,
  showName = true,
  selected = false,
  ringColor,
  onClick,
}: UnitCharacterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { scene } = useGLTF(def.mesh);

  // Clone the scene so each instance is independent
  const model = useMemo(() => {
    const clone = scene.clone(true);
    fixMaterials(clone);
    normalizeHeight(clone, height * def.scale);
    return clone;
  }, [scene, height, def.scale]);

  // Gentle idle bob
  useFrame(({ clock }) => {
    if (groupRef.current) {
      groupRef.current.position.y = position[1] + Math.sin(clock.elapsedTime * 1.2) * 0.03;
    }
  });

  const ringCol = ringColor ?? def.color;

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotation, 0]}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    >
      {/* The GLB model */}
      <primitive object={model} />

      {/* Selection ring */}
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 0.95, 32]} />
          <meshBasicMaterial
            color={ringCol}
            side={THREE.DoubleSide}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}

      {/* Colored glow ring on ground (always visible, subtle) */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.7, 0.85, 32]} />
        <meshBasicMaterial
          color={def.color}
          side={THREE.DoubleSide}
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Name badge */}
      {showName && (
        <Text
          position={[0, height + 0.4, 0]}
          fontSize={0.22}
          color={def.color}
          anchorX="center"
          font={undefined}
          outlineWidth={0.015}
          outlineColor="#000000"
        >
          {def.name}
        </Text>
      )}
    </group>
  );
}

// Preload hint for all unit models
export function preloadUnitModels(defs: UnitDef[]) {
  for (const def of defs) {
    useGLTF.preload(def.mesh);
  }
}
