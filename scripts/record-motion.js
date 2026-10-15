const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

ipcMain.handle('db:get-settings', () => ({
  theme: 'citrus',
  useWindowsAcrylic: false,
  animationPreference: 'full',
}));
ipcMain.handle('db:get-tracks', () => []);
ipcMain.handle('db:get-videos', () => []);
ipcMain.handle('db:get-playlists', () => [
  { id: 1, name: 'Chill Vibes', track_count: 8 },
  { id: 2, name: 'Workout Energy', track_count: 14 },
  { id: 3, name: 'Late Night Focus', track_count: 6 },
]);
ipcMain.handle('window:get-state', () => ({
  isMaximized: false,
  isMiniPlayer: false,
  useWindowsAcrylic: false,
}));
ipcMain.handle('window:get-bounds', () => ({ x: 100, y: 100, width: 1150, height: 740 }));
ipcMain.on('window:set-bounds', () => {});
ipcMain.handle('window:toggle-maximize', () => false);
ipcMain.handle('window:minimize', () => {});
ipcMain.handle('window:close', () => {});

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1150,
    height: 740,
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

  // 1. Initial settled state with Playlists in sidebar
  setTimeout(async () => {
    try {
      let img = await win.webContents.capturePage();
      fs.writeFileSync(path.join(__dirname, '../screenshot_motion_default.png'), img.toPNG());
      console.log('✅ Captured screenshot_motion_default.png');

      // 2. Select 'Videos' item to capture active glide selection
      await win.webContents.executeJavaScript(`
        const btn = document.querySelector('button[data-id="videos"]');
        if (btn) btn.click();
      `);

      setTimeout(async () => {
        img = await win.webContents.capturePage();
        fs.writeFileSync(path.join(__dirname, '../screenshot_motion_selection.png'), img.toPNG());
        console.log('✅ Captured screenshot_motion_selection.png');

        // 3. Open Motion Dev Inspector (Ctrl+Shift+M)
        await win.webContents.executeJavaScript(`
          window.dispatchEvent(new KeyboardEvent('keydown', { key: 'M', ctrlKey: true, shiftKey: true, bubbles: true }));
        `);

        setTimeout(async () => {
          img = await win.webContents.capturePage();
          fs.writeFileSync(path.join(__dirname, '../screenshot_motion_dev_panel.png'), img.toPNG());
          console.log('✅ Captured screenshot_motion_dev_panel.png');

          // Close dev panel and trigger Rail Collapse
          await win.webContents.executeJavaScript(`
            window.dispatchEvent(new KeyboardEvent('keydown', { key: 'M', ctrlKey: true, shiftKey: true, bubbles: true }));
            setTimeout(() => {
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b', ctrlKey: true, bubbles: true }));
            }, 300);
          `);

          setTimeout(async () => {
            img = await win.webContents.capturePage();
            fs.writeFileSync(path.join(__dirname, '../screenshot_motion_rail.png'), img.toPNG());
            console.log('✅ Captured screenshot_motion_rail.png');

            app.quit();
            process.exit(0);
          }, 800);
        }, 600);
      }, 500);
    } catch (err) {
      console.error(err);
      app.quit();
      process.exit(1);
    }
  }, 2200);
});
