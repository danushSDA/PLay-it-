import { contextBridge, ipcRenderer } from 'electron';

export interface GlassAPI {
  // Window
  minimize: () => Promise<void>;
  toggleMaximize: () => Promise<boolean>;
  close: () => Promise<void>;
  toggleMiniPlayer: () => Promise<boolean>;
  onWindowStateChanged: (callback: (state: { isMaximized: boolean; isMiniPlayer: boolean; useWindowsAcrylic?: boolean }) => void) => () => void;
  getBounds: () => Promise<{ x: number; y: number; width: number; height: number } | null>;
  setBounds: (bounds: { x: number; y: number; width: number; height: number }) => void;
  getWindowState: () => Promise<{ isMaximized: boolean; isMiniPlayer: boolean; useWindowsAcrylic?: boolean }>;
  setAcrylicMode: (enabled: boolean) => Promise<void>;

  // Dialogs & Import
  pickAudioFiles: () => Promise<any[]>;
  pickVideoFiles: () => Promise<any[]>;
  pickFolder: () => Promise<{ tracks: any[]; videos: any[] }>;
  importPaths: (paths: string[]) => Promise<{ tracks: any[]; videos: any[] }>;
  onScanProgress: (callback: (progress: { current: number; total: number; type: string }) => void) => () => void;
  onOpenFile: (callback: (filePath: string) => void) => () => void;

  // Media Streaming
  getMediaStreamUrl: (filePath: string) => string;

  // File Operations
  fileExists: (filePath: string) => Promise<boolean>;
  showInFolder: (filePath: string) => Promise<boolean>;
  locateFile: (oldPath: string, isVideo: boolean) => Promise<string | null>;

  // Database Tracks
  getTracks: () => Promise<any[]>;
  toggleTrackFavorite: (id: number) => Promise<boolean>;
  recordTrackPlay: (id: number) => Promise<void>;
  removeTrack: (id: number) => Promise<void>;

  // Database Videos
  getVideos: () => Promise<any[]>;
  updateVideoMeta: (id: number, meta: { duration?: number; thumbnail?: string; width?: number; height?: number }) => Promise<void>;
  updateVideoPosition: (id: number, position: number) => Promise<void>;
  toggleVideoFavorite: (id: number) => Promise<boolean>;
  removeVideo: (id: number) => Promise<void>;

  // Database Playlists
  getPlaylists: () => Promise<any[]>;
  createPlaylist: (name: string) => Promise<any>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  addToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  removeFromPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  getPlaylistTracks: (playlistId: number) => Promise<any[]>;

  // Settings
  getSettings: () => Promise<Record<string, any>>;
  saveSetting: (key: string, value: any) => Promise<void>;

  // Video 3-Tier Pipeline, Subtitles, Cache & GPU
  probeVideo: (filePath: string) => Promise<any>;
  prepareVideoPlayback: (filePath: string, audioTrackIndex?: number, startTime?: number) => Promise<any>;
  extractSubtitles: (filePath: string, streamIndex: number) => Promise<string | null>;
  convertExternalSub: (subFilePath: string) => Promise<string | null>;
  pickSubtitleFile: () => Promise<string | null>;
  getVideoCacheInfo: () => Promise<{ bytes: number; formatted: string; fileCount: number }>;
  clearVideoCache: () => Promise<void>;
  getGpuStatus: () => Promise<any>;

  // Tray
  onTrayCommand: (callback: (cmd: string) => void) => () => void;
}

const api: GlassAPI = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  toggleMaximize: () => ipcRenderer.invoke('window:toggle-maximize'),
  close: () => ipcRenderer.invoke('window:close'),
  toggleMiniPlayer: () => ipcRenderer.invoke('window:toggle-mini-player'),
  onWindowStateChanged: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('window:state-changed', handler);
    return () => ipcRenderer.removeListener('window:state-changed', handler);
  },
  getBounds: () => ipcRenderer.invoke('window:get-bounds'),
  setBounds: (bounds) => ipcRenderer.send('window:set-bounds', bounds),
  getWindowState: () => ipcRenderer.invoke('window:get-state'),
  setAcrylicMode: (enabled) => ipcRenderer.invoke('window:set-acrylic-mode', enabled),

  pickAudioFiles: () => ipcRenderer.invoke('dialog:pick-audio-files'),
  pickVideoFiles: () => ipcRenderer.invoke('dialog:pick-video-files'),
  pickFolder: () => ipcRenderer.invoke('dialog:pick-folder'),
  importPaths: (paths) => ipcRenderer.invoke('media:import-paths', paths),
  onScanProgress: (callback) => {
    const handler = (_: any, data: any) => callback(data);
    ipcRenderer.on('scan:progress', handler);
    return () => ipcRenderer.removeListener('scan:progress', handler);
  },
  onOpenFile: (callback) => {
    const handler = (_: any, filePath: string) => callback(filePath);
    ipcRenderer.on('app:open-file', handler);
    return () => ipcRenderer.removeListener('app:open-file', handler);
  },

  getMediaStreamUrl: (filePath: string) => {
    return `media-stream://track?path=${encodeURIComponent(filePath)}`;
  },

  fileExists: (filePath) => ipcRenderer.invoke('file:exists', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('file:show-in-folder', filePath),
  locateFile: (oldPath, isVideo) => ipcRenderer.invoke('dialog:locate-file', oldPath, isVideo),

  getTracks: () => ipcRenderer.invoke('db:get-tracks'),
  toggleTrackFavorite: (id) => ipcRenderer.invoke('db:toggle-track-favorite', id),
  recordTrackPlay: (id) => ipcRenderer.invoke('db:record-track-play', id),
  removeTrack: (id) => ipcRenderer.invoke('db:remove-track', id),

  getVideos: () => ipcRenderer.invoke('db:get-videos'),
  updateVideoMeta: (id, meta) => ipcRenderer.invoke('db:update-video-meta', id, meta),
  updateVideoPosition: (id, pos) => ipcRenderer.invoke('db:update-video-position', id, pos),
  toggleVideoFavorite: (id) => ipcRenderer.invoke('db:toggle-video-favorite', id),
  removeVideo: (id) => ipcRenderer.invoke('db:remove-video', id),

  getPlaylists: () => ipcRenderer.invoke('db:get-playlists'),
  createPlaylist: (name) => ipcRenderer.invoke('db:create-playlist', name),
  renamePlaylist: (id, name) => ipcRenderer.invoke('db:rename-playlist', id, name),
  deletePlaylist: (id) => ipcRenderer.invoke('db:delete-playlist', id),
  addToPlaylist: (pId, tId) => ipcRenderer.invoke('db:add-to-playlist', pId, tId),
  removeFromPlaylist: (pId, tId) => ipcRenderer.invoke('db:remove-from-playlist', pId, tId),
  getPlaylistTracks: (pId) => ipcRenderer.invoke('db:get-playlist-tracks', pId),

  getSettings: () => ipcRenderer.invoke('db:get-settings'),
  saveSetting: (key, val) => ipcRenderer.invoke('db:save-setting', key, val),

  probeVideo: (filePath) => ipcRenderer.invoke('video:probe', filePath),
  prepareVideoPlayback: (filePath, audioTrackIndex, startTime) =>
    ipcRenderer.invoke('video:prepare-playback', filePath, audioTrackIndex, startTime),
  extractSubtitles: (filePath, streamIndex) =>
    ipcRenderer.invoke('video:extract-subtitles', filePath, streamIndex),
  convertExternalSub: (subFilePath) =>
    ipcRenderer.invoke('video:convert-external-sub', subFilePath),
  pickSubtitleFile: () => ipcRenderer.invoke('dialog:pick-subtitle-file'),
  getVideoCacheInfo: () => ipcRenderer.invoke('video:get-cache-info'),
  clearVideoCache: () => ipcRenderer.invoke('video:clear-cache'),
  getGpuStatus: () => ipcRenderer.invoke('gpu:get-status'),

  onTrayCommand: (callback) => {
    const handler = (_: any, cmd: string) => callback(cmd);
    ipcRenderer.on('player:tray-command', handler);
    return () => ipcRenderer.removeListener('player:tray-command', handler);
  },
};

contextBridge.exposeInMainWorld('glassAPI', api);
