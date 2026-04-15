/**
 * BulletDecals — persistent bullet impact marks on world surfaces.
 * Ported from three-fps BulletDecals.js using Three.js DecalGeometry.
 *
 * Usage: mount <BulletDecals /> in scene, call spawnDecal() from weapon fire.
 * Decals are instanced and recycled to avoid memory growth.
 */

import { useRef, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_DECALS = 64;
const DECAL_LIFETIME = 30; // seconds before fade-out
const DECAL_FADE_TIME = 2; // fade-out duration

interface DecalEntry {
  mesh: THREE.Mesh;
  age: number;
  active: boolean;
}

// ── Decal material (reused for all decals) ────────────────────────────────────
const decalMaterial = new THREE.MeshStandardMaterial({
  color: 0x222222,
  roughness: 0.9,
  metalness: 0.1,
  transparent: true,
  depthTest: true,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -4,
  opacity: 0.7,
});

// ── Global decal spawn function (called from EngineLoop on bullet hit) ────────
const _decalQueue: { position: THREE.Vector3; normal: THREE.Vector3 }[] = [];

export function queueBulletDecal(position: THREE.Vector3, normal: THREE.Vector3) {
  _decalQueue.push({ position: position.clone(), normal: normal.clone() });
}

// ── Decal Ring Geometry (simple circle projected onto surface) ─────────────────
// We use a small circle geometry instead of DecalGeometry for simplicity
// (DecalGeometry requires the target mesh reference, which we may not have)
const RING_GEO = new THREE.CircleGeometry(0.08, 8);

export function BulletDecals() {
  const groupRef = useRef<THREE.Group>(null!);
  const poolRef = useRef<DecalEntry[]>([]);
  const poolIdx = useRef(0);

  // Init pool
  useMemo(() => {
    const pool: DecalEntry[] = [];
    for (let i = 0; i < MAX_DECALS; i++) {
      const mesh = new THREE.Mesh(RING_GEO, decalMaterial.clone());
      mesh.visible = false;
      mesh.renderOrder = 999;
      pool.push({ mesh, age: 0, active: false });
    }
    poolRef.current = pool;
  }, []);

  // Add meshes to group on mount
  useFrame(() => {
    if (groupRef.current && poolRef.current[0] && !poolRef.current[0].mesh.parent) {
      for (const entry of poolRef.current) {
        groupRef.current.add(entry.mesh);
      }
    }
  });

  useFrame((_, dt) => {
    // Process queued decals
    while (_decalQueue.length > 0) {
      const { position, normal } = _decalQueue.shift()!;

      // Get next slot from ring buffer
      const entry = poolRef.current[poolIdx.current % MAX_DECALS];
      poolIdx.current++;

      // Position and orient the decal
      entry.mesh.position.copy(position);
      // Offset slightly along normal to prevent z-fighting
      entry.mesh.position.addScaledVector(normal, 0.01);

      // Orient circle to face along the surface normal
      const lookTarget = position.clone().add(normal);
      entry.mesh.lookAt(lookTarget);

      // Random rotation around normal for variety
      entry.mesh.rotateZ(Math.random() * Math.PI * 2);

      // Random size variation (from three-fps: 0.2–0.5 range)
      const scale = 0.6 + Math.random() * 0.8;
      entry.mesh.scale.setScalar(scale);

      // Reset state
      entry.age = 0;
      entry.active = true;
      entry.mesh.visible = true;
      (entry.mesh.material as THREE.MeshStandardMaterial).opacity = 0.7;
    }

    // Age and fade decals
    for (const entry of poolRef.current) {
      if (!entry.active) continue;
      entry.age += dt;

      if (entry.age > DECAL_LIFETIME) {
        const fadeProgress = (entry.age - DECAL_LIFETIME) / DECAL_FADE_TIME;
        (entry.mesh.material as THREE.MeshStandardMaterial).opacity = 0.7 * (1 - fadeProgress);

        if (fadeProgress >= 1) {
          entry.active = false;
          entry.mesh.visible = false;
        }
      }
    }
  });

  return <group ref={groupRef} />;
}
