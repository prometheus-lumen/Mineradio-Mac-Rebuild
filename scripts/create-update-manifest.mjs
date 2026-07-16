import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(packageJson.version || '').trim();
const outputDir = path.join(root, 'dist', 'release', `v${version}`);
const repository = 'prometheus-lumen/Mineradio-Mac-Rebuild';
const requestedArch = String(process.argv[2] || 'all').toLowerCase();
const targets = [
  { key: 'darwin-x64', suffixes: ['_x64.dmg', '_x86_64.dmg'] },
  { key: 'darwin-arm64', suffixes: ['_arm64.dmg', '_aarch64.dmg'] },
];
const expectedKeys = requestedArch === 'all'
  ? targets.map((target) => target.key)
  : (requestedArch === 'x64' || requestedArch === 'x86_64'
      ? ['darwin-x64']
      : (requestedArch === 'arm64' || requestedArch === 'aarch64' ? ['darwin-arm64'] : []));

if (!expectedKeys.length) throw new Error(`不支持的架构参数: ${requestedArch}`);

function sha512(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha512');
    const stream = fs.createReadStream(file);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

const dmgDirs = [
  path.join(root, 'src-tauri', 'target', 'release', 'bundle', 'dmg'),
  path.join(root, 'src-tauri', 'target', 'x86_64-apple-darwin', 'release', 'bundle', 'dmg'),
  path.join(root, 'src-tauri', 'target', 'aarch64-apple-darwin', 'release', 'bundle', 'dmg'),
];
const sourceByKey = {};
for (const target of targets) {
  const matches = [];
  for (const dmgDir of dmgDirs) {
    if (!fs.existsSync(dmgDir)) continue;
    for (const name of fs.readdirSync(dmgDir)) {
      if (!name.startsWith('Mineradio-Rebuild_') || !name.includes(`_${version}_`) || !target.suffixes.some((suffix) => name.endsWith(suffix))) continue;
      const file = path.join(dmgDir, name);
      matches.push({ file, mtime: fs.statSync(file).mtimeMs });
    }
  }
  matches.sort((a, b) => b.mtime - a.mtime);
  if (matches.length) sourceByKey[target.key] = matches[0].file;
}

const missingKeys = expectedKeys.filter((key) => !sourceByKey[key]);
if (missingKeys.length) {
  throw new Error(`版本 ${version} 缺少安装包: ${missingKeys.join(', ')}；原有 Release 输出未改动`);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const assets = {};
for (const key of expectedKeys) {
  const source = sourceByKey[key];
  const name = path.basename(source);
  const destination = path.join(outputDir, name);
  fs.copyFileSync(source, destination);
  assets[key] = {
    name,
    size: fs.statSync(destination).size,
    sha512: await sha512(destination),
  };
}

const manifest = {
  version,
  releaseUrl: `https://github.com/${repository}/releases/tag/v${version}`,
  summary: `Mineradio 二创重构版 ${version}`,
  notes: [],
  assets,
};
const manifestPath = path.join(outputDir, 'Mineradio-update.json');
fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`\nRelease 上传目录: ${outputDir}`);
for (const name of fs.readdirSync(outputDir).sort()) console.log(`- ${name}`);
