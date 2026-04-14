/**
 * GLB Optimization Pipeline
 * Uses @gltf-transform to apply:
 * - Draco mesh compression (smaller file sizes)
 * - Meshopt compression (better GPU decode perf)
 * - Deduplicate accessors/meshes
 * - Remove unused nodes
 * - Quantize vertex data
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, prune, quantize, reorder, weld } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modelsDir = join(__dirname, '..', 'public', 'models');

function findGLB(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findGLB(full));
    } else if (extname(full).toLowerCase() === '.glb') {
      results.push(full);
    }
  }
  return results;
}

async function main() {
  await MeshoptEncoder.ready;

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const files = findGLB(modelsDir);

  console.log(`Found ${files.length} GLB files to optimize:\n`);

  let totalBefore = 0;
  let totalAfter = 0;

  for (const glbPath of files) {
    const name = basename(glbPath);
    const before = statSync(glbPath).size;
    totalBefore += before;

    process.stdout.write(`  ${name} (${(before / 1024).toFixed(0)}KB)...`);

    try {
      const document = await io.read(glbPath);

      // Optimization pipeline
      await document.transform(
        dedup(),             // Remove duplicate accessors, meshes, textures
        prune(),             // Remove unused nodes, materials, etc.
        weld({ tolerance: 0.0001 }), // Weld close vertices
        quantize(),          // Quantize vertex positions/normals to uint16
        reorder({ encoder: MeshoptEncoder }), // Optimize vertex order for GPU cache
      );

      await io.write(glbPath, document);
      const after = statSync(glbPath).size;
      totalAfter += after;
      const savings = ((1 - after / before) * 100).toFixed(1);
      console.log(` ${(after / 1024).toFixed(0)}KB (${savings}% smaller)`);
    } catch (err) {
      totalAfter += before; // no savings on error
      console.log(` SKIP (${err.message})`);
    }
  }

  console.log(`\n  Total: ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB (${((1 - totalAfter / totalBefore) * 100).toFixed(1)}% reduction)`);
}

main().catch(console.error);
