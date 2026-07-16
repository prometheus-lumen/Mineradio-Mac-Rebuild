import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, transformWithEsbuild } from 'vite';
import { legacySourceOrder } from './src/frontend/legacy-source-order.mjs';
import { legacyStateBindings } from './src/frontend/legacy-state-bindings.mjs';

const repositoryRoot = dirname(fileURLToPath(import.meta.url));
const publicRoot = join(repositoryRoot, 'public');
const outputRoot = join(repositoryRoot, 'dist/frontend');
const mainId = '/@mineradio/main.ts';
const mainPath = join(repositoryRoot, 'src/frontend/main.ts');
const legacyRuntimeId = 'virtual:mineradio/legacy-runtime';
const themeId = '/@mineradio/theme-preload.ts';
const resolvedLegacyRuntimeId = '\0mineradio-legacy-runtime.ts';
const resolvedThemeId = '\0mineradio-theme-preload.ts';
const migratedModulePaths = new Set([
  'shared/api-client',
  'shared/modal',
  'shared/ui-feedback',
  'update/check',
  'update/download',
  'update/format',
  'update/panel',
  'update/presentation',
]);

function sourcePathFromGenerated(relativePath) {
  return join(repositoryRoot, 'src/frontend', `${relativePath}.ts`);
}

async function classicSourceOrder() {
  return legacySourceOrder;
}

async function composeLegacyRuntime(addWatchFile) {
  const orderedPaths = (await classicSourceOrder()).filter((path) => (
    path !== 'core/entry' && !migratedModulePaths.has(path)
  ));
  const sourcePaths = orderedPaths.map(sourcePathFromGenerated);
  sourcePaths.forEach(addWatchFile);
  const sources = await Promise.all(sourcePaths.map(async (path) => {
    const source = await readFile(path, 'utf8');
    return `\n// source: ${relative(repositoryRoot, path)}\n${source}`;
  }));

  sources.unshift(`var ${legacyStateBindings.join(', ')};\n`);
  sources.unshift("import { apiJson } from '@frontend/shared/api-client';\n");
  sources.unshift("import { mineradioEventOptions } from '@frontend/core/lifecycle';\n");
  sources.unshift("import { bindBackdropClose, closeGsapModal, openGsapModal } from '@frontend/shared/modal';\n");
  sources.unshift("import { showToast } from '@frontend/shared/ui-feedback';\n");
  sources.unshift("import { updatePreviewState } from '@frontend/update/state';\n");
  sources.push('\nexport { bootstrapMineradio, disposeMineradio, installMineradioCompatibility };\n');
  return sources.join('\n');
}

async function copyStaticDirectory(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    if (source === join(publicRoot, 'scripts') && entry.name === 'generated') continue;
    const sourcePath = join(source, entry.name);
    const destinationPath = join(destination, entry.name);
    if (entry.isDirectory()) await copyStaticDirectory(sourcePath, destinationPath);
    else if (!entry.name.endsWith('.html')) await cp(sourcePath, destinationPath, { force: false });
  }
}

function mineradioClassicBridge() {
  return {
    name: 'mineradio-classic-to-esm',
    enforce: 'pre',
    resolveId(id) {
      if (id === mainId) return mainPath;
      if (id === legacyRuntimeId) return resolvedLegacyRuntimeId;
      if (id === themeId) return resolvedThemeId;
    },
    async load(id) {
      if (id === resolvedLegacyRuntimeId) {
        return composeLegacyRuntime((path) => this.addWatchFile(path));
      }
      if (id === resolvedThemeId) return readFile(sourcePathFromGenerated('core/theme-preload'), 'utf8');
    },
    async transform(code, id) {
      if (id !== resolvedLegacyRuntimeId && id !== resolvedThemeId) return;
      return transformWithEsbuild(code, id.slice(1), {
        loader: 'ts',
        target: 'es2019',
        sourcemap: true,
      });
    },
    async closeBundle() {
      await copyStaticDirectory(publicRoot, outputRoot);
    },
  };
}

const htmlInputs = Object.fromEntries(
  (await readdir(publicRoot))
    .filter((name) => name.endsWith('.html'))
    .map((name) => [name.replace(/\.html$/, ''), resolve(publicRoot, name)]),
);

export default defineConfig({
  root: publicRoot,
  publicDir: false,
  plugins: [mineradioClassicBridge()],
  clearScreen: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    hmr: { host: '127.0.0.1', port: 5173 },
  },
  build: {
    outDir: outputRoot,
    emptyOutDir: true,
    sourcemap: true,
    target: 'es2019',
    rollupOptions: { input: htmlInputs },
  },
  resolve: {
    alias: { '@frontend': join(repositoryRoot, 'src/frontend') },
  },
});
