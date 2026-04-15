/**
 * TerrainGenerator — VoxelSpace-inspired procedural terrain.
 *
 * Generates a heightmap + colormap as canvas textures, then builds a
 * displacement-mapped Three.js plane mesh with biome-blended colors.
 *
 * Inspired by https://github.com/s-macke/VoxelSpace — but running at
 * higher resolution (2048×2048) and outputting actual 3D geometry instead
 * of column-based rasterization.
 *
 * Object storage textures loaded from the Grudge ObjectStore CDN when
 * available, with procedural fallback.
 */

import * as THREE from 'three';
import { OBJECTSTORE_URL } from '../../lib/grudge-services';

// ── Config ────────────────────────────────────────────────────────────────────
export const TERRAIN_SIZE = 300;         // world units (300×300)
export const TERRAIN_SEGMENTS = 256;     // vertex grid resolution
export const HEIGHTMAP_RES = 512;        // texture resolution for heightmap
export const MAX_HEIGHT = 12;            // maximum terrain elevation
export const WATER_LEVEL = -0.5;         // anything below this is "water"

// ── Biome definitions ─────────────────────────────────────────────────────────
export interface BiomeDef {
  name: string;
  groundColor: string;
  lowColor: string;   // valleys
  highColor: string;  // peaks
  treeChance: number; // 0..1 probability per valid cell
  harvestChance: number;
  noiseScale: number; // frequency multiplier
}

export const BIOMES: Record<string, BiomeDef> = {
  colony: {
    name: 'Colony Base',
    groundColor: '#1a2a1a',
    lowColor: '#0e1a0a',
    highColor: '#2a3a22',
    treeChance: 0.02,
    harvestChance: 0.005,
    noiseScale: 1.0,
  },
  wasteland: {
    name: 'Wasteland',
    groundColor: '#3a2a1a',
    lowColor: '#2a1a0a',
    highColor: '#5a4a2a',
    treeChance: 0.005,
    harvestChance: 0.01,
    noiseScale: 1.5,
  },
  forest: {
    name: 'Dense Forest',
    groundColor: '#1a3a1a',
    lowColor: '#0a2a08',
    highColor: '#2a4a1a',
    treeChance: 0.08,
    harvestChance: 0.03,
    noiseScale: 0.8,
  },
  industrial: {
    name: 'Industrial Ruins',
    groundColor: '#2a2a2a',
    lowColor: '#1a1a1a',
    highColor: '#4a4a3a',
    treeChance: 0.01,
    harvestChance: 0.02,
    noiseScale: 2.0,
  },
};

// ── Simplex-like noise (fast 2D value noise with smoothstep) ──────────────────

function hash2D(x: number, y: number): number {
  let n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;

  // Smoothstep
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);

  const a = hash2D(ix, iy);
  const b = hash2D(ix + 1, iy);
  const c = hash2D(ix, iy + 1);
  const d = hash2D(ix + 1, iy + 1);

  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

/**
 * Fractal Brownian Motion — multiple octaves of noise.
 * This is the core of the VoxelSpace heightmap generation at higher resolution.
 */
function fbm(x: number, y: number, octaves = 6, lacunarity = 2.0, gain = 0.5): number {
  let value = 0;
  let amplitude = 0.5;
  let frequency = 1.0;

  for (let i = 0; i < octaves; i++) {
    value += amplitude * smoothNoise(x * frequency, y * frequency);
    frequency *= lacunarity;
    amplitude *= gain;
  }
  return value;
}

// ── Biome selection based on world position ───────────────────────────────────

function getBiome(worldX: number, worldZ: number): BiomeDef {
  // 4 quadrants: NW=colony, NE=wasteland, SW=forest, SE=industrial
  if (worldX <= 0 && worldZ <= 0) return BIOMES.colony;
  if (worldX > 0 && worldZ <= 0) return BIOMES.wasteland;
  if (worldX <= 0 && worldZ > 0) return BIOMES.forest;
  return BIOMES.industrial;
}

function getBiomeBlend(worldX: number, worldZ: number): [BiomeDef, BiomeDef, number, number] {
  // Smooth blend at biome boundaries
  const blendRadius = 20;
  const bx = Math.max(0, Math.min(1, (worldX + blendRadius) / (blendRadius * 2)));
  const bz = Math.max(0, Math.min(1, (worldZ + blendRadius) / (blendRadius * 2)));
  const biomeNW = BIOMES.colony;
  const biomeNE = BIOMES.wasteland;
  const biomeSW = BIOMES.forest;
  const biomeSE = BIOMES.industrial;

  // Bilinear blend
  const topBiome = bx < 0.5 ? biomeNW : biomeNE;
  const botBiome = bx < 0.5 ? biomeSW : biomeSE;
  return [topBiome, botBiome, bx, bz];
}

// ── Generate heightmap as Float32Array ────────────────────────────────────────

export interface TerrainData {
  heightmap: Float32Array;  // HEIGHTMAP_RES × HEIGHTMAP_RES
  width: number;
  height: number;
  /** Get interpolated height at world position */
  getHeight: (worldX: number, worldZ: number) => number;
}

export function generateTerrainData(seed = 42): TerrainData {
  const w = HEIGHTMAP_RES;
  const h = HEIGHTMAP_RES;
  const data = new Float32Array(w * h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Map pixel to world coords
      const wx = (x / w - 0.5) * TERRAIN_SIZE;
      const wz = (y / h - 0.5) * TERRAIN_SIZE;

      const biome = getBiome(wx, wz);

      // FBM noise — VoxelSpace heightmap concept at higher resolution
      const nx = (x / w) * 4 * biome.noiseScale + seed;
      const ny = (y / h) * 4 * biome.noiseScale + seed * 0.7;
      let elevation = fbm(nx, ny, 6) * MAX_HEIGHT;

      // Flatten center area (spawn zone)
      const distFromCenter = Math.sqrt(wx * wx + wz * wz);
      if (distFromCenter < 30) {
        const flattenT = Math.max(0, 1 - distFromCenter / 30);
        elevation *= (1 - flattenT * flattenT);
      }

      // Colony zone — slightly flattened
      if (wx < 0 && wz < 0 && distFromCenter < 60) {
        elevation *= 0.4;
      }

      data[y * w + x] = elevation;
    }
  }

  // Smooth pass (box blur) for natural look
  const smoothed = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += data[(y + dy) * w + (x + dx)];
        }
      }
      smoothed[y * w + x] = sum / 9;
    }
  }

  return {
    heightmap: smoothed,
    width: w,
    height: h,
    getHeight(worldX: number, worldZ: number): number {
      const u = (worldX / TERRAIN_SIZE + 0.5);
      const v = (worldZ / TERRAIN_SIZE + 0.5);
      const px = Math.max(0, Math.min(w - 1, u * w));
      const py = Math.max(0, Math.min(h - 1, v * h));
      const ix = Math.floor(px);
      const iy = Math.floor(py);
      const fx = px - ix;
      const fy = py - iy;
      const ix1 = Math.min(ix + 1, w - 1);
      const iy1 = Math.min(iy + 1, h - 1);
      const a = smoothed[iy * w + ix];
      const b = smoothed[iy * w + ix1];
      const c = smoothed[iy1 * w + ix];
      const d = smoothed[iy1 * w + ix1];
      return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
    },
  };
}

// ── Generate colormap as Canvas texture (VoxelSpace colormap concept) ─────────

export function generateColormap(terrain: TerrainData): THREE.CanvasTexture {
  const w = terrain.width;
  const h = terrain.height;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const imgData = ctx.createImageData(w, h);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const wx = (x / w - 0.5) * TERRAIN_SIZE;
      const wz = (y / h - 0.5) * TERRAIN_SIZE;
      const elev = terrain.heightmap[y * w + x];
      const biome = getBiome(wx, wz);

      // Height-based color blending (VoxelSpace colormap concept)
      const t = Math.max(0, Math.min(1, elev / MAX_HEIGHT));
      const low = hexToRGB(biome.lowColor);
      const high = hexToRGB(biome.highColor);
      const base = hexToRGB(biome.groundColor);

      // Blend: low at valleys, base at mid, high at peaks
      let r, g, b;
      if (t < 0.3) {
        const lt = t / 0.3;
        r = low.r + (base.r - low.r) * lt;
        g = low.g + (base.g - low.g) * lt;
        b = low.b + (base.b - low.b) * lt;
      } else {
        const ht = (t - 0.3) / 0.7;
        r = base.r + (high.r - base.r) * ht;
        g = base.g + (high.g - base.g) * ht;
        b = base.b + (high.b - base.b) * ht;
      }

      // Add noise variation for natural look
      const variation = (hash2D(x * 0.1, y * 0.1) - 0.5) * 20;
      r = Math.max(0, Math.min(255, r + variation));
      g = Math.max(0, Math.min(255, g + variation));
      b = Math.max(0, Math.min(255, b + variation));

      const idx = (y * w + x) * 4;
      imgData.data[idx] = r;
      imgData.data[idx + 1] = g;
      imgData.data[idx + 2] = b;
      imgData.data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

// ── Generate heightmap as displacement texture ────────────────────────────────

export function generateHeightmapTexture(terrain: TerrainData): THREE.DataTexture {
  const w = terrain.width;
  const h = terrain.height;
  const data = new Uint8Array(w * h);

  for (let i = 0; i < w * h; i++) {
    data[i] = Math.max(0, Math.min(255, (terrain.heightmap[i] / MAX_HEIGHT) * 255));
  }

  const texture = new THREE.DataTexture(data, w, h, THREE.RedFormat);
  texture.needsUpdate = true;
  return texture;
}

// ── Generate tree + harvestable spawn positions ───────────────────────────────

export interface PropSpawn {
  position: [number, number, number];
  type: 'tree' | 'bush' | 'rock' | 'ore' | 'herb' | 'crate';
  scale: number;
  rotation: number;
  biome: string;
}

export function generatePropSpawns(terrain: TerrainData, seed = 42): PropSpawn[] {
  const spawns: PropSpawn[] = [];
  const step = TERRAIN_SIZE / 80; // ~80×80 grid = 6400 potential positions

  for (let z = -TERRAIN_SIZE / 2; z < TERRAIN_SIZE / 2; z += step) {
    for (let x = -TERRAIN_SIZE / 2; x < TERRAIN_SIZE / 2; x += step) {
      const h = terrain.getHeight(x, z);
      const distFromCenter = Math.sqrt(x * x + z * z);

      // Skip center spawn area
      if (distFromCenter < 15) continue;
      // Skip very steep or very low areas
      if (h < 0.2 || h > MAX_HEIGHT * 0.85) continue;

      const biome = getBiome(x, z);
      const rng = hash2D(x * 0.37 + seed, z * 0.73 + seed);

      // Trees
      if (rng < biome.treeChance) {
        spawns.push({
          position: [x + (rng - 0.5) * step * 0.8, h, z + (hash2D(x, z) - 0.5) * step * 0.8],
          type: 'tree',
          scale: 3 + rng * 5,
          rotation: rng * Math.PI * 2,
          biome: biome.name,
        });
        continue;
      }

      // Bushes
      if (rng < biome.treeChance * 2) {
        spawns.push({
          position: [x + (rng - 0.5) * step, h, z],
          type: 'bush',
          scale: 1 + rng * 2,
          rotation: rng * Math.PI * 2,
          biome: biome.name,
        });
        continue;
      }

      // Harvestable resources
      const rng2 = hash2D(x * 1.23 + seed, z * 0.89 + seed);
      if (rng2 < biome.harvestChance) {
        const types: PropSpawn['type'][] = ['ore', 'herb', 'rock'];
        const typeIdx = Math.floor(rng2 * 100) % types.length;
        spawns.push({
          position: [x, h, z],
          type: types[typeIdx],
          scale: 1 + rng2 * 1.5,
          rotation: rng2 * Math.PI * 2,
          biome: biome.name,
        });
      }

      // Supply crates (rare)
      if (rng2 > 0.98 && distFromCenter > 40) {
        spawns.push({
          position: [x, h, z],
          type: 'crate',
          scale: 1.2,
          rotation: rng2 * Math.PI * 2,
          biome: biome.name,
        });
      }
    }
  }

  return spawns;
}

// ── Apply heightmap displacement to PlaneGeometry ─────────────────────────────

export function applyHeightmapToGeometry(
  geometry: THREE.PlaneGeometry,
  terrain: TerrainData,
): void {
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;

  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const wx = (u - 0.5) * TERRAIN_SIZE;
    const wz = (v - 0.5) * TERRAIN_SIZE;
    const h = terrain.getHeight(wx, wz);
    pos.setZ(i, h); // PlaneGeometry is XY, rotated to XZ — Z becomes height
  }

  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

// ── Utility ───────────────────────────────────────────────────────────────────

function hexToRGB(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

// ── Object Storage texture URLs (from Grudge backend) ─────────────────────────

export const TERRAIN_TEXTURES = {
  /** Ground textures from object storage */
  groundDirt: `${OBJECTSTORE_URL}/textures/terrain/ground_dirt.jpg`,
  groundGrass: `${OBJECTSTORE_URL}/textures/terrain/ground_grass.jpg`,
  groundSand: `${OBJECTSTORE_URL}/textures/terrain/ground_sand.jpg`,
  groundRock: `${OBJECTSTORE_URL}/textures/terrain/ground_rock.jpg`,
  groundMetal: `${OBJECTSTORE_URL}/textures/terrain/ground_metal.jpg`,

  /** Graveyard ruins texture from Motion */
  graveyardRuins: '/models/graveyard/texture/Texture_MAp_ruins.png',

  /** Dungeon floor textures from Motion */
  dungeonFloorA: '/models/scenes/dungeon/textures/Floor_A_baseColor.png',
  dungeonFloorB: '/models/scenes/dungeon/textures/Floor_B_baseColor.png',
} as const;

/**
 * Try to load a texture from object storage, fall back to procedural.
 */
export async function loadTerrainTexture(url: string): Promise<THREE.Texture | null> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(20, 20);
        resolve(tex);
      },
      undefined,
      () => resolve(null), // fail silently, use procedural
    );
  });
}
