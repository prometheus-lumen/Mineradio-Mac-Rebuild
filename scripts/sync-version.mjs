import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, value) => fs.writeFileSync(path.join(root, file), value);
const writeJson = (file, value) => write(file, `${JSON.stringify(value, null, 2)}\n`);

const packageJson = JSON.parse(read('package.json'));
const version = String(packageJson.version || '').trim();
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`package.json 中的版本号无效: ${version || '(空)'}`);
}

const packageLock = JSON.parse(read('package-lock.json'));
packageLock.version = version;
if (packageLock.packages && packageLock.packages['']) packageLock.packages[''].version = version;
writeJson('package-lock.json', packageLock);

const tauriConfig = read('src-tauri/tauri.conf.json').replace(
  /("version"\s*:\s*")[^"]+("\s*,)/,
  `$1${version}$2`,
);
write('src-tauri/tauri.conf.json', tauriConfig);

const cargoToml = read('src-tauri/Cargo.toml').replace(
  /(^\[package\][\s\S]*?^version\s*=\s*")[^"]+("$)/m,
  `$1${version}$2`,
);
write('src-tauri/Cargo.toml', cargoToml);

const cargoLock = read('src-tauri/Cargo.lock').replace(
  /(\[\[package\]\]\nname = "mineradio"\nversion = ")[^"]+("\n)/,
  `$1${version}$2`,
);
write('src-tauri/Cargo.lock', cargoLock);

const appJs = read('public/scripts/app.js')
  .replace(/(^\s*currentVersion:\s*')[^']+(',?$)/m, `$1${version}$2`)
  .replace(/(^\s*version:\s*')[^']+(',?$)/m, `$1${version}$2`);
write('public/scripts/app.js', appJs);

const indexHtml = read('public/index.html').replace(
  /(<div id="update-modal-version" class="update-version">)v?[^<]+(<\/div>)/,
  `$1v${version}$2`,
);
write('public/index.html', indexHtml);

console.log(`版本号已从 package.json 同步为 ${version}`);
