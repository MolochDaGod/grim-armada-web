import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join, extname, basename } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { platform } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const modelsDir = join(__dirname, '..', 'public', 'models');

// Find the fbx2gltf binary (platform-specific)
const platDir = platform() === 'win32' ? 'Windows_NT' : platform() === 'darwin' ? 'Darwin' : 'Linux';
const ext = platform() === 'win32' ? '.exe' : '';
const fbx2gltf = join(__dirname, '..', 'node_modules', 'fbx2gltf', 'bin', platDir, `FBX2glTF${ext}`);

function findFBX(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findFBX(full));
    } else if (extname(full).toLowerCase() === '.fbx') {
      results.push(full);
    }
  }
  return results;
}

const files = findFBX(modelsDir);
console.log(`Found ${files.length} FBX files to convert:\n`);

let success = 0;
let failed = 0;

for (const fbxPath of files) {
  const glbPath = fbxPath.replace(/\.fbx$/i, '.glb');
  const name = basename(fbxPath);
  process.stdout.write(`  Converting ${name}...`);
  try {
    execSync(`"${fbx2gltf}" -i "${fbxPath}" -o "${glbPath}" --binary`, { stdio: 'pipe' });
    console.log(' OK');
    success++;
  } catch (err) {
    console.log(` FAILED: ${err.message}`);
    failed++;
  }
}

console.log(`\nDone: ${success} converted, ${failed} failed out of ${files.length} total`);
