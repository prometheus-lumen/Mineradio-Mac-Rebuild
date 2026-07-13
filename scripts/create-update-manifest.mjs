import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(packageJson.version || '').trim();
const outputDir = path.join(root, 'dist', 'release', `v${version}`);
const repository = 'prometheus-lumen/Mineradio-Mac-Rebuild';
const targets = [
  { key: 'darwin-x64', dir: 'x86_64-apple-darwin' },
  { key: 'darwin-arm64', dir: 'aarch64-apple-darwin' },
];

function sha512(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha512');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const assets = {};
for (const target of targets) {
  const dmgDir = path.join(root, 'src-tauri', 'target', target.dir, 'release', 'bundle', 'dmg');
  if (!fs.existsSync(dmgDir)) continue;
  const candidates = fs.readdirSync(dmgDir)
    .filter((name) => name.endsWith('.dmg') && name.includes(`_${version}_`));
  if (candidates.length !== 1) continue;

  const name = candidates[0];
  const source = path.join(dmgDir, name);
  const destination = path.join(outputDir, name);
  fs.copyFileSync(source, destination);
  assets[target.key] = {
    name,
    size: fs.statSync(destination).size,
    sha512: await sha512(destination),
  };
}

if (!Object.keys(assets).length) {
  fs.rmSync(outputDir, { recursive: true, force: true });
  throw new Error(`没有找到版本 ${version} 的 DMG，请先运行 npm run build:mac`);
}

const manifest = {
  version,
  releaseUrl: `https://github.com/${repository}/releases/tag/v${version}`,
  summary: `Mineradio ${version}`,
  notes: [],
  assets,
};
const manifestPath = path.join(outputDir, 'Mineradio-update.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nRelease 上传目录: ${outputDir}`);
for (const name of fs.readdirSync(outputDir).sort()) console.log(`- ${name}`);
