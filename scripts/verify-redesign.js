const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

const RESOLUTIONS = [
  { width: 1366, height: 768 },
  { width: 1200, height: 728 },
  { width: 1139, height: 739 },
  { width: 1024, height: 640 },
  { width: 800, height: 600 },
];

const BRAIN_DIR = 'C:\\Users\\DANUSH\\.gemini\\antigravity-ide\\brain\\48912467-9b87-424e-b65f-f60da3fc4442';
const OUTPUT_DIR = path.join(__dirname, '../screenshots_verified');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Mock IPC
ipcMain.handle('db:get-settings', () => ({
  theme: 'citrus',
  accentColor: '#ff9f1c',
  useWindowsAcrylic: false,
  blurStrength: 32,
  glassOpacity: 0.42,
  reduceTransparency: false,
  waveEffects: true,
  crossfade: 3,
  gapless: true,
  equalizerPreset: 'Flat',
  normalizeVolume: true,
  resumePlayback: true,
  hardwareDecoding: true,
  maxResolution: 'Up to 4K',
  subtitleSize: 'Medium',
  musicFolderPath: 'C:\\Users\\You\\Music',
  scanOnStartup: true,
  mediaKeys: true,
  minimizeToTray: true,
  startWithWindows: false,
}));
ipcMain.handle('db:save-setting', () => {});
ipcMain.handle('db:get-tracks', () => []);
ipcMain.handle('db:get-videos', () => []);
ipcMain.handle('db:get-playlists', () => []);
ipcMain.handle('window:get-state', () => ({ isMaximized: false, isMiniPlayer: false, useWindowsAcrylic: false }));
ipcMain.handle('window:get-bounds', () => ({ x: 50, y: 50, width: 1366, height: 768 }));
ipcMain.on('window:set-bounds', () => {});
ipcMain.handle('window:toggle-maximize', () => false);
ipcMain.handle('window:minimize', () => {});
ipcMain.handle('window:close', () => {});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    width: 1366,
    height: 768,
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
  await sleep(1000);

  const verificationResults = [];

  for (const res of RESOLUTIONS) {
    const { width, height } = res;
    console.log(`\n================ Testing ${width}x${height} ================`);
    win.setSize(width, height);
    win.center();
    await sleep(400);

    // 1. Switch to Desktop screen (Music view) and ensure playing state
    await win.webContents.executeJavaScript(`
      (() => {
        const items = document.querySelectorAll('.sidebar-nav-item');
        if (items && items[0]) items[0].click();
        const playBtn = document.querySelector('.play-pause-disc');
        const pauseIcon = playBtn ? playBtn.querySelector('path[d*="h3.5"]') : null;
        if (playBtn && !pauseIcon) {
          playBtn.click();
        }
      })()
    `);
    await sleep(700);

    // Check layout metrics for Desktop
    const desktopMetrics = await win.webContents.executeJavaScript(`
      (() => {
        const appWindow = document.querySelector('.app-window');
        const titlebar = document.querySelector('.window-titlebar');
        const sidebar = document.querySelector('.glass-sidebar');
        const sidebarFooter = document.querySelector('.sidebar-footer');
        const heroCard = document.querySelector('.hero-card');
        const upNext = document.querySelector('.up-next-card');
        const playerBar = document.querySelector('.player-bar-container');

        const winRect = appWindow ? appWindow.getBoundingClientRect() : null;
        const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const sfRect = sidebarFooter ? sidebarFooter.getBoundingClientRect() : null;
        const pRect = playerBar ? playerBar.getBoundingClientRect() : null;
        const uRect = upNext ? upNext.getBoundingClientRect() : null;

        // Overlap checks
        const playerOverlapsSidebar = pRect && sRect ? !(pRect.top >= sRect.bottom || pRect.bottom <= sRect.top || pRect.left >= sRect.right || pRect.right <= sRect.left) : false;
        const playerOverlapsUpNext = pRect && uRect ? !(pRect.top >= uRect.bottom || pRect.bottom <= uRect.top || pRect.left >= uRect.right || pRect.right <= uRect.left) : false;
        const gapAbovePlayer = pRect && sRect ? Math.round(pRect.top - sRect.bottom) : null;

        return {
          windowSize: { w: winRect?.width, h: winRect?.height },
          playerOverlapsSidebar,
          playerOverlapsUpNext,
          gapAbovePlayer,
          sidebarFooterVisible: sfRect ? (sfRect.bottom <= (sRect ? sRect.bottom : Infinity)) : true,
        };
      })()
    `);

    console.log(`Desktop ${width}x${height} Metrics:`, desktopMetrics);

    // Take Desktop Screenshot
    const desktopImage = await win.webContents.capturePage();
    const desktopFile = `desktop_${width}x${height}.png`;
    fs.writeFileSync(path.join(OUTPUT_DIR, desktopFile), desktopImage.toPNG());
    fs.writeFileSync(path.join(BRAIN_DIR, desktopFile), desktopImage.toPNG());
    console.log(`Saved screenshot: ${desktopFile}`);

    // 2. Switch to Settings screen (idle mode: pause first so no player bar)
    await win.webContents.executeJavaScript(`
      (() => {
        const playBtn = document.querySelector('.play-pause-disc');
        const pauseIcon = playBtn ? playBtn.querySelector('path[d*="h3.5"]') : null;
        if (playBtn && pauseIcon) {
          playBtn.click();
        }
        const items = document.querySelectorAll('.sidebar-nav-item');
        if (items && items[6]) items[6].click();
      })()
    `);
    await sleep(700);

    // Check layout metrics for Settings
    const settingsMetrics = await win.webContents.executeJavaScript(`
      (() => {
        const appWindow = document.querySelector('.app-window');
        const sidebar = document.querySelector('.glass-sidebar');
        const settingsScreen = document.querySelector('.settings-screen-container');
        const playerBar = document.querySelector('.player-bar-container');

        const winRect = appWindow ? appWindow.getBoundingClientRect() : null;
        const sRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const setRect = settingsScreen ? settingsScreen.getBoundingClientRect() : null;
        const pRect = playerBar ? playerBar.getBoundingClientRect() : null;

        const playerOverlapsSettings = pRect && setRect ? !(pRect.top >= setRect.bottom || pRect.bottom <= setRect.top || pRect.left >= setRect.right || pRect.right <= setRect.left) : false;

        return {
          windowSize: { w: winRect?.width, h: winRect?.height },
          hasPlayerBar: !!pRect,
          playerOverlapsSettings,
          canScrollSettings: setRect ? setRect.scrollHeight >= setRect.clientHeight : false,
        };
      })()
    `);

    console.log(`Settings ${width}x${height} Metrics:`, settingsMetrics);

    // Take Settings Screenshot
    const settingsImage = await win.webContents.capturePage();
    const settingsFile = `settings_${width}x${height}.png`;
    fs.writeFileSync(path.join(OUTPUT_DIR, settingsFile), settingsImage.toPNG());
    fs.writeFileSync(path.join(BRAIN_DIR, settingsFile), settingsImage.toPNG());
    console.log(`Saved screenshot: ${settingsFile}`);

    verificationResults.push({
      resolution: `${width}x${height}`,
      desktop: desktopMetrics,
      settings: settingsMetrics,
    });
  }

  // Also test Settings WITH player bar at 1366x768 to verify Part C #4
  console.log(`\n================ Testing Settings WITH Player Bar at 1366x768 ================`);
  win.setSize(1366, 768);
  win.center();
  await sleep(300);
  await win.webContents.executeJavaScript(`
    (() => {
      // Go to music and play
      const items = document.querySelectorAll('.sidebar-nav-item');
      if (items && items[0]) items[0].click();
    })()
  `);
  await sleep(400);
  await win.webContents.executeJavaScript(`
    (() => {
      const playBtn = document.querySelector('.play-pause-disc');
      const pauseIcon = playBtn ? playBtn.querySelector('path[d*="h3.5"]') : null;
      if (playBtn && !pauseIcon) {
        playBtn.click();
      }
      // Then switch to settings
      const items = document.querySelectorAll('.sidebar-nav-item');
      if (items && items[6]) items[6].click();
    })()
  `);
  await sleep(1000);

  const settingsWithPlayerMetrics = await win.webContents.executeJavaScript(`
    (() => {
      const settingsScreen = document.querySelector('.settings-screen-container');
      const playerBar = document.querySelector('.player-bar-container');
      const setRect = settingsScreen ? settingsScreen.getBoundingClientRect() : null;
      const pRect = playerBar ? playerBar.getBoundingClientRect() : null;
      const overlaps = pRect && setRect ? !(pRect.top >= setRect.bottom || pRect.bottom <= setRect.top) : false;
      return {
        hasPlayerBar: !!pRect,
        overlaps,
        gap: pRect && setRect ? Math.round(pRect.top - setRect.bottom) : null,
      };
    })()
  `);
  console.log('Settings WITH Player Bar Metrics:', settingsWithPlayerMetrics);

  const settingsWithPlayerImage = await win.webContents.capturePage();
  fs.writeFileSync(path.join(OUTPUT_DIR, 'settings_with_player_1366x768.png'), settingsWithPlayerImage.toPNG());
  fs.writeFileSync(path.join(BRAIN_DIR, 'settings_with_player_1366x768.png'), settingsWithPlayerImage.toPNG());
  console.log('Saved screenshot: settings_with_player_1366x768.png');

  console.log('\n================ ALL SCREENSHOTS CAPTURED SUCCESSFULLY ================');
  console.log(JSON.stringify(verificationResults, null, 2));

  app.quit();
});
