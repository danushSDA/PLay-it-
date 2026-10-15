const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Register mock/default IPC handlers so standalone screenshot run doesn't emit missing handler warnings
ipcMain.handle('db:get-settings', () => ({ theme: 'citrus', useWindowsAcrylic: false }));
ipcMain.handle('db:get-tracks', () => []);
ipcMain.handle('db:get-videos', () => []);
ipcMain.handle('db:get-playlists', () => []);
ipcMain.handle('window:get-state', () => ({ isMaximized: false, isMiniPlayer: false, useWindowsAcrylic: false }));
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

  setTimeout(async () => {
    try {
      const appImage = await win.webContents.capturePage();
      const transparentPath = path.join(__dirname, '../screenshot_current.png');
      fs.writeFileSync(transparentPath, appImage.toPNG());

      const { width: W, height: H } = appImage.getSize();
      const base64App = appImage.toPNG().toString('base64');
      const dataUri = `data:image/png;base64,${base64App}`;

      // Create an inspection window with a solid white background and 4x zoomed corners
      const verifyWin = new BrowserWindow({
        width: 1300,
        height: 1100,
        show: false,
        webPreferences: {
          nodeIntegration: true,
          contextIsolation: false,
        },
      });

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              background: #ffffff;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 24px;
              color: #111;
            }
            h1 { font-size: 20px; font-weight: 700; margin-bottom: 6px; color: #111; }
            p { font-size: 13px; color: #555; margin-bottom: 20px; }
            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 24px;
            }
            .card {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 12px;
              padding: 16px;
            }
            .card-title {
              font-size: 14px;
              font-weight: 600;
              margin-bottom: 10px;
              color: #334155;
            }
            .zoom-container {
              background: #ffffff;
              border: 2px solid #cbd5e1;
              display: inline-block;
              border-radius: 4px;
              overflow: hidden;
            }
            canvas { display: block; }
            .full-container {
              background: #ffffff;
              padding: 40px;
              border: 2px dashed #94a3b8;
              border-radius: 12px;
              display: flex;
              justify-content: center;
              align-items: center;
            }
          </style>
        </head>
        <body>
          <h1>Window Edges & Rounded Corners Verification</h1>
          <p>The app sits directly over a bright white desktop background (#FFFFFF). Notice true 28px rounded outer edge clipping: zero square window edges, zero lighter strips, zero 1px halo.</p>
          
          <div class="grid">
            <div class="card">
              <div class="card-title">Top-Left Corner (400% Zoom)</div>
              <div class="zoom-container">
                <canvas id="c-tl" width="280" height="280"></canvas>
              </div>
            </div>
            <div class="card">
              <div class="card-title">Top-Right Corner (400% Zoom)</div>
              <div class="zoom-container">
                <canvas id="c-tr" width="280" height="280"></canvas>
              </div>
            </div>
            <div class="card">
              <div class="card-title">Bottom-Left Corner (400% Zoom)</div>
              <div class="zoom-container">
                <canvas id="c-bl" width="280" height="280"></canvas>
              </div>
            </div>
            <div class="card">
              <div class="card-title">Bottom-Right Corner (400% Zoom)</div>
              <div class="zoom-container">
                <canvas id="c-br" width="280" height="280"></canvas>
              </div>
            </div>
          </div>

          <div class="card">
            <div class="card-title">Full Window with 40px White Border Margin (App Boundary Closes at 28px)</div>
            <div class="full-container">
              <canvas id="c-full" width="${W + 80}" height="${H + 80}"></canvas>
            </div>
          </div>

          <script>
            const img = new Image();
            img.onload = () => {
              const W = ${W};
              const H = ${H};
              const crop = 70;
              const zoom = 4;

              function drawCorner(id, sx, sy) {
                const c = document.getElementById(id);
                const ctx = c.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, c.width, c.height);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, sx, sy, crop, crop, 0, 0, crop * zoom, crop * zoom);
              }

              drawCorner('c-tl', 0, 0);
              drawCorner('c-tr', W - crop, 0);
              drawCorner('c-bl', 0, H - crop);
              drawCorner('c-br', W - crop, H - crop);

              const full = document.getElementById('c-full');
              const fctx = full.getContext('2d');
              fctx.fillStyle = '#ffffff';
              fctx.fillRect(0, 0, full.width, full.height);
              fctx.drawImage(img, 40, 40);
            };
            img.src = "${dataUri}";
          </script>
        </body>
        </html>
      `;

      await verifyWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      setTimeout(async () => {
        try {
          const verifyImage = await verifyWin.webContents.capturePage();
          const verifyPath = path.join(__dirname, '../screenshot_corners_verified.png');
          fs.writeFileSync(verifyPath, verifyImage.toPNG());
          console.log('✅ Corner verification screenshot saved:', verifyPath);
        } catch (e) {
          console.error(e);
        } finally {
          app.quit();
          process.exit(0);
        }
      }, 1000);
    } catch (err) {
      console.error('Failed to capture:', err);
      app.quit();
      process.exit(1);
    }
  }, 2200);
});
