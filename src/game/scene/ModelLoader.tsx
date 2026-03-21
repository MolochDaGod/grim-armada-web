import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ===== Shared loader instances =====
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltfLoader.setDRACOLoader(dracoLoader);

// ===== Cache loaded scenes =====
const sceneCache = new Map<string, THREE.Group>();
const loadingCache = new Map<string, Promise<THREE.Group>>();

function loadGLTF(url: string): Promise<THREE.Group> {
  if (loadingCache.has(url)) return loadingCache.get(url)!;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    gltfLoader.load(
      url,
      (gltf) => {
        sceneCache.set(url, gltf.scene);
        resolve(gltf.scene);
      },
      undefined,
      reject,
    );
  });
  loadingCache.set(url, promise);
  return promise;
}

function cloneScene(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      // Deep clone materials so instances don't share state
      if (Array.isArray(child.material)) {
        child.material = child.material.map((m: THREE.Material) => m.clone());
      } else {
        child.material = child.material.clone();
      }
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  return clone;
}

// ===== Props =====
interface GLTFModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  normalizedHeight?: number;
  tint?: string;
  onClick?: (e: any) => void;
}

export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  normalizedHeight,
  tint,
  onClick,
}: GLTFModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadGLTF(url)
      .then((source) => {
        if (cancelled) return;
        const instance = cloneScene(source);

        // Apply optional tint
        if (tint) {
          const tintColor = new THREE.Color(tint);
          instance.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
              child.material.color.multiply(tintColor);
            }
          });
        }

        // Center at origin, sit on ground
        const box = new THREE.Box3().setFromObject(instance);
        const center = box.getCenter(new THREE.Vector3());
        instance.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));

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

        if (groupRef.current) {
          while (groupRef.current.children.length > 0) groupRef.current.remove(groupRef.current.children[0]);
          groupRef.current.add(instance);
        }
        setLoaded(true);
      })
      .catch((err) => {
        if (!cancelled) console.warn(`Failed to load ${url}:`, err);
      });

    return () => { cancelled = true; };
  }, [url, normalizedHeight, scale, tint]);

  return <group ref={groupRef} position={position} rotation={rotation} onClick={onClick} />;
}

// Backwards-compat alias
export { GLTFModel as FBXModel };
