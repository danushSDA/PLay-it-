import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { HeroCard } from './components/HeroCard';
import { PlayerBar } from './components/PlayerBar';
import { QueuePanel } from './components/QueuePanel';
import { EqualizerModal } from './components/EqualizerModal';
import { MiniPlayer } from './components/MiniPlayer';
import { ResizeHandles } from './components/ResizeHandles';
import { MotionDevPanel } from './components/MotionDevPanel';
import { MusicView } from './views/MusicView';
import { VideosView } from './views/VideosView';
import { AlbumsView } from './views/AlbumsView';
import { ArtistsView } from './views/ArtistsView';
import { PlaylistsView } from './views/PlaylistsView';
import { FavoritesView } from './views/FavoritesView';
import { SettingsView } from './views/SettingsView';
import { VideoPlayerView } from './views/VideoPlayerView';
import { AboutModal } from './components/AboutModal';
import { ShortcutsModal } from './components/ShortcutsModal';
import { GlassToast } from './components/GlassToast';
import { usePlayerStore } from './store/usePlayerStore';
import { useLibraryStore } from './store/useLibraryStore';
import { useSettingsStore } from './store/useSettingsStore';
import { DEFAULT_SPRING_SOFT, EASE_APPLE } from './motion';

export const App: React.FC = () => {
  const [isMini, setIsMini] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const initAudioEngine = usePlayerStore((s) => s.initAudioEngine);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const loadLibrary = useLibraryStore((s) => s.loadLibrary);
  const importDroppedPaths = useLibraryStore((s) => s.importDroppedPaths);
  const mainTab = useLibraryStore((s) => s.mainTab);
  const setMainTab = useLibraryStore((s) => s.setMainTab);
  const { loadSettings, theme, useWindowsAcrylic } = useSettingsStore();

  // Global settings shortcut (Ctrl+,) and back via Esc from settings
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        setMainTab('settings');
      } else if (e.key === 'Escape' && mainTab === 'settings') {
        setMainTab('music');
      }
    };

    (window as any).__setTab = setMainTab;
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mainTab, setMainTab]);

  useEffect(() => {
    initAudioEngine();
    loadLibrary();
    loadSettings();

    // Query initial state
    window.glassAPI?.getWindowState?.().then((state) => {
      if (state) {
        setIsMaximized(!!state.isMaximized);
        setIsMini(!!state.isMiniPlayer);
      }
    });

    let cleanupState: (() => void) | undefined;
    if (window.glassAPI?.onWindowStateChanged) {
      cleanupState = window.glassAPI.onWindowStateChanged((state) => {
        setIsMaximized(!!state.isMaximized);
        setIsMini(!!state.isMiniPlayer);
      });
    }

    let cleanupFile: (() => void) | undefined;
    if (window.glassAPI?.onOpenFile) {
      cleanupFile = window.glassAPI.onOpenFile(async (filePath) => {
        await importDroppedPaths([filePath]);
      });
    }

    return () => {
      cleanupState?.();
      cleanupFile?.();
    };
  }, []);

  // Global drag-and-drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const paths = files.map((f: any) => f.path || f.name).filter(Boolean);
      await importDroppedPaths(paths);
    }
  };

  if (isMini) {
    return (
      <div className={`app-window mini-player-window ${useWindowsAcrylic ? 'acrylic-mode' : ''}`} data-theme={theme}>
        <MiniPlayer />
      </div>
    );
  }

  // Player bar on every screen except VideoPlayer (and under Settings only if playing)
  const showPlayerBar = mainTab !== 'video-player' && (mainTab !== 'settings' || isPlaying);

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`app-window ${isMaximized ? 'maximized' : ''} ${!showPlayerBar ? 'no-player-bar' : ''} ${useWindowsAcrylic ? 'acrylic-mode' : ''} ${mainTab === 'video-player' ? 'video-player-mode' : ''}`}
      data-theme={theme}
    >
      {/* Custom resize handles for transparent frameless window (hidden when maximized) */}
      {!isMaximized && !useWindowsAcrylic && <ResizeHandles />}

      {/* Grid Row 1: Title Bar (44px) */}
      <TitleBar />

      {/* Grid Row 2: Content Row (Sidebar + Content OR Video Screen) */}
      {mainTab === 'video-player' ? (
        <div className="workspace-body video-player-body">
          <VideoPlayerView />
        </div>
      ) : (
        <div className={`workspace-body ${mainTab === 'settings' ? 'settings-active' : ''}`}>
          {/* Left Sidebar (210px) */}
          <Sidebar />

          {/* Content Area with Apple spring transitions */}
          <AnimatePresence mode="wait">
          {mainTab === 'music' && (
            <motion.div
              key="music-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <MusicView />
            </motion.div>
          )}

          {mainTab === 'videos' && (
            <motion.div
              key="videos-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <VideosView />
            </motion.div>
          )}

          {mainTab === 'albums' && (
            <motion.div
              key="albums-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <AlbumsView />
            </motion.div>
          )}

          {mainTab === 'artists' && (
            <motion.div
              key="artists-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <ArtistsView />
            </motion.div>
          )}

          {mainTab === 'playlists' && (
            <motion.div
              key="playlists-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <PlaylistsView />
            </motion.div>
          )}

          {mainTab === 'favorites' && (
            <motion.div
              key="favorites-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <FavoritesView />
            </motion.div>
          )}

          {mainTab === 'settings' && (
            <motion.div
              key="settings-view"
              initial={{ y: 8, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 6, opacity: 0, scale: 0.99 }}
              transition={{
                ...DEFAULT_SPRING_SOFT,
                opacity: { duration: 0.16, ease: EASE_APPLE },
              }}
              style={{
                display: 'flex',
                flex: 1,
                minWidth: 0,
                minHeight: 0,
                height: '100%',
              }}
            >
              <SettingsView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* Grid Row 3: Player Bar (92px, normal flow grid item) */}
      {showPlayerBar && <PlayerBar />}

      {/* Popups, Modals, Toasts & Dev Inspector */}
      <AboutModal />
      <ShortcutsModal />
      <GlassToast />
      <QueuePanel />
      <EqualizerModal />
      <MotionDevPanel />
    </div>
  );
};
