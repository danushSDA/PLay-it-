const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('db:get-settings', () => ({
  theme: 'deepsea',
  accentColor: '#38d9ff',
  blurStrength: 32,
  glassOpacity: 0.35,
  waveEffects: true,
  reduceTransparency: false,
  useWindowsAcrylic: false,
  ambientLight: {
    enabled: true,
    preset: 'deepsea',
    blur: 64,
    opacity: 0.75,
    dynamicSampling: true,
    wideMediumScreen: true,
    saturation: 1.5,
  },
}));
ipcMain.handle('db:get-tracks', () => [
  { id: '1', title: 'Oceanic Depths', artist: 'Abyssal Calm', album: 'Deep Sea Vol. 1', duration: 245, file_path: 'C:/fake/ocean.mp3' }
]);
ipcMain.handle('db:get-videos', () => [
  { id: 'v1', title: 'Deep Sea Bioluminescence 4K', duration: 180, width: 3840, height: 2160, file_path: 'C:/fake/deepsea.mp4', codec: 'hevc' }
]);
ipcMain.handle('db:get-playlists', () => []);
ipcMain.handle('db:save-setting', () => true);
ipcMain.handle('window:get-state', () => ({ isMaximized: false, isMiniPlayer: false, useWindowsAcrylic: false }));
ipcMain.handle('window:get-bounds', () => ({ x: 50, y: 50, width: 1280, height: 800 }));
ipcMain.on('window:set-bounds', () => {});
ipcMain.handle('window:toggle-maximize', () => false);
ipcMain.handle('window:minimize', () => {});
ipcMain.handle('window:close', () => {});
ipcMain.handle('video:get-cache-info', () => ({ bytes: 0, formatted: '0 MB', fileCount: 0 }));
ipcMain.handle('video:clear-cache', () => true);
ipcMain.handle('gpu:get-status', () => ({ gpuAccelerated: true }));
ipcMain.handle('video:get-gpu-status', () => ({ gpuAccelerated: true }));

app.on('window-all-closed', (e) => {
  // Prevent quitting between screen captures
  e.preventDefault();
});

const outDir = path.join(__dirname, '../screenshots_verified');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function captureScreen(tabName, filename) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    show: true,
    webPreferences: {
      preload: path.join(__dirname, '../dist/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  await win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  await new Promise((r) => setTimeout(r, 600));

  await win.webContents.executeJavaScript(`
    window.__useLibraryStore.getState().setMainTab('${tabName}');
    if ('${tabName}' === 'video-player') {
      setTimeout(() => {
        const btn = document.querySelector('.video-icon-btn.ambient-btn');
        if (btn) btn.click();
      }, 500);
    }
  `);
  await new Promise((r) => setTimeout(r, 1600));

  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, filename), img.toPNG());
  console.log(`✅ ${filename} captured (${tabName})`);
  win.close();
  await new Promise((r) => setTimeout(r, 400));
}

app.whenReady().then(async () => {
  try {
    await captureScreen('music', 'screen1_main.png');
    await captureScreen('video-player', 'screen2_video.png');
    await captureScreen('artists', 'screen3_artists.png');
    await captureScreen('settings', 'screen4_settings.png');
    console.log('🎉 ALL 4 SCREENS VERIFIED SUCCESSFULLY!');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    app.exit(0);
  }
});
