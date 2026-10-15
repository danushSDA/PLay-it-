export interface Track {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number;
  bitrate: number | null;
  sample_rate: number | null;
  cover_art: string | null;
  date_added: number;
  last_played: number | null;
  play_count: number;
  is_favorite: number;
}

export interface Video {
  id: number;
  file_path: string;
  title: string;
  duration: number;
  width: number | null;
  height: number | null;
  thumbnail: string | null;
  date_added: number;
  last_played: number | null;
  last_position: number;
  play_count: number;
  is_favorite: number;
}

export interface Playlist {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  track_count?: number;
}

export type RepeatMode = 'off' | 'all' | 'one';
export type SortOption = 'title' | 'artist' | 'album' | 'date_added' | 'duration';
export type SortOrder = 'asc' | 'desc';
export type MusicViewMode = 'songs' | 'albums' | 'artists' | 'playlists' | 'favorites' | 'recent';
export type MainTab = 'music' | 'videos' | 'albums' | 'artists' | 'playlists' | 'favorites' | 'settings' | 'video-player';

export interface AppSettings {
  accentColor: string; // hex color or preset
  blurStrength: number; // 10 to 45 px
  glassOpacity: number; // 0.05 to 0.25
  enableVisualizer: boolean;
  reduceTransparency: boolean;
  themeMode: 'dark' | 'light';
  theme: 'citrus' | 'night' | 'pastel';
  useWindowsAcrylic?: boolean;
  animationPreference?: 'full' | 'reduced' | 'off';
  sleepTimerMinutes: number | null; // null if off
}

export interface EqualizerSettings {
  enabled: boolean;
  preset: string;
  bands: number[]; // 10 values in dB (-12 to +12)
}

export interface AudioTrackInfo {
  id: number;
  index: number;
  streamIndex: number;
  codec: string;
  language: string;
  title: string;
  channels: number;
  channelLayout: string;
  sampleRate: number;
  bitRate: number | null;
  isDefault: boolean;
}

export interface SubtitleTrackInfo {
  id: number;
  index: number;
  streamIndex: number;
  codec: string;
  language: string;
  title: string;
  isDefault: boolean;
  isExternal?: boolean;
  filePath?: string;
  vttUrl?: string;
}

export interface VideoStreamInfo {
  codec: string;
  codecLongName: string;
  profile: string;
  width: number;
  height: number;
  fps: number;
  bitRate: number | null;
  pixelFormat: string;
  colorSpace: string;
  colorTransfer: string;
  colorPrimaries: string;
  isHdr: boolean;
  resolutionLabel: string;
}

export interface MediaProbeResult {
  filePath: string;
  container: string;
  duration: number;
  fileSize: number;
  overallBitrate: number | null;
  video: VideoStreamInfo | null;
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  suggestedTier: 'direct' | 'remux' | 'transcode';
  reason: string;
  isCorrupted: boolean;
  hasDrm: boolean;
  errorMessage?: string;
}

export interface PlaybackSession {
  streamUrl: string;
  tier: 'direct' | 'remux' | 'transcode';
  probe: MediaProbeResult;
  activeAudioTrackIndex: number;
  cachedFilePath?: string;
  isReady: boolean;
  error?: string;
}

export interface SubtitleSettings {
  size: 'small' | 'medium' | 'large' | 'xlarge';
  color: 'white' | 'yellow' | 'cyan' | 'green';
  background: 'none' | 'shadow' | 'glow' | 'box';
  delay: number; // in seconds, e.g. -0.5 to +0.5
}

declare global {
  interface Window {
    glassAPI: import('../../electron/preload').GlassAPI;
  }
}
