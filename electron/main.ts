import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  Tray,
  Menu,
  nativeImage,
  protocol,
  net,
} from 'electron';
import path from 'path';
import fs from 'fs';
import { pathToFileURL } from 'url';
import { dbService, DBTrack, DBVideo } from './database';
import { parseAudioFile, scanDirectoryRecursively } from './metadata';
import { parseBasicVideoInfo, parseVideoDetails } from './thumbnailer';
import { videoService } from './videoService';

// Enable GPU-accelerated video decoding in Electron
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder,PlatformHEVCDecoderSupport');

const SUPPORTED_VIDEO_EXTENSIONS = [
  '.mp4', '.mkv', '.avi', '.mov', '.wmv', '.flv', '.webm',
  '.m4v', '.ts', '.mpg', '.mpeg', '.3gp', '.ogv'
];

const SUPPORTED_AUDIO_EXTENSIONS = [
  '.mp3', '.flac', '.wav', '.ogg', '.m4a', '.aac', '.opus'
];

// Single-instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let normalBounds = { width: 1100, height: 720, x: undefined as number | undefined, y: undefined as number | undefined };
let isMiniPlayer = false;

// Register media-stream scheme as privileged before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'media-stream',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      bypassCSP: true,
      stream: true,
    },
  },
]);

let useWindowsAcrylic = false;

function sendWindowState() {
  if (!mainWindow) return;
  const isMaximized = mainWindow.isMaximized() || mainWindow.isFullScreen();
  mainWindow.webContents.send('window:state-changed', { isMaximized, isMiniPlayer });
}

function createMainWindow(acrylic = useWindowsAcrylic, bounds?: Electron.Rectangle, wasMaximized?: boolean) {
  const windowOptions: Electron.BrowserWindowConstructorOptions = {
    width: bounds?.width ?? 1150,
    height: bounds?.height ?? 740,
    x: bounds?.x,
    y: bounds?.y,
    minWidth: 760,
    minHeight: 560,
    frame: false,
    title: 'PLay It',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      sandbox: false,
    },
  };

  if (acrylic) {
    // Mode 2: Windows 11 native acrylic
    windowOptions.transparent = false;
    windowOptions.backgroundColor = '#00000000';
    windowOptions.backgroundMaterial = 'acrylic';
    windowOptions.hasShadow = true;
  } else {
    // Mode 1: Pure transparent frameless window with true rounded glass outer edge
    windowOptions.transparent = true;
    windowOptions.backgroundColor = '#00000000';
    // backgroundMaterial and mica removed - conflict with transparent: true
    windowOptions.hasShadow = false;
  }

  mainWindow = new BrowserWindow(windowOptions);

  if (wasMaximized) {
    mainWindow.maximize();
  }

  // Track maximized & fullscreen state changes to notify renderer
  mainWindow.on('maximize', sendWindowState);
  mainWindow.on('unmaximize', sendWindowState);
  mainWindow.on('enter-full-screen', sendWindowState);
  mainWindow.on('leave-full-screen', sendWindowState);

  // Load URL
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Check if file was passed in CLI args (e.g. Open With)
  handleCommandLineArgs(process.argv);
}

function handleCommandLineArgs(argv: string[]) {
  const filePath = argv.find((arg) => {
    const lower = arg.toLowerCase();
    return lower.endsWith('.mp3') || lower.endsWith('.mp4');
  });

  if (filePath && fs.existsSync(filePath)) {
    setTimeout(() => {
      mainWindow?.webContents.send('app:open-file', filePath);
    }, 1500);
  }
}

app.on('second-instance', (_event, commandLine) => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    handleCommandLineArgs(commandLine);
  }
});

function createTray() {
  // Create an in-memory transparent SVG icon for the system tray
  const traySvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polygon points="10 8 16 12 10 16 10 8" fill="#60a5fa"/>
    </svg>
  `;
  const icon = nativeImage.createFromBuffer(Buffer.from(traySvg));
  tray = new Tray(icon.resize({ width: 16, height: 16 }));
  tray.setToolTip('PLay It');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open PLay It',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'About PLay It',
      click: () => {
        dialog.showMessageBox({
          type: 'info',
          title: 'About PLay It',
          message: 'PLay It',
          detail: 'PLay It - Pure offline liquid glass desktop media player\nVersion 1.0.0',
        });
      },
    },
    { type: 'separator' },
    {
      label: 'Play / Pause',
      click: () => mainWindow?.webContents.send('player:tray-command', 'toggle-play'),
    },
    {
      label: 'Next Track',
      click: () => mainWindow?.webContents.send('player:tray-command', 'next'),
    },
    {
      label: 'Previous Track',
      click: () => mainWindow?.webContents.send('player:tray-command', 'prev'),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(async () => {
  await dbService.init();

  try {
    const settings = await dbService.getSettings();
    useWindowsAcrylic = !!settings?.useWindowsAcrylic;
  } catch (err) {
    console.warn('[Settings] Could not load initial acrylic mode:', err);
  }

  // Register custom protocol for streaming local files safely with range requests
  protocol.handle('media-stream', (request) => {
    try {
      const url = new URL(request.url);
      const encodedPath = url.searchParams.get('path');
      if (!encodedPath) {
        return new Response('Missing path parameter', { status: 400 });
      }
      const filePath = decodeURIComponent(encodedPath);
      if (!fs.existsSync(filePath)) {
        return new Response('File not found', { status: 404 });
      }

      // Convert filePath to a file:// URL and let net.fetch handle range requests and video streaming
      const fileUrl = pathToFileURL(filePath).toString();
      return net.fetch(fileUrl, { headers: request.headers });
    } catch (err: any) {
      console.error('[Protocol] Error streaming media:', err);
      return new Response('Internal error: ' + err.message, { status: 500 });
    }
  });

  createMainWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// ==========================================
// IPC HANDLERS
// ==========================================

// Window Controls
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.handle('window:toggle-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
      return false;
    } else {
      mainWindow.maximize();
      return true;
    }
  }
  return false;
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:get-bounds', () => {
  return mainWindow?.getBounds() || null;
});

ipcMain.on('window:set-bounds', (_event, bounds: { x: number; y: number; width: number; height: number }) => {
  if (!mainWindow || mainWindow.isMaximized() || mainWindow.isFullScreen()) return;
  mainWindow.setBounds({
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    width: Math.max(880, Math.round(bounds.width)),
    height: Math.max(580, Math.round(bounds.height)),
  });
});

ipcMain.handle('window:get-state', () => {
  return {
    isMaximized: mainWindow?.isMaximized() || mainWindow?.isFullScreen() || false,
    isMiniPlayer,
    useWindowsAcrylic,
  };
});

ipcMain.handle('window:set-acrylic-mode', async (_event, enabled: boolean) => {
  if (useWindowsAcrylic === enabled) return;
  useWindowsAcrylic = enabled;
  try {
    await dbService.saveSetting('useWindowsAcrylic', enabled);
  } catch {}
  if (mainWindow) {
    const bounds = mainWindow.getBounds();
    const wasMax = mainWindow.isMaximized();
    mainWindow.destroy();
    createMainWindow(useWindowsAcrylic, bounds, wasMax);
  }
});

ipcMain.handle('window:toggle-mini-player', () => {
  if (!mainWindow) return false;
  isMiniPlayer = !isMiniPlayer;

  if (isMiniPlayer) {
    const bounds = mainWindow.getBounds();
    normalBounds = { width: bounds.width, height: bounds.height, x: bounds.x, y: bounds.y };
    mainWindow.setMinimumSize(320, 140);
    mainWindow.setSize(360, 150);
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setResizable(false);
  } else {
    mainWindow.setMinimumSize(880, 580);
    mainWindow.setResizable(true);
    mainWindow.setAlwaysOnTop(false);
    mainWindow.setSize(normalBounds.width, normalBounds.height);
    if (normalBounds.x !== undefined && normalBounds.y !== undefined) {
      mainWindow.setPosition(normalBounds.x, normalBounds.y);
    }
  }

  mainWindow.webContents.send('window:state-changed', {
    isMaximized: mainWindow.isMaximized(),
    isMiniPlayer,
  });
  return isMiniPlayer;
});

// File Dialogs & Scanner
ipcMain.handle('dialog:pick-audio-files', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Audio Files',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Audio Files', extensions: SUPPORTED_AUDIO_EXTENSIONS.map((e) => e.replace('.', '')) },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return processAudioFiles(result.filePaths);
});

ipcMain.handle('dialog:pick-video-files', async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Video Files (All Formats)',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video Files', extensions: SUPPORTED_VIDEO_EXTENSIONS.map((e) => e.replace('.', '')) },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return [];
  return processVideoFiles(result.filePaths);
});

ipcMain.handle('dialog:pick-folder', async () => {
  if (!mainWindow) return { tracks: [], videos: [] };
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Scan Folder for Media',
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return { tracks: [], videos: [] };

  const folder = result.filePaths[0];
  const audioFiles = scanDirectoryRecursively(folder, SUPPORTED_AUDIO_EXTENSIONS);
  const videoFiles = scanDirectoryRecursively(folder, SUPPORTED_VIDEO_EXTENSIONS);

  const importedTracks = await processAudioFiles(audioFiles);
  const importedVideos = await processVideoFiles(videoFiles);

  return { tracks: importedTracks, videos: importedVideos };
});

ipcMain.handle('media:import-paths', async (_event, paths: string[]) => {
  const audioPaths: string[] = [];
  const videoPaths: string[] = [];

  for (const p of paths) {
    try {
      const stat = fs.statSync(p);
      if (stat.isDirectory()) {
        audioPaths.push(...scanDirectoryRecursively(p, SUPPORTED_AUDIO_EXTENSIONS));
        videoPaths.push(...scanDirectoryRecursively(p, SUPPORTED_VIDEO_EXTENSIONS));
      } else if (stat.isFile()) {
        const ext = path.extname(p).toLowerCase();
        if (SUPPORTED_AUDIO_EXTENSIONS.includes(ext)) audioPaths.push(p);
        else if (SUPPORTED_VIDEO_EXTENSIONS.includes(ext)) videoPaths.push(p);
      }
    } catch (e) {
      console.warn('[Importer] Failed reading path:', p, e);
    }
  }

  const tracks = await processAudioFiles(audioPaths);
  const videos = await processVideoFiles(videoPaths);
  return { tracks, videos };
});

async function processAudioFiles(filePaths: string[]): Promise<DBTrack[]> {
  const results: DBTrack[] = [];
  const total = filePaths.length;

  for (let i = 0; i < total; i++) {
    const filePath = filePaths[i];
    try {
      const meta = await parseAudioFile(filePath);
      const trackData: Omit<DBTrack, 'id'> = {
        file_path: filePath,
        title: meta.title,
        artist: meta.artist,
        album: meta.album,
        genre: meta.genre,
        year: meta.year,
        duration: meta.duration,
        bitrate: meta.bitrate,
        sample_rate: meta.sampleRate,
        cover_art: meta.coverArt,
        date_added: Date.now(),
        last_played: null,
        play_count: 0,
        is_favorite: 0,
      };
      const id = await dbService.insertOrUpdateTrack(trackData);
      results.push({ ...trackData, id });

      // Notify progress for large batches
      if (total > 5 && i % 10 === 0) {
        mainWindow?.webContents.send('scan:progress', { current: i + 1, total, type: 'audio' });
      }
    } catch (err) {
      console.error('[AudioImport] Error processing file:', filePath, err);
    }
  }

  return results;
}

async function processVideoFiles(filePaths: string[]): Promise<DBVideo[]> {
  const results: DBVideo[] = [];
  const total = filePaths.length;

  for (let i = 0; i < total; i++) {
    const filePath = filePaths[i];
    try {
      const details = await parseVideoDetails(filePath);
      const videoData: Omit<DBVideo, 'id'> = {
        file_path: filePath,
        title: details.title,
        duration: details.duration || 0,
        width: details.width ?? null,
        height: details.height ?? null,
        thumbnail: details.thumbnail ?? null,
        date_added: Date.now(),
        last_played: null,
        last_position: 0,
        play_count: 0,
        is_favorite: 0,
      };
      const id = await dbService.insertOrUpdateVideo(videoData);
      results.push({ ...videoData, id });

      if (total > 3 && i % 2 === 0) {
        mainWindow?.webContents.send('scan:progress', { current: i + 1, total, type: 'video' });
      }
    } catch (err) {
      console.error('[VideoImport] Error processing file:', filePath, err);
    }
  }

  return results;
}

// Video 3-Tier Playback Pipeline IPCs
ipcMain.handle('video:probe', async (_event, filePath: string) => {
  return videoService.probeMedia(filePath);
});

ipcMain.handle('video:prepare-playback', async (_event, filePath: string, audioTrackIndex = 0, startTime = 0) => {
  try {
    const probe = await videoService.probeMedia(filePath);
    if (probe.isCorrupted || probe.hasDrm) {
      return {
        error: true,
        message: probe.errorMessage || 'Cannot play this video file.',
        probe,
      };
    }

    if (probe.suggestedTier === 'direct') {
      return {
        streamUrl: `media-stream://track?path=${encodeURIComponent(filePath)}`,
        tier: 'direct',
        probe,
        activeAudioTrackIndex: audioTrackIndex,
        isReady: true,
      };
    } else if (probe.suggestedTier === 'remux') {
      const remuxedPath = await videoService.remuxToMp4(filePath, audioTrackIndex);

      // Background check against cache limit
      dbService.getSettings().then((settings) => {
        const limitStr = settings?.videoCacheLimit || '2 GB';
        let limitBytes = 2 * 1024 * 1024 * 1024;
        if (limitStr === '1 GB') limitBytes = 1 * 1024 * 1024 * 1024;
        else if (limitStr === '2 GB') limitBytes = 2 * 1024 * 1024 * 1024;
        else if (limitStr === '5 GB') limitBytes = 5 * 1024 * 1024 * 1024;
        else if (limitStr === '10 GB') limitBytes = 10 * 1024 * 1024 * 1024;
        else if (limitStr === 'Unlimited') limitBytes = 0;
        if (limitBytes > 0) {
          videoService.cleanCacheIfNeeded(limitBytes).catch(() => {});
        }
      }).catch(() => {});

      return {
        streamUrl: `media-stream://track?path=${encodeURIComponent(remuxedPath)}`,
        tier: 'remux',
        probe,
        activeAudioTrackIndex: audioTrackIndex,
        cachedFilePath: remuxedPath,
        isReady: true,
      };
    } else {
      // Transcode
      const transcodedPath = await videoService.transcodeToMp4(
        filePath,
        audioTrackIndex,
        probe.video?.isHdr,
        startTime
      );

      // Background check against cache limit
      dbService.getSettings().then((settings) => {
        const limitStr = settings?.videoCacheLimit || '2 GB';
        let limitBytes = 2 * 1024 * 1024 * 1024;
        if (limitStr === '1 GB') limitBytes = 1 * 1024 * 1024 * 1024;
        else if (limitStr === '2 GB') limitBytes = 2 * 1024 * 1024 * 1024;
        else if (limitStr === '5 GB') limitBytes = 5 * 1024 * 1024 * 1024;
        else if (limitStr === '10 GB') limitBytes = 10 * 1024 * 1024 * 1024;
        else if (limitStr === 'Unlimited') limitBytes = 0;
        if (limitBytes > 0) {
          videoService.cleanCacheIfNeeded(limitBytes).catch(() => {});
        }
      }).catch(() => {});

      return {
        streamUrl: `media-stream://track?path=${encodeURIComponent(transcodedPath)}`,
        tier: 'transcode',
        probe,
        activeAudioTrackIndex: audioTrackIndex,
        cachedFilePath: transcodedPath,
        isReady: true,
      };
    }
  } catch (err: any) {
    console.error('[VideoPlayback] Preparation failed:', err);
    return {
      error: true,
      message: 'Failed to prepare video for playback: ' + err.message,
    };
  }
});

ipcMain.handle('video:extract-subtitles', async (_event, filePath: string, streamIndex: number) => {
  const vttFile = await videoService.extractSubtitlesToVtt(filePath, streamIndex);
  if (!vttFile) return null;
  return `media-stream://track?path=${encodeURIComponent(vttFile)}`;
});

ipcMain.handle('video:convert-external-sub', async (_event, subFilePath: string) => {
  const vttFile = await videoService.convertExternalSubToVtt(subFilePath);
  if (!vttFile) return null;
  return `media-stream://track?path=${encodeURIComponent(vttFile)}`;
});

ipcMain.handle('dialog:pick-subtitle-file', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Subtitle File',
    properties: ['openFile'],
    filters: [
      { name: 'Subtitle Files', extensions: ['srt', 'vtt', 'ass', 'ssa'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  const subFile = result.filePaths[0];
  const vttFile = await videoService.convertExternalSubToVtt(subFile);
  return {
    filePath: subFile,
    title: path.basename(subFile),
    vttUrl: vttFile ? `media-stream://track?path=${encodeURIComponent(vttFile)}` : null,
  };
});

ipcMain.handle('video:get-cache-info', async () => {
  return videoService.getCacheSize();
});

ipcMain.handle('video:clear-cache', async () => {
  return videoService.clearCache();
});

ipcMain.handle('gpu:get-status', async () => {
  const hwEnc = await videoService.detectHardwareEncoder();
  const featureStatus = app.getGPUFeatureStatus();
  let gpuInfo: any = {};
  try {
    gpuInfo = await app.getGPUInfo('basic');
  } catch {}
  return {
    featureStatus,
    gpuInfo,
    hwEncoder: hwEnc,
    videoDecode: featureStatus.video_decode,
    gpuAccelerated: featureStatus.video_decode === 'enabled' || featureStatus.gpu_compositing === 'enabled',
  };
});

// Media Utility & File Existence
ipcMain.handle('file:exists', (_event, filePath: string) => {
  return fs.existsSync(filePath);
});

ipcMain.handle('file:show-in-folder', (_event, filePath: string) => {
  if (fs.existsSync(filePath)) {
    shell.showItemInFolder(filePath);
    return true;
  }
  return false;
});

ipcMain.handle('dialog:locate-file', async (_event, oldPath: string, isVideo: boolean) => {
  if (!mainWindow) return null;
  const ext = isVideo ? 'mp4' : 'mp3';
  const result = await dialog.showOpenDialog(mainWindow, {
    title: `Locate Media File: ${path.basename(oldPath)}`,
    properties: ['openFile'],
    filters: [{ name: isVideo ? 'Video' : 'Audio', extensions: [ext] }],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// Database CRUD IPCs
ipcMain.handle('db:get-tracks', () => dbService.getAllTracks());
ipcMain.handle('db:toggle-track-favorite', (_event, id: number) => dbService.toggleTrackFavorite(id));
ipcMain.handle('db:record-track-play', (_event, id: number) => dbService.recordTrackPlay(id));
ipcMain.handle('db:remove-track', (_event, id: number) => dbService.removeTrack(id));

ipcMain.handle('db:get-videos', () => dbService.getAllVideos());
ipcMain.handle('db:update-video-meta', async (_event, id: number, meta: { duration?: number; thumbnail?: string; width?: number; height?: number }) => {
  const existing = (await dbService.getAllVideos()).find((v) => v.id === id);
  if (existing) {
    await dbService.insertOrUpdateVideo({
      file_path: existing.file_path,
      title: existing.title,
      duration: meta.duration ?? existing.duration,
      width: meta.width ?? existing.width,
      height: meta.height ?? existing.height,
      thumbnail: meta.thumbnail ?? existing.thumbnail,
      date_added: existing.date_added,
      last_played: existing.last_played,
      last_position: existing.last_position,
      play_count: existing.play_count,
      is_favorite: existing.is_favorite,
    });
  }
});
ipcMain.handle('db:update-video-position', (_event, id: number, position: number) => dbService.updateVideoPosition(id, position));
ipcMain.handle('db:toggle-video-favorite', (_event, id: number) => dbService.toggleVideoFavorite(id));
ipcMain.handle('db:remove-video', (_event, id: number) => dbService.removeVideo(id));

ipcMain.handle('db:get-playlists', () => dbService.getPlaylists());
ipcMain.handle('db:create-playlist', (_event, name: string) => dbService.createPlaylist(name));
ipcMain.handle('db:rename-playlist', (_event, id: number, name: string) => dbService.renamePlaylist(id, name));
ipcMain.handle('db:delete-playlist', (_event, id: number) => dbService.deletePlaylist(id));
ipcMain.handle('db:add-to-playlist', (_event, playlistId: number, trackId: number) => dbService.addTrackToPlaylist(playlistId, trackId));
ipcMain.handle('db:remove-from-playlist', (_event, playlistId: number, trackId: number) => dbService.removeTrackFromPlaylist(playlistId, trackId));
ipcMain.handle('db:get-playlist-tracks', (_event, playlistId: number) => dbService.getPlaylistTracks(playlistId));

ipcMain.handle('db:get-settings', () => dbService.getSettings());
ipcMain.handle('db:save-setting', (_event, key: string, value: any) => dbService.saveSetting(key, value));
