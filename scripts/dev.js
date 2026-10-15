process.env.VITE_CONFIG_NATIVE_IGNORE_WARNING = 'true';

const { spawn } = require('child_process');
const path = require('path');
const esbuild = require('esbuild');
const { createServer } = require('vite');
const electronPath = require('electron');

const rootDir = path.resolve(__dirname, '..');

async function start() {
  console.log('⚡ [Play It] Compiling main & preload with esbuild...');
  const commonOptions = {
    bundle: true,
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: ['electron', 'sqlite3', 'better-sqlite3'],
    logLevel: 'warning',
  };

  const mainContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(rootDir, 'electron/main.ts')],
    outfile: path.join(rootDir, 'dist/electron/main.js'),
    format: 'cjs',
  });

  const preloadContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.join(rootDir, 'electron/preload.ts')],
    outfile: path.join(rootDir, 'dist/electron/preload.js'),
    format: 'cjs',
  });

  await mainContext.rebuild();
  await preloadContext.rebuild();
  await mainContext.watch();
  await preloadContext.watch();
  console.log('⚡ [Play It] Main & preload ready.');

  console.log('⚡ [Play It] Starting in-memory Vite dev server...');
  const viteServer = await createServer({
    configFile: path.join(rootDir, 'vite.config.ts'),
    server: {
      port: 5173,
      strictPort: true,
    },
  });

  await viteServer.listen();
  const localUrl = viteServer.resolvedUrls?.local?.[0] || 'http://localhost:5173/';
  console.log(`⚡ [Play It] Vite active at ${localUrl}`);
  console.log('⚡ [Play It] Spawning Electron window...');

  // Spawn electron without cmd.exe shell so spaces in paths are handled safely by Windows
  const electronProcess = spawn(electronPath, ['.'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'development',
      VITE_DEV_SERVER_URL: localUrl,
    },
  });

  electronProcess.on('close', async (code) => {
    console.log(`⚡ [Play It] Electron window closed (exit code: ${code})`);
    try {
      await viteServer.close();
      await mainContext.dispose();
      await preloadContext.dispose();
    } catch {}
    process.exit(code || 0);
  });

  const cleanup = async () => {
    try {
      electronProcess.kill();
      await viteServer.close();
      await mainContext.dispose();
      await preloadContext.dispose();
    } catch {}
    process.exit(0);
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
}

start().catch((err) => {
  console.error('Fatal error in dev runner:', err);
  process.exit(1);
});
