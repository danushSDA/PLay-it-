const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('db:get-settings', () => ({
  theme: 'citrus',
  accentColor: '#FF9A1F',
  blurStrength: 32,
  glassOpacity: 0.35,
  waveEffects: true,
  reduceTransparency: false,
  useWindowsAcrylic: false,
}));
ipcMain.handle('db:get-tracks', () => []);
ipcMain.handle('db:get-videos', () => []);
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

app.on('window-all-closed', (e) => e.preventDefault());

const outDir = path.join(__dirname, '../screenshots_verified');

async function captureTab(tabName, filename) {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
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
  `);
  await new Promise((r) => setTimeout(r, 1200));

  const img = await win.webContents.capturePage();
  fs.writeFileSync(path.join(outDir, filename), img.toPNG());
  console.log(`✅ ${filename} captured (${tabName})`);
  win.close();
  await new Promise((r) => setTimeout(r, 400));
}

app.whenReady().then(async () => {
  try {
    await captureTab('videos', 'tab_videos.png');
    await captureTab('albums', 'tab_albums.png');
    await captureTab('playlists', 'tab_playlists.png');
    await captureTab('favorites', 'tab_favorites.png');
    console.log('🎉 ALL LIBRARY TABS CAPTURED!');
  } catch (err) {
    console.error('Capture error:', err);
  } finally {
    app.exit(0);
  }
});
