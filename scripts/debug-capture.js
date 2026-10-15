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

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '../dist/electron/preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  win.webContents.on('console-message', (e, level, msg, line, src) => {
    console.log(`[Renderer Console L${level}] ${msg} (${src}:${line})`);
  });

  await win.loadFile(path.join(__dirname, '../dist/renderer/index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  console.log('--- Setting tab to video-player ---');
  const res1 = await win.webContents.executeJavaScript(`
    window.__useLibraryStore.getState().setMainTab('video-player');
    window.__useLibraryStore.getState().mainTab;
  `);
  console.log('mainTab is now:', res1);
  await new Promise((r) => setTimeout(r, 1000));
  const htmlVideo = await win.webContents.executeJavaScript(`
    ({
      bodyClasses: document.body.className,
      appWindowClasses: document.querySelector('.app-window')?.className,
      hasVideoScreen: !!document.querySelector('.video-player-screen'),
      hasVideoBody: !!document.querySelector('.video-player-body'),
      workspaceBodyChildren: Array.from(document.querySelectorAll('.workspace-body > *')).map(el => el.className),
      titleBarText: document.querySelector('.titlebar')?.innerText
    })
  `);
  console.log('Video check:', JSON.stringify(htmlVideo, null, 2));

  console.log('--- Setting tab to settings ---');
  const res2 = await win.webContents.executeJavaScript(`
    window.__useLibraryStore.getState().setMainTab('settings');
    window.__useLibraryStore.getState().mainTab;
  `);
  console.log('mainTab is now:', res2);
  await new Promise((r) => setTimeout(r, 1000));
  const htmlSettings = await win.webContents.executeJavaScript(`
    ({
      hasSettingsLayout: !!document.querySelector('.settings-screen-layout'),
      hasSettingsCategories: !!document.querySelector('.settings-categories-card'),
      hasSettingsPanel: !!document.querySelector('.settings-panel-card'),
      workspaceBodyChildren: Array.from(document.querySelectorAll('.workspace-body > *')).map(el => el.className),
      settingsCardHTML: document.querySelector('.settings-screen-layout')?.outerHTML?.substring(0, 300)
    })
  `);
  console.log('Settings check:', JSON.stringify(htmlSettings, null, 2));

  app.quit();
});
