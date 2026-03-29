import { useEffect, useRef, useState, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

// ===== Shared loader instances =====
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
gltfLoader.setDRACOLoader(dracoLoader);

// ===== Cache loaded scenes + animations =====
interface CachedGLTF {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}
const sceneCache = new Map<string, CachedGLTF>();
const loadingCache = new Map<string, Promise<CachedGLTF>>();
const failedUrls = new Set<string>();

function loadGLTF(url: string): Promise<CachedGLTF> {
  if (failedUrls.has(url)) return Promise.reject(new Error(`Previously failed: ${url}`));
  if (loadingCache.has(url)) return loadingCache.get(url)!;

  const promise = new Promise<CachedGLTF>((resolve, reject) => {
    const timeout = setTimeout(() => {
      failedUrls.add(url);
      reject(new Error(`Timeout loading ${url}`));
    }, 15000);

    gltfLoader.load(
      url,
      (gltf) => {
        clearTimeout(timeout);
        const cached: CachedGLTF = {
          scene: gltf.scene,
          animations: gltf.animations || [],
        };
        sceneCache.set(url, cached);
        resolve(cached);
      },
      undefined,
      (err) => {
        clearTimeout(timeout);
        failedUrls.add(url);
        reject(err);
      },
    );
  });
  loadingCache.set(url, promise);
  return promise;
}

function cloneScene(source: THREE.Group): THREE.Group {
  const clone = source.clone(true);
  clone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
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

// ===== Fallback geometry builder =====
function createFallbackMesh(height: number, color = '#887766'): THREE.Group {
  const group = new THREE.Group();
  // Body capsule
  const bodyH = height * 0.55;
  const bodyR = height * 0.15;
  const bodyGeo = new THREE.CapsuleGeometry(bodyR, bodyH, 4, 8);
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.2, transparent: true, opacity: 0.85 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = bodyH / 2 + bodyR;
  body.castShadow = true;
  group.add(body);
  // Head sphere
  const headR = height * 0.12;
  const headGeo = new THREE.SphereGeometry(headR, 8, 8);
  const headMat = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.3, transparent: true, opacity: 0.85 });
  const head = new THREE.Mesh(headGeo, headMat);
  head.position.y = bodyH + bodyR * 2 + headR * 0.7;
  head.castShadow = true;
  group.add(head);
  // Arms
  const armR = height * 0.06;
  const armH = height * 0.35;
  const armGeo = new THREE.CapsuleGeometry(armR, armH, 3, 6);
  [-1, 1].forEach(side => {
    const arm = new THREE.Mesh(armGeo, bodyMat.clone());
    arm.position.set(side * (bodyR + armR * 1.2), bodyH * 0.65 + bodyR, 0);
    arm.castShadow = true;
    group.add(arm);
  });
  // Legs
  const legR = height * 0.07;
  const legH = height * 0.28;
  const legGeo = new THREE.CapsuleGeometry(legR, legH, 3, 6);
  [-1, 1].forEach(side => {
    const leg = new THREE.Mesh(legGeo, bodyMat.clone());
    leg.position.set(side * bodyR * 0.5, legH / 2 + legR, 0);
    leg.castShadow = true;
    group.add(leg);
  });
  return group;
}

// ===== Props =====
interface GLTFModelProps {
  url: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number | [number, number, number];
  normalizedHeight?: number;
  tint?: string;
  fallbackColor?: string;
  showFallback?: boolean;
  onClick?: (e: any) => void;
  onAnimationsLoaded?: (mixer: THREE.AnimationMixer, clips: THREE.AnimationClip[]) => void;
}

export function GLTFModel({
  url,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  normalizedHeight,
  tint,
  fallbackColor = '#887766',
  showFallback = true,
  onClick,
  onAnimationsLoaded,
}: GLTFModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  // Tick animation mixer
  useFrame((_, dt) => {
    if (mixerRef.current) mixerRef.current.update(Math.min(dt, 0.05));
  });

  useEffect(() => {
    let cancelled = false;

    // Show fallback immediately while loading
    if (showFallback && groupRef.current && groupRef.current.children.length === 0) {
      const fb = createFallbackMesh(normalizedHeight || 2, fallbackColor);
      fb.userData.__fallback = true;
      groupRef.current.add(fb);
    }

    loadGLTF(url)
      .then((cached) => {
        if (cancelled) return;
        const instance = cloneScene(cached.scene);

        // Apply optional tint
        if (tint) {
          const tintColor = new THREE.Color(tint);
          instance.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.MeshStandardMaterial;
              if (mat && mat.color) mat.color.multiply(tintColor);
            }
          });
        }

        // Fix materials: ensure side rendering and proper settings
        instance.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const mat = child.material as THREE.MeshStandardMaterial;
            if (mat) {
              // Ensure materials are not invisible
              if (mat.transparent && mat.opacity <= 0) mat.opacity = 1;
              mat.side = THREE.FrontSide;
              mat.needsUpdate = true;
            }
          }
        });

        // Center at origin, sit on ground
        const box = new THREE.Box3().setFromObject(instance);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        instance.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));

        // Scale to normalizedHeight or explicit scale
        if (normalizedHeight) {
          const h = size.y;
          if (h > 0.001) {
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
          // Remove fallback and any previous children
          while (groupRef.current.children.length > 0) groupRef.current.remove(groupRef.current.children[0]);
          groupRef.current.add(instance);
        }

        // Setup animation mixer if model has animations
        if (cached.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(instance);
          mixerRef.current = mixer;
          // Auto-play first animation (usually idle or T-pose)
          const idleClip = cached.animations.find(c => /idle|stand|wait/i.test(c.name)) || cached.animations[0];
          if (idleClip) {
            const action = mixer.clipAction(idleClip);
            action.play();
          }
          onAnimationsLoaded?.(mixer, cached.animations);
        }

        setLoadState('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`Failed to load ${url}:`, err);
        setLoadState('failed');
        // Fallback is already shown, keep it
      });

    return () => {
      cancelled = true;
      if (mixerRef.current) {
        mixerRef.current.stopAllAction();
        mixerRef.current = null;
      }
    };
  }, [url, normalizedHeight, scale, tint]);

  return <group ref={groupRef} position={position} rotation={rotation} onClick={onClick} />;
}

// ===== Standalone fallback character (always visible, no model loading) =====
export function FallbackCharacter({ height = 2, color = '#887766', position = [0, 0, 0] as [number, number, number], rotation = [0, 0, 0] as [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (groupRef.current && groupRef.current.children.length === 0) {
      groupRef.current.add(createFallbackMesh(height, color));
    }
  }, [height, color]);
  return <group ref={groupRef} position={position} rotation={rotation} />;
}

// Backwards-compat alias
export { GLTFModel as FBXModel };
