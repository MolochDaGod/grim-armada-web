import { useEffect, useState, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

const MATERIAL_PRESETS = {
  player: { color: '#6b7a3a', metalness: 0.3, roughness: 0.7 },
  mutant: { color: '#4a2040', metalness: 0.5, roughness: 0.4, emissive: '#1a0818', emissiveIntensity: 0.3 },
  alien: { color: '#2a4a3a', metalness: 0.6, roughness: 0.3, emissive: '#0a1a10', emissiveIntensity: 0.2 },
  spikeball: { color: '#3a3a3a', metalness: 0.8, roughness: 0.2 },
  weapon: { color: '#2a2a2a', metalness: 0.85, roughness: 0.15 },
  rock: { color: '#5a5a52', roughness: 0.95 },
  cliff: { color: '#4a4a40', roughness: 0.9 },
  tree: { color: '#2a4a1a', roughness: 0.8 },
  bush: { color: '#1a3a0a', roughness: 0.85 },
  wood: { color: '#5a3a1a', roughness: 0.85 },
  metal: { color: '#6a6a6a', metalness: 0.7, roughness: 0.3 },
  concrete: { color: '#7a7a72', roughness: 0.9 },
  barrel: { color: '#3a5a2a', metalness: 0.4, roughness: 0.6 },
  sandbag: { color: '#8a7a5a', roughness: 0.95 },
  structure: { color: '#5a5a5a', metalness: 0.3, roughness: 0.7 },
} as const;

export type MaterialPreset = keyof typeof MATERIAL_PRESETS;

// Cache raw geometry data, not THREE objects (avoids shared-object issues)
const geometryCache = new Map<string, { positions: Float32Array; normals: Float32Array | null; indices: Uint32Array | null; groups: { geo: THREE.BufferGeometry; matrix: THREE.Matrix4 }[] }>();
const loadingCache = new Map<string, Promise<THREE.Group>>();

function loadFBX(url: string): Promise<THREE.Group> {
  if (loadingCache.has(url)) return loadingCache.get(url)!;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    new FBXLoader().load(url, resolve, undefined, reject);
  });
  loadingCache.set(url, promise);
  return promise;
}

function makeMaterial(preset: MaterialPreset): THREE.MeshStandardMaterial {
  const p = MATERIAL_PRESETS[preset];
  return new THREE.MeshStandardMaterial(p as any);
}

function deepCloneFBX(source: THREE.Group, mat: THREE.MeshStandardMaterial): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Each instance gets its own geometry reference but shared material is fine
      child.material = mat;
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}

interface FBXModelProps {
  url: string;
  materialPreset?: MaterialPreset;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  normalizedHeight?: number;
  onClick?: (e: any) => void;
}

export function FBXModel({ url, materialPreset = 'rock', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, normalizedHeight, onClick }: FBXModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState(false);
  const instanceRef = useRef<THREE.Group | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadFBX(url).then((source) => {
      if (cancelled) return;
      const mat = makeMaterial(materialPreset);
      const instance = deepCloneFBX(source, mat);

      // Center at origin
      const box = new THREE.Box3().setFromObject(instance);
      const center = box.getCenter(new THREE.Vector3());
      instance.position.sub(new THREE.Vector3(center.x, box.min.y, center.z)); // sit on ground

      // Scale to normalizedHeight or explicit scale
      if (normalizedHeight) {
        const h = box.getSize(new THREE.Vector3()).y;
        if (h > 0) {
          const s = normalizedHeight / h;
          instance.scale.set(s, s, s);
          instance.position.multiplyScalar(s);
        }
      } else if (typeof scale === 'number') {
        instance.scale.set(scale, scale, scale);
        instance.position.multiplyScalar(scale);
      } else {
        instance.scale.set(scale[0], scale[1], scale[2]);
      }

      instanceRef.current = instance;

      if (groupRef.current) {
        // Remove old children
        while (groupRef.current.children.length > 0) groupRef.current.remove(groupRef.current.children[0]);
        groupRef.current.add(instance);
      }
      setLoaded(true);
    }).catch((err) => {
      if (!cancelled) console.warn(`Failed to load ${url}:`, err);
    });

    return () => { cancelled = true; };
  }, [url, materialPreset, normalizedHeight, scale]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} onClick={onClick} />
  );
}

export { MATERIAL_PRESETS };
