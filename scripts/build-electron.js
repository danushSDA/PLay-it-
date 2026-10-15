const esbuild = require('esbuild');
const path = require('path');

const isWatch = process.argv.includes('--watch');

async function build() {
  const commonOptions = {
    bundle: true,
    platform: 'node',
    target: 'node20',
    sourcemap: true,
    external: ['electron', 'sqlite3', 'better-sqlite3'],
    logLevel: 'info',
  };

  const mainContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.resolve(__dirname, '../electron/main.ts')],
    outfile: path.resolve(__dirname, '../dist/electron/main.js'),
    format: 'cjs',
  });

  const preloadContext = await esbuild.context({
    ...commonOptions,
    entryPoints: [path.resolve(__dirname, '../electron/preload.ts')],
    outfile: path.resolve(__dirname, '../dist/electron/preload.js'),
    format: 'cjs',
  });

  if (isWatch) {
    await mainContext.watch();
    await preloadContext.watch();
    console.log('⚡ [Play It] Watching electron main and preload...');
  } else {
    await mainContext.rebuild();
    await preloadContext.rebuild();
    await mainContext.dispose();
    await preloadContext.dispose();
    console.log('⚡ [Play It] Built electron main and preload successfully.');
  }
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
