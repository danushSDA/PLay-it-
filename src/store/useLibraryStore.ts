import { create } from 'zustand';
import { Track, Video, Playlist, SortOption, SortOrder, MusicViewMode, MainTab } from '../types';

interface LibraryState {
  tracks: Track[];
  videos: Video[];
  playlists: Playlist[];
  activePlaylistId: number | null;
  activePlaylistTracks: Track[];
  searchQuery: string;
  sortOption: SortOption;
  sortOrder: SortOrder;
  musicViewMode: MusicViewMode;
  mainTab: MainTab;
  isScanning: boolean;
  scanProgress: { current: number; total: number; type: string } | null;

  scrollPositions: Record<string, number>;
  isSidebarCollapsed: boolean;
  isAboutOpen: boolean;
  isShortcutsOpen: boolean;

  // Actions
  loadLibrary: () => Promise<void>;
  pickAndImportAudio: () => Promise<void>;
  pickAndImportVideos: () => Promise<void>;
  pickAndImportFolder: () => Promise<void>;
  scanWatchedFolders: () => Promise<void>;
  importDroppedPaths: (paths: string[]) => Promise<void>;
  toggleTrackFavorite: (id: number) => Promise<void>;
  removeTrack: (id: number) => Promise<void>;
  toggleVideoFavorite: (id: number) => Promise<void>;
  removeVideo: (id: number) => Promise<void>;
  createPlaylist: (name: string) => Promise<Playlist | null>;
  renamePlaylist: (id: number, name: string) => Promise<void>;
  deletePlaylist: (id: number) => Promise<void>;
  addTrackToPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  removeTrackFromPlaylist: (playlistId: number, trackId: number) => Promise<void>;
  selectPlaylist: (id: number | null) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setSort: (option: SortOption, order?: SortOrder) => void;
  setMusicViewMode: (mode: MusicViewMode) => void;
  setMainTab: (tab: MainTab) => void;
  setScrollPosition: (view: string, pos: number) => void;
  toggleSidebarCollapse: () => void;
  setAboutOpen: (open: boolean) => void;
  setShortcutsOpen: (open: boolean) => void;
  reorderPlaylists: (playlists: Playlist[]) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  videos: [],
  playlists: [],
  activePlaylistId: null,
  activePlaylistTracks: [],
  searchQuery: '',
  sortOption: 'title',
  sortOrder: 'asc',
  musicViewMode: 'songs',
  mainTab: 'music',
  isScanning: false,
  scanProgress: null,
  scrollPositions: {},
  isSidebarCollapsed: typeof window !== 'undefined' ? localStorage.getItem('play_it_sidebar_collapsed') === 'true' : false,
  isAboutOpen: false,
  isShortcutsOpen: false,

  loadLibrary: async () => {
    if (!window.glassAPI) return;

    try {
      const [tracks, videos, playlists] = await Promise.all([
        window.glassAPI.getTracks(),
        window.glassAPI.getVideos(),
        window.glassAPI.getPlaylists(),
      ]);

      set({ tracks, videos, playlists });

      // Listen for background scan updates
      window.glassAPI.onScanProgress((prog) => {
        set({ isScanning: true, scanProgress: prog });
        if (prog.current >= prog.total) {
          setTimeout(() => set({ isScanning: false, scanProgress: null }), 1000);
        }
      });
    } catch (e) {
      console.error('[LibraryStore] Failed to load library:', e);
    }
  },

  pickAndImportAudio: async () => {
    if (!window.glassAPI) return;
    set({ isScanning: true });
    try {
      const newTracks = await window.glassAPI.pickAudioFiles();
      if (newTracks && newTracks.length > 0) {
        await get().loadLibrary();
      }
    } finally {
      set({ isScanning: false });
    }
  },

  pickAndImportVideos: async () => {
    if (!window.glassAPI) return;
    set({ isScanning: true });
    try {
      const newVideos = await window.glassAPI.pickVideoFiles();
      if (newVideos && newVideos.length > 0) {
        await get().loadLibrary();
      }
    } finally {
      set({ isScanning: false });
    }
  },

  pickAndImportFolder: async () => {
    if (!window.glassAPI) return;
    set({ isScanning: true });
    try {
      const result = await window.glassAPI.pickFolder();
      if (result) {
        await get().loadLibrary();
      }
    } finally {
      set({ isScanning: false });
    }
  },

  importDroppedPaths: async (paths: string[]) => {
    if (!window.glassAPI || paths.length === 0) return;
    set({ isScanning: true });
    try {
      await window.glassAPI.importPaths(paths);
      await get().loadLibrary();
    } finally {
      set({ isScanning: false });
    }
  },

  toggleTrackFavorite: async (id: number) => {
    if (!window.glassAPI) return;
    const isFav = await window.glassAPI.toggleTrackFavorite(id);
    set((state) => ({
      tracks: state.tracks.map((t) => (t.id === id ? { ...t, is_favorite: isFav ? 1 : 0 } : t)),
    }));
  },

  removeTrack: async (id: number) => {
    if (!window.glassAPI) return;
    await window.glassAPI.removeTrack(id);
    set((state) => ({
      tracks: state.tracks.filter((t) => t.id !== id),
      activePlaylistTracks: state.activePlaylistTracks.filter((t) => t.id !== id),
    }));
  },

  toggleVideoFavorite: async (id: number) => {
    if (!window.glassAPI) return;
    const isFav = await window.glassAPI.toggleVideoFavorite(id);
    set((state) => ({
      videos: state.videos.map((v) => (v.id === id ? { ...v, is_favorite: isFav ? 1 : 0 } : v)),
    }));
  },

  removeVideo: async (id: number) => {
    if (!window.glassAPI) return;
    await window.glassAPI.removeVideo(id);
    set((state) => ({
      videos: state.videos.filter((v) => v.id !== id),
    }));
  },

  createPlaylist: async (name: string) => {
    if (!window.glassAPI || !name.trim()) return null;
    const pl = await window.glassAPI.createPlaylist(name.trim());
    if (pl) {
      set((state) => ({ playlists: [...state.playlists, pl] }));
    }
    return pl;
  },

  renamePlaylist: async (id: number, name: string) => {
    if (!window.glassAPI || !name.trim()) return;
    await window.glassAPI.renamePlaylist(id, name.trim());
    set((state) => ({
      playlists: state.playlists.map((p) => (p.id === id ? { ...p, name: name.trim() } : p)),
    }));
  },

  deletePlaylist: async (id: number) => {
    if (!window.glassAPI) return;
    await window.glassAPI.deletePlaylist(id);
    set((state) => ({
      playlists: state.playlists.filter((p) => p.id !== id),
      activePlaylistId: state.activePlaylistId === id ? null : state.activePlaylistId,
      activePlaylistTracks: state.activePlaylistId === id ? [] : state.activePlaylistTracks,
    }));
  },

  addTrackToPlaylist: async (playlistId: number, trackId: number) => {
    if (!window.glassAPI) return;
    await window.glassAPI.addToPlaylist(playlistId, trackId);
    if (get().activePlaylistId === playlistId) {
      const tracks = await window.glassAPI.getPlaylistTracks(playlistId);
      set({ activePlaylistTracks: tracks });
    }
    // Update playlist count
    const playlists = await window.glassAPI.getPlaylists();
    set({ playlists });
  },

  removeTrackFromPlaylist: async (playlistId: number, trackId: number) => {
    if (!window.glassAPI) return;
    await window.glassAPI.removeFromPlaylist(playlistId, trackId);
    if (get().activePlaylistId === playlistId) {
      set((state) => ({
        activePlaylistTracks: state.activePlaylistTracks.filter((t) => t.id !== trackId),
      }));
    }
    const playlists = await window.glassAPI.getPlaylists();
    set({ playlists });
  },

  selectPlaylist: async (id: number | null) => {
    set({ activePlaylistId: id });
    if (id !== null && window.glassAPI) {
      const tracks = await window.glassAPI.getPlaylistTracks(id);
      set({ activePlaylistTracks: tracks });
    } else {
      set({ activePlaylistTracks: [] });
    }
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setSort: (option: SortOption, order?: SortOrder) => {
    set((state) => ({
      sortOption: option,
      sortOrder: order || (state.sortOption === option ? (state.sortOrder === 'asc' ? 'desc' : 'asc') : 'asc'),
    }));
  },

  setMusicViewMode: (mode: MusicViewMode) => set({ musicViewMode: mode }),
  setMainTab: (tab: MainTab) => set({ mainTab: tab }),
  setScrollPosition: (view: string, pos: number) => {
    set((state) => ({
      scrollPositions: { ...state.scrollPositions, [view]: pos },
    }));
  },
  toggleSidebarCollapse: () => {
    set((state) => {
      const next = !state.isSidebarCollapsed;
      if (typeof window !== 'undefined') {
        localStorage.setItem('play_it_sidebar_collapsed', String(next));
      }
      return { isSidebarCollapsed: next };
    });
  },
  setAboutOpen: (open: boolean) => set({ isAboutOpen: open }),
  setShortcutsOpen: (open: boolean) => set({ isShortcutsOpen: open }),
  scanWatchedFolders: async () => {
    if (!window.glassAPI) return;
    try {
      const settings = await window.glassAPI.getSettings?.();
      if (settings?.musicFolderPath) {
        set({ isScanning: true });
        await window.glassAPI.importPaths?.([settings.musicFolderPath]);
        await get().loadLibrary();
      }
    } finally {
      set({ isScanning: false });
    }
  },
  reorderPlaylists: (playlists) => set({ playlists }),
}));

if (typeof window !== 'undefined') {
  (window as any).__useLibraryStore = useLibraryStore;
}
