/**
 * ModelLoader — GLB/GLTF load + skinned-safe clone + AnimationMixer API.
 * Fixes: SkeletonUtils (no T-pose), Meshopt/DRACO, sRGB textures, clip crossfade.
 */
import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ===== Shared loader (single decoder pool) =====
const gltfLoader = new GLTFLoader();
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('/draco/');
dracoLoader.setDecoderConfig({ type: 'wasm' });
try {
  dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
} catch { /* ok */ }
gltfLoader.setDRACOLoader(dracoLoader);
try {
  gltfLoader.setMeshoptDecoder(MeshoptDecoder);
} catch { /* optional */ }

interface CachedGLTF {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}
const sceneCache = new Map<string, CachedGLTF>();
const loadingCache = new Map<string, Promise<CachedGLTF>>();
const failedUrls = new Set<string>();

function loadGLTF(url: string): Promise<CachedGLTF> {
  if (failedUrls.has(url)) return Promise.reject(new Error(`Previously failed: ${url}`));
  if (sceneCache.has(url)) return Promise.resolve(sceneCache.get(url)!);
  if (loadingCache.has(url)) return loadingCache.get(url)!;

  const promise = new Promise<CachedGLTF>((resolve, reject) => {
    const timeout = setTimeout(() => {
      failedUrls.add(url);
      reject(new Error(`Timeout loading ${url}`));
    }, 20000);

    gltfLoader.load(
      url,
      (gltf) => {
        clearTimeout(timeout);
        // Prep template materials color space once
        gltf.scene.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const mat of mats) {
              if (!mat) continue;
              const std = mat as THREE.MeshStandardMaterial;
              for (const key of ['map', 'emissiveMap'] as const) {
                const tex = std[key] as THREE.Texture | null | undefined;
                if (tex && tex.colorSpace !== THREE.SRGBColorSpace) {
                  tex.colorSpace = THREE.SRGBColorSpace;
                  tex.needsUpdate = true;
                }
              }
              // Avoid washed-out / black materials
              if (std.transparent && (std.opacity ?? 1) < 0.05) {
                std.opacity = 1;
                std.transparent = false;
              }
              if (std.metalness !== undefined) std.metalness = Math.min(std.metalness ?? 0, 0.55);
              if (std.roughness !== undefined) std.roughness = Math.max(std.roughness ?? 0.5, 0.35);
            }
          }
        });
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

function cloneSkinned(source: THREE.Group): THREE.Group {
  // SkeletonUtils preserves bone bindings — plain clone() breaks skinned meshes
  const clone = (SkeletonUtils as { clone: (o: THREE.Object3D) => THREE.Object3D }).clone(
    source,
  ) as THREE.Group;
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        mesh.material = Array.isArray(mesh.material)
          ? mesh.material.map((m) => m.clone())
          : mesh.material.clone();
      }
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      // Skinned bounds
      if ((mesh as THREE.SkinnedMesh).isSkinnedMesh && mesh.geometry) {
        mesh.geometry.computeBoundingSphere();
        mesh.geometry.computeBoundingBox();
        if (mesh.geometry.boundingSphere) {
          mesh.geometry.boundingSphere.radius *= 1.2;
        }
      }
    }
  });
  return clone;
}

function createFallbackMesh(height: number, color = '#887766'): THREE.Group {
  const group = new THREE.Group();
  const bodyH = height * 0.55;
  const bodyR = height * 0.15;
  const bodyMat = new THREE.MeshStandardMaterial({
    color, roughness: 0.7, metalness: 0.15,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(bodyR, bodyH, 4, 8), bodyMat);
  body.position.y = bodyH / 2 + bodyR;
  body.castShadow = true;
  group.add(body);
  const headR = height * 0.12;
  const head = new THREE.Mesh(new THREE.SphereGeometry(headR, 8, 8), bodyMat.clone());
  head.position.y = bodyH + bodyR * 2 + headR * 0.7;
  head.castShadow = true;
  group.add(head);
  return group;
}

// ===== Animation controller for a loaded instance =====
export class CharacterMixer {
  mixer: THREE.AnimationMixer;
  actions = new Map<string, THREE.AnimationAction>();
  clips: THREE.AnimationClip[] = [];
  current = '';
  enabled = true;

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    this.clips = clips;
    for (const clip of clips) {
      try {
        clip.optimize?.();
      } catch { /* ok */ }
      const action = this.mixer.clipAction(clip);
      this.actions.set(clip.name, action);
      // Also index by lowercase for fuzzy lookup
      this.actions.set(clip.name.toLowerCase(), action);
    }
  }

  /** Fuzzy play: matches idle/walk/run/attack etc. */
  play(
    nameOrPattern: string,
    opts?: { fade?: number; loop?: boolean; speed?: number },
  ): boolean {
    const fade = opts?.fade ?? 0.2;
    const loop = opts?.loop ?? true;
    const speed = opts?.speed ?? 1;

    let action =
      this.actions.get(nameOrPattern) ||
      this.actions.get(nameOrPattern.toLowerCase()) ||
      null;

    if (!action) {
      const re = new RegExp(nameOrPattern, 'i');
      for (const [name, a] of this.actions) {
        if (re.test(name)) {
          action = a;
          break;
        }
      }
    }
    if (!action) return false;

    const key = action.getClip().name;
    if (this.current === key && action.isRunning()) {
      action.timeScale = speed;
      return true;
    }

    action.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
    action.clampWhenFinished = !loop;
    action.timeScale = speed;
    action.enabled = true;
    action.reset();

    if (this.current) {
      const prev = this.actions.get(this.current) || this.actions.get(this.current.toLowerCase());
      if (prev && prev !== action) {
        action.play();
        prev.crossFadeTo(action, fade, true);
      } else {
        action.fadeIn(fade).play();
      }
    } else {
      action.fadeIn(fade).play();
    }
    this.current = key;
    return true;
  }

  /** Pick best locomotion clip from movement state */
  playLocomotion(moving: boolean, sprinting: boolean): void {
    if (!moving) {
      if (!this.play('idle') && !this.play('stand') && !this.play('wait')) {
        // first clip as idle fallback
        const first = this.clips[0];
        if (first) this.play(first.name);
      }
      return;
    }
    if (sprinting) {
      if (this.play('run') || this.play('sprint')) return;
    }
    if (this.play('walk') || this.play('run') || this.play('move')) return;
  }

  playAttack(): void {
    if (
      !this.play('attack', { loop: false, fade: 0.1 }) &&
      !this.play('shoot', { loop: false }) &&
      !this.play('fire', { loop: false }) &&
      !this.play('hit', { loop: false })
    ) {
      /* no attack clip — procedural layer handles it */
    }
  }

  playDeath(): void {
    this.play('death', { loop: false, fade: 0.15 }) ||
      this.play('die', { loop: false });
  }

  update(dt: number): void {
    if (!this.enabled) return;
    this.mixer.update(dt);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.actions.clear();
  }
}

export interface GLTFModelHandle {
  mixer: CharacterMixer | null;
  root: THREE.Group | null;
}

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
  onAnimationsLoaded?: (mixer: CharacterMixer, clips: THREE.AnimationClip[]) => void;
  /** Auto-play locomotion idle when loaded */
  autoPlayIdle?: boolean;
}

export const GLTFModel = forwardRef<GLTFModelHandle, GLTFModelProps>(function GLTFModel(
  {
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
    autoPlayIdle = true,
  },
  ref,
) {
  const groupRef = useRef<THREE.Group>(null);
  const charMixerRef = useRef<CharacterMixer | null>(null);
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'failed'>('loading');

  useImperativeHandle(ref, () => ({
    get mixer() {
      return charMixerRef.current;
    },
    get root() {
      return groupRef.current;
    },
  }));

  useFrame((_, dt) => {
    charMixerRef.current?.update(Math.min(dt, 0.05));
  });

  useEffect(() => {
    let cancelled = false;

    if (showFallback && groupRef.current && groupRef.current.children.length === 0) {
      const fb = createFallbackMesh(normalizedHeight || 2, fallbackColor);
      fb.userData.__fallback = true;
      groupRef.current.add(fb);
    }

    loadGLTF(url)
      .then((cached) => {
        if (cancelled) return;
        const instance = cloneSkinned(cached.scene);

        if (tint) {
          const tintColor = new THREE.Color(tint);
          instance.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
              if (mat?.color) mat.color.multiply(tintColor);
            }
          });
        }

        // Ground + normalize
        instance.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(instance);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        instance.position.sub(new THREE.Vector3(center.x, box.min.y, center.z));

        if (normalizedHeight) {
          const h = size.y;
          if (h > 0.001) {
            const s = normalizedHeight / h;
            instance.scale.setScalar(s);
            instance.position.multiplyScalar(s);
          }
        } else if (typeof scale === 'number') {
          instance.scale.setScalar(scale);
          instance.position.multiplyScalar(scale);
        } else {
          instance.scale.set(scale[0], scale[1], scale[2]);
        }

        if (groupRef.current) {
          while (groupRef.current.children.length > 0) {
            groupRef.current.remove(groupRef.current.children[0]);
          }
          groupRef.current.add(instance);
        }

        if (cached.animations.length > 0) {
          const cm = new CharacterMixer(instance, cached.animations.map((c) => c.clone()));
          charMixerRef.current = cm;
          if (autoPlayIdle) cm.playLocomotion(false, false);
          onAnimationsLoaded?.(cm, cached.animations);
        }

        setLoadState('loaded');
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn(`Failed to load ${url}:`, err);
        setLoadState('failed');
      });

    return () => {
      cancelled = true;
      charMixerRef.current?.dispose();
      charMixerRef.current = null;
    };
  }, [url, normalizedHeight, scale, tint, autoPlayIdle]);

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={onClick}
      userData={{ loadState }}
    />
  );
});

export function FallbackCharacter({
  height = 2,
  color = '#887766',
  position = [0, 0, 0] as [number, number, number],
  rotation = [0, 0, 0] as [number, number, number],
}) {
  const groupRef = useRef<THREE.Group>(null);
  useEffect(() => {
    if (groupRef.current && groupRef.current.children.length === 0) {
      groupRef.current.add(createFallbackMesh(height, color));
    }
  }, [height, color]);
  return <group ref={groupRef} position={position} rotation={rotation} />;
}

export { GLTFModel as FBXModel };
