/**
 * Grim Armada — unified asset pipeline
 *
 * 1. FBX → GLB (fbx2gltf)
 * 2. GLB optimize per category (resize textures, webp, weld, quantize, meshopt)
 * 3. Standalone textures → resized webp/png (sharp)
 * 4. Emit public/asset-manifest.json for runtime scale + deploy validation
 *
 * Usage: npm run assets:pipeline
 */

import { execSync } from 'child_process';
import {
  readdirSync, statSync, readFileSync, writeFileSync, mkdirSync, unlinkSync,
} from 'fs';
import { join, extname, basename, relative, dirname } from 'path';
import { fileURLToPath } from 'url';
import { platform } from 'os';
import { createHash } from 'crypto';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import {
  dedup, prune, weld, quantize, reorder, simplify, textureCompress, flatten,
} from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { categoryForPath, TEXTURE_RULES } from './asset-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const PUBLIC = join(ROOT, 'public');
const MODELS = join(PUBLIC, 'models');
const TEXTURES = join(PUBLIC, 'textures');
const MANIFEST_PATH = join(PUBLIC, 'asset-manifest.json');

const platDir = platform() === 'win32' ? 'Windows_NT' : platform() === 'darwin' ? 'Darwin' : 'Linux';
const ext = platform() === 'win32' ? '.exe' : '';
const FBX2GLTF = join(ROOT, 'node_modules', 'fbx2gltf', 'bin', platDir, `FBX2glTF${ext}`);

function walk(dir, filter) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full, filter));
    else if (filter(full)) out.push(full);
  }
  return out;
}

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex').slice(0, 12);
}

function textureRuleFor(name) {
  for (const rule of TEXTURE_RULES) {
    if (rule.match.test(name)) return rule;
  }
  return TEXTURE_RULES[TEXTURE_RULES.length - 1];
}

// ── Step 1: FBX → GLB ────────────────────────────────────────────────────────

function convertFbx() {
  const files = walk(MODELS, (p) => extname(p).toLowerCase() === '.fbx');
  console.log(`\n[1/4] FBX → GLB (${files.length} files)`);
  let ok = 0;
  let fail = 0;
  for (const fbxPath of files) {
    const glbPath = fbxPath.replace(/\.fbx$/i, '.glb');
    const name = basename(fbxPath);
    process.stdout.write(`  ${name}...`);
    try {
      execSync(`"${FBX2GLTF}" -i "${fbxPath}" -o "${glbPath}" --binary`, { stdio: 'pipe' });
      console.log(' OK');
      ok++;
    } catch (err) {
      console.log(` SKIP (${err.message?.split('\n')[0] ?? 'failed'})`);
      fail++;
    }
  }
  console.log(`  → ${ok} converted, ${fail} skipped`);
}

// ── Step 2: GLB optimize ─────────────────────────────────────────────────────

async function optimizeGlb(sharp) {
  await MeshoptEncoder.ready;
  await MeshoptSimplifier.ready;

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const files = walk(MODELS, (p) => extname(p).toLowerCase() === '.glb');

  console.log(`\n[2/4] GLB optimize (${files.length} files)`);
  let totalBefore = 0;
  let totalAfter = 0;

  for (const glbPath of files) {
    const rel = relative(PUBLIC, glbPath).replace(/\\/g, '/');
    const cat = categoryForPath(rel);
    const name = basename(glbPath);
    const before = statSync(glbPath).size;
    totalBefore += before;
    process.stdout.write(`  ${name} [${cat.id}, tex≤${cat.maxTexture}]...`);

    try {
      const document = await io.read(glbPath);
      const transforms = [
        dedup(),
        flatten(),
        prune(),
        weld({ tolerance: 0.0001 }),
      ];
      if (cat.simplifyRatio < 1) {
        transforms.push(simplify({ ratio: cat.simplifyRatio, simplifier: MeshoptSimplifier }));
      }
      if (sharp) {
        transforms.push(
          textureCompress({
            encoder: sharp,
            targetFormat: 'webp',
            resize: [cat.maxTexture, cat.maxTexture],
          }),
        );
      }
      transforms.push(quantize(), reorder({ encoder: MeshoptEncoder }));
      await document.transform(...transforms);
      await io.write(glbPath, document);
      const after = statSync(glbPath).size;
      totalAfter += after;
      const pct = ((1 - after / before) * 100).toFixed(0);
      console.log(` ${(after / 1024).toFixed(0)}KB (−${pct}%)`);
    } catch (err) {
      totalAfter += before;
      console.log(` SKIP (${err.message})`);
    }
  }

  console.log(
    `  → ${(totalBefore / 1024 / 1024).toFixed(1)}MB → ${(totalAfter / 1024 / 1024).toFixed(1)}MB`,
  );
}

// ── Step 3: Standalone textures ──────────────────────────────────────────────

async function optimizeTextures(sharp) {
  if (!sharp) {
    console.log('\n[3/4] Textures — skipped (sharp not installed)');
    return;
  }
  if (!statSync(TEXTURES, { throwIfExists: false })) {
    console.log('\n[3/4] Textures — none found');
    return;
  }

  const files = walk(TEXTURES, (p) => /\.(png|jpe?g|tiff?)$/i.test(p));
  console.log(`\n[3/4] Textures (${files.length} files)`);

  for (const texPath of files) {
    const name = basename(texPath);
    const rule = textureRuleFor(name);
    const before = statSync(texPath).size;
    process.stdout.write(`  ${name} → max ${rule.maxSize}px ${rule.format}...`);

    try {
      const img = sharp(texPath);
      const meta = await img.metadata();
      const needsResize = (meta.width ?? 0) > rule.maxSize || (meta.height ?? 0) > rule.maxSize;
      let pipeline = img.resize({
        width: rule.maxSize,
        height: rule.maxSize,
        fit: 'inside',
        withoutEnlargement: true,
      });

      const outPath = rule.format === 'webp'
        ? texPath.replace(/\.(png|jpe?g|tiff?)$/i, '.webp')
        : texPath;

      if (rule.format === 'webp') {
        pipeline = pipeline.webp({ quality: rule.quality });
      } else {
        pipeline = pipeline.png({ compressionLevel: 9 });
      }

      const buf = await pipeline.toBuffer();
      writeFileSync(outPath, buf);

      if (outPath !== texPath && rule.format === 'webp') {
        try { unlinkSync(texPath); } catch { /* keep original if delete fails */ }
      }

      const after = statSync(outPath).size;
      const action = needsResize || outPath !== texPath ? 'optimized' : 'kept';
      console.log(` ${action} ${(before / 1024).toFixed(0)}→${(after / 1024).toFixed(0)}KB`);
    } catch (err) {
      console.log(` SKIP (${err.message})`);
    }
  }
}

// ── Step 4: Manifest ─────────────────────────────────────────────────────────

function generateManifest() {
  console.log('\n[4/4] asset-manifest.json');

  const presets = {};
  for (const cat of [
    'player', 'enemy', 'weapon', 'terrain-prop', 'structure', 'ship', 'default',
  ]) {
    const rule = categoryForPath(`models/${cat}/placeholder.glb`);
    if (rule.id === cat || cat === 'default') {
      presets[cat] = {
        normalizedHeight: rule.normalizedHeight,
        maxTexture: rule.maxTexture,
      };
    }
  }

  const assets = [];
  const allFiles = [
    ...walk(MODELS, (p) => extname(p).toLowerCase() === '.glb'),
    ...(statSync(TEXTURES, { throwIfExists: false })
      ? walk(TEXTURES, (p) => /\.(glb|webp|png|jpe?g)$/i.test(p))
      : []),
  ];

  for (const filePath of allFiles) {
    const rel = relative(PUBLIC, filePath).replace(/\\/g, '/');
    const cat = categoryForPath(rel);
    assets.push({
      path: `/${rel}`,
      bytes: statSync(filePath).size,
      hash: sha256(filePath),
      category: cat.id,
      normalizedHeight: cat.normalizedHeight,
    });
  }

  const manifest = {
    version: 1,
    game: 'grim-armada',
    generated: new Date().toISOString(),
    cdnPrefix: 'grim-armada',
    presets,
    assets,
  };

  writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2));
  const totalMb = assets.reduce((s, a) => s + a.bytes, 0) / 1024 / 1024;
  console.log(`  → ${assets.length} assets, ${totalMb.toFixed(1)}MB total`);
}

async function main() {
  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.warn('[pipeline] sharp unavailable — skipping texture compression');
  }

  console.log('═══ Grim Armada Asset Pipeline ═══');
  convertFbx();
  await optimizeGlb(sharp);
  await optimizeTextures(sharp);
  generateManifest();
  console.log('\nDone. Run `npm run build` to ship.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});