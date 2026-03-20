import { useEffect, useState, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';

// Material presets for models without textures
const MATERIAL_PRESETS = {
  player: new THREE.MeshStandardMaterial({ color: '#6b7a3a', metalness: 0.3, roughness: 0.7 }), // military green
  mutant: new THREE.MeshStandardMaterial({ color: '#4a2040', metalness: 0.5, roughness: 0.4, emissive: '#1a0818', emissiveIntensity: 0.3 }),
  alien: new THREE.MeshStandardMaterial({ color: '#2a4a3a', metalness: 0.6, roughness: 0.3, emissive: '#0a1a10', emissiveIntensity: 0.2 }),
  spikeball: new THREE.MeshStandardMaterial({ color: '#3a3a3a', metalness: 0.8, roughness: 0.2 }),
  weapon: new THREE.MeshStandardMaterial({ color: '#2a2a2a', metalness: 0.85, roughness: 0.15 }),
  rock: new THREE.MeshStandardMaterial({ color: '#5a5a52', roughness: 0.95 }),
  cliff: new THREE.MeshStandardMaterial({ color: '#4a4a40', roughness: 0.9 }),
  tree: new THREE.MeshStandardMaterial({ color: '#2a4a1a', roughness: 0.8 }),
  bush: new THREE.MeshStandardMaterial({ color: '#1a3a0a', roughness: 0.85 }),
  wood: new THREE.MeshStandardMaterial({ color: '#5a3a1a', roughness: 0.85 }),
  metal: new THREE.MeshStandardMaterial({ color: '#6a6a6a', metalness: 0.7, roughness: 0.3 }),
  concrete: new THREE.MeshStandardMaterial({ color: '#7a7a72', roughness: 0.9 }),
  barrel: new THREE.MeshStandardMaterial({ color: '#3a5a2a', metalness: 0.4, roughness: 0.6 }),
  sandbag: new THREE.MeshStandardMaterial({ color: '#8a7a5a', roughness: 0.95 }),
  structure: new THREE.MeshStandardMaterial({ color: '#5a5a5a', metalness: 0.3, roughness: 0.7 }),
};

export type MaterialPreset = keyof typeof MATERIAL_PRESETS;

const modelCache = new Map<string, THREE.Group>();

export function useFBXModel(url: string, materialPreset: MaterialPreset = 'rock'): THREE.Group | null {
  const [model, setModel] = useState<THREE.Group | null>(null);

  useEffect(() => {
    if (modelCache.has(url)) {
      setModel(modelCache.get(url)!.clone());
      return;
    }

    const loader = new FBXLoader();
    loader.load(
      url,
      (fbx) => {
        // Normalize scale — FBX files often come in at weird scales
        const box = new THREE.Box3().setFromObject(fbx);
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Apply material preset
        const mat = MATERIAL_PRESETS[materialPreset];
        fbx.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = mat;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        modelCache.set(url, fbx);
        setModel(fbx.clone());
      },
      undefined,
      (error) => {
        console.warn(`Failed to load ${url}:`, error);
      }
    );
  }, [url, materialPreset]);

  return model;
}

interface FBXModelProps {
  url: string;
  materialPreset?: MaterialPreset;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  normalizedHeight?: number; // Scale model to this height
  onClick?: (e: THREE.Event) => void;
}

export function FBXModel({ url, materialPreset = 'rock', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, normalizedHeight, onClick }: FBXModelProps) {
  const model = useFBXModel(url, materialPreset);

  const processedModel = useMemo(() => {
    if (!model) return null;
    const clone = model.clone();

    if (normalizedHeight) {
      const box = new THREE.Box3().setFromObject(clone);
      const currentHeight = box.getSize(new THREE.Vector3()).y;
      if (currentHeight > 0) {
        const s = normalizedHeight / currentHeight;
        clone.scale.set(s, s, s);
      }
    } else if (typeof scale === 'number') {
      clone.scale.set(scale, scale, scale);
    } else {
      clone.scale.set(scale[0], scale[1], scale[2]);
    }

    return clone;
  }, [model, scale, normalizedHeight]);

  if (!processedModel) return null;

  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      <primitive object={processedModel} />
    </group>
  );
}

export { MATERIAL_PRESETS };
