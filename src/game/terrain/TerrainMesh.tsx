/**
 * TerrainMesh — renders the VoxelSpace-inspired heightmap terrain.
 *
 * Features:
 * - 300×300 plane displaced by procedural FBM heightmap
 * - Biome-blended colormap texture (colony, wasteland, forest, industrial)
 * - Procedural tree, bush, rock, ore, herb, crate placement
 * - Object storage texture loading with fallback
 * - Properly computed vertex normals for lighting
 */

import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFModel } from '../scene/ModelLoader';
import {
  generateTerrainData,
  generateColormap,
  applyHeightmapToGeometry,
  generatePropSpawns,
  TERRAIN_SIZE,
  TERRAIN_SEGMENTS,
  MAX_HEIGHT,
  type TerrainData,
  type PropSpawn,
} from './TerrainGenerator';

// ── Model paths for props ─────────────────────────────────────────────────────
const PROP_MODELS: Record<PropSpawn['type'], string> = {
  tree: '/models/terrain/tree1.glb',
  bush: '/models/terrain/bush.glb',
  rock: '/models/terrain/rock1.glb',
  ore: '/models/terrain/rock2.glb',    // different rock for ore nodes
  herb: '/models/terrain/bush.glb',     // reuse bush with tint
  crate: '/models/terrain/barrel.glb',  // barrel as supply crate
};

const PROP_TINTS: Partial<Record<PropSpawn['type'], string>> = {
  ore: '#8888cc',   // blue-ish tint for ore
  herb: '#44cc44',  // green tint for herbs
  crate: '#cc8844', // orange-ish for crates
};

// ── Shared terrain data singleton (generated once, reused) ────────────────────
let _cachedTerrain: TerrainData | null = null;
let _cachedProps: PropSpawn[] | null = null;

export function getTerrainData(): TerrainData {
  if (!_cachedTerrain) _cachedTerrain = generateTerrainData(42);
  return _cachedTerrain;
}

export function getTerrainProps(): PropSpawn[] {
  if (!_cachedProps) _cachedProps = generatePropSpawns(getTerrainData(), 42);
  return _cachedProps;
}

/** Get height at world position (for character controller / enemy AI) */
export function getWorldHeight(x: number, z: number): number {
  return getTerrainData().getHeight(x, z);
}

// ── Tileable texture paths (copied from THREE.Terrain-fork) ───────────────────
const TEX_PATHS = {
  grass: '/textures/terrain/grass.jpg',
  sand:  '/textures/terrain/sand.jpg',
  stone: '/textures/terrain/stone.jpg',
  snow:  '/textures/terrain/snow.jpg',
};

// ── Biome splatmap shader — blends 4 tileable textures by height + biome ──────
const SPLAT_VERTEX = /* glsl */`
  varying vec2 vUV;
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  void main() {
    vUV = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const SPLAT_FRAGMENT = /* glsl */`
  uniform sampler2D tGrass;
  uniform sampler2D tSand;
  uniform sampler2D tStone;
  uniform sampler2D tSnow;
  uniform sampler2D tColormap;
  uniform float maxHeight;
  uniform float terrainSize;
  uniform float texRepeat;

  varying vec2 vUV;
  varying vec3 vWorldPos;
  varying vec3 vNormal;

  void main() {
    // Tiled UV for detail textures
    vec2 tiledUV = vUV * texRepeat;

    // Sample all 4 tileable textures
    vec4 grass = texture2D(tGrass, tiledUV);
    vec4 sand  = texture2D(tSand, tiledUV);
    vec4 stone = texture2D(tStone, tiledUV);
    vec4 snow  = texture2D(tSnow, tiledUV);

    // Colormap for biome tinting
    vec4 biomeColor = texture2D(tColormap, vUV);

    // Height-based blending (0=low, 1=high)
    float h = clamp(vWorldPos.y / maxHeight, 0.0, 1.0);

    // Slope factor — steep surfaces get stone
    float slope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
    float slopeFactor = smoothstep(0.3, 0.7, slope);

    // Biome detection from world X/Z quadrant
    float bx = step(0.0, vWorldPos.x);  // 0=west, 1=east
    float bz = step(0.0, vWorldPos.z);  // 0=north, 1=south

    // Base texture blend by height bands
    vec4 baseColor;
    if (h < 0.2) {
      // Low areas: sand/dirt
      baseColor = mix(sand, grass, smoothstep(0.05, 0.2, h));
    } else if (h < 0.6) {
      // Mid areas: grass
      baseColor = grass;
    } else if (h < 0.8) {
      // High areas: stone
      baseColor = mix(grass, stone, smoothstep(0.6, 0.8, h));
    } else {
      // Peaks: snow
      baseColor = mix(stone, snow, smoothstep(0.8, 0.95, h));
    }

    // Steep slopes always get stone
    baseColor = mix(baseColor, stone, slopeFactor);

    // Biome tint from colormap — multiply blend for natural coloring
    vec3 tinted = baseColor.rgb * (biomeColor.rgb * 1.8 + 0.4);

    // Wasteland (east-north) gets more sand
    float wastelandFactor = bx * (1.0 - bz) * 0.5;
    tinted = mix(tinted, sand.rgb * biomeColor.rgb * 1.6, wastelandFactor);

    // Forest (west-south) gets brighter grass
    float forestFactor = (1.0 - bx) * bz * 0.3;
    tinted = mix(tinted, grass.rgb * vec3(0.8, 1.1, 0.7), forestFactor);

    // Simple diffuse lighting from normal
    float NdotL = max(dot(vNormal, normalize(vec3(0.5, 1.0, 0.3))), 0.0);
    float ambient = 0.35;
    float light = ambient + NdotL * 0.65;

    gl_FragColor = vec4(tinted * light, 1.0);
  }
`;

// ── TerrainMesh Component ─────────────────────────────────────────────────────

export function TerrainMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const geoRef = useRef<THREE.PlaneGeometry | null>(null);
  const cmapRef = useRef<THREE.CanvasTexture | null>(null);
  const [ready, setReady] = useState(false);
  const [material, setMaterial] = useState<THREE.ShaderMaterial | null>(null);

  // Generate terrain data imperatively (avoid returning Three.js objects from useMemo
  // which causes circular JSON serialization crash in R3F reconciler)
  useEffect(() => {
    const t = getTerrainData();

    // Use 128 segments instead of 256 to prevent WebGL context loss (16K vs 66K vertices)
    const SEGMENTS = 128;
    const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, SEGMENTS, SEGMENTS);
    applyHeightmapToGeometry(geo, t);
    geoRef.current = geo;

    const cmap = generateColormap(t);
    cmapRef.current = cmap;
    setReady(true);

    // Load tileable textures and create splatmap shader
    const loader = new THREE.TextureLoader();
    const loadTex = (path: string): Promise<THREE.Texture> =>
      new Promise((resolve) => {
        loader.load(path, (tex) => {
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.RepeatWrapping;
          tex.minFilter = THREE.LinearMipmapLinearFilter;
          tex.magFilter = THREE.LinearFilter;
          tex.colorSpace = THREE.SRGBColorSpace;
          resolve(tex);
        }, undefined, () => {
          const fallback = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
          fallback.needsUpdate = true;
          resolve(fallback);
        });
      });

    Promise.all([
      loadTex(TEX_PATHS.grass),
      loadTex(TEX_PATHS.sand),
      loadTex(TEX_PATHS.stone),
      loadTex(TEX_PATHS.snow),
    ]).then(([grass, sand, stone, snow]) => {
      const mat = new THREE.ShaderMaterial({
        vertexShader: SPLAT_VERTEX,
        fragmentShader: SPLAT_FRAGMENT,
        uniforms: {
          tGrass: { value: grass },
          tSand: { value: sand },
          tStone: { value: stone },
          tSnow: { value: snow },
          tColormap: { value: cmap },
          maxHeight: { value: MAX_HEIGHT },
          terrainSize: { value: TERRAIN_SIZE },
          texRepeat: { value: 40.0 },
        },
      });
      setMaterial(mat);
    });

    return () => { geo.dispose(); };
  }, []);

  if (!ready || !geoRef.current) return null;

  return (
    <mesh
      ref={meshRef}
      geometry={geoRef.current}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      material={material ?? undefined}
    >
      {/* Fallback material while textures load */}
      {!material && cmapRef.current && (
        <meshStandardMaterial
          map={cmapRef.current}
          roughness={0.92}
          metalness={0.02}
          side={THREE.FrontSide}
        />
      )}
    </mesh>
  );
}

// ── Procedural Props — trees, bushes, rocks, harvestables ─────────────────────

export function TerrainProps() {
  const props = useMemo(() => getTerrainProps(), []);

  // Limit render count for performance — keep low to prevent WebGL context loss
  // (full LOD / instancing system can be added later)
  const MAX_RENDERED = 80;

  return (
    <group>
      {props.slice(0, MAX_RENDERED).map((p, i) => (
        <GLTFModel
          key={`prop-${i}`}
          url={PROP_MODELS[p.type]}
          position={p.position}
          normalizedHeight={p.scale}
          rotation={[0, p.rotation, 0]}
          tint={PROP_TINTS[p.type]}
          showFallback={false}
        />
      ))}
    </group>
  );
}

// ── Harvestable Nodes (interactive — glow ring + E to interact) ───────────────

export function HarvestableNodes() {
  const props = useMemo(() => {
    return getTerrainProps().filter(p => ['ore', 'herb', 'crate'].includes(p.type));
  }, []);

  return (
    <group>
      {props.map((p, i) => (
        <group key={`harvest-${i}`} position={p.position}>
          {/* Glow ring on ground under harvestable */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[0.8, 1.0, 16]} />
            <meshBasicMaterial
              color={p.type === 'ore' ? '#4488ff' : p.type === 'herb' ? '#44ff44' : '#ffaa44'}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ── Full Terrain Group (mesh + props + harvestables) ──────────────────────────

export default function FullTerrain() {
  return (
    <group>
      <TerrainMesh />
      <TerrainProps />
      <HarvestableNodes />
    </group>
  );
}
