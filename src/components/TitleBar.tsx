import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  Minus,
  Square,
  Copy,
  Info,
  Keyboard,
  Settings as SettingsIcon,
  Music,
  Video as VideoIcon,
  Disc,
  User,
  ListMusic,
  ChevronLeft,
} from 'lucide-react';
import { DEFAULT_SPRING_SOFT, EASE_APPLE } from '../motion';
import { Track, Video } from '../types';

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [showBrandMenu, setShowBrandMenu] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const brandMenuRef = useRef<HTMLDivElement>(null);

  const {
    searchQuery,
    setSearchQuery,
    mainTab,
    setMainTab,
    tracks,
    videos,
    playlists,
    setAboutOpen,
    setShortcutsOpen,
    selectPlaylist,
  } = useLibraryStore();

  const { playTrack, activeVideo } = usePlayerStore();

  // Listen to window state change events from Electron main
  useEffect(() => {
    if (window.glassAPI?.getWindowState) {
      window.glassAPI.getWindowState().then((state) => {
        if (state) setIsMaximized(!!state.isMaximized);
      });
    }

    if (window.glassAPI?.onWindowStateChanged) {
      return window.glassAPI.onWindowStateChanged((state) => {
        setIsMaximized(state.isMaximized);
      });
    }
  }, []);

  // Global Ctrl+K / Cmd+K search focus and Esc handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'Escape') {
        if (showBrandMenu) {
          setShowBrandMenu(false);
        } else if (searchQuery) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showBrandMenu, searchQuery, setSearchQuery]);

  // Close brand menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (brandMenuRef.current && !brandMenuRef.current.contains(e.target as Node)) {
        setShowBrandMenu(false);
      }
    };

    if (showBrandMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBrandMenu]);

  // Window control actions
  const handleMinimize = () => window.glassAPI?.minimize?.();
  const handleToggleMaximize = async () => {
    const max = await window.glassAPI?.toggleMaximize?.();
    setIsMaximized(!!max);
  };
  const handleClose = () => window.glassAPI?.close?.();

  // Accent- and case-insensitive search normalizer
  const normalizeText = (text: string) =>
    (text || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const cleanQuery = normalizeText(searchQuery.trim());

  // Search results grouping
  const searchResults = useMemo(() => {
    if (!cleanQuery) return null;

    const matchedTracks = tracks.filter(
      (t) =>
        normalizeText(t.title).includes(cleanQuery) ||
        normalizeText(t.artist).includes(cleanQuery) ||
        normalizeText(t.album).includes(cleanQuery)
    );

    const matchedVideos = videos.filter((v) =>
      normalizeText(v.title).includes(cleanQuery)
    );

    // Unique albums
    const albumSet = new Set<string>();
    const matchedAlbums: { album: string; artist: string }[] = [];
    tracks.forEach((t) => {
      if (t.album && normalizeText(t.album).includes(cleanQuery) && !albumSet.has(t.album)) {
        albumSet.add(t.album);
        matchedAlbums.push({ album: t.album, artist: t.artist });
      }
    });

    // Unique artists
    const artistSet = new Set<string>();
    const matchedArtists: string[] = [];
    tracks.forEach((t) => {
      if (t.artist && normalizeText(t.artist).includes(cleanQuery) && !artistSet.has(t.artist)) {
        artistSet.add(t.artist);
        matchedArtists.push(t.artist);
      }
    });

    const matchedPlaylists = playlists.filter((p) =>
      normalizeText(p.name).includes(cleanQuery)
    );

    const totalMatches =
      matchedTracks.length +
      matchedVideos.length +
      matchedAlbums.length +
      matchedArtists.length +
      matchedPlaylists.length;

    return {
      tracks: matchedTracks.slice(0, 5),
      videos: matchedVideos.slice(0, 3),
      albums: matchedAlbums.slice(0, 3),
      artists: matchedArtists.slice(0, 3),
      playlists: matchedPlaylists.slice(0, 3),
      totalMatches,
    };
  }, [cleanQuery, tracks, videos, playlists]);

  // Handle Enter to immediately open the top result
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchResults && searchResults.totalMatches > 0) {
      e.preventDefault();
      if (searchResults.tracks.length > 0) {
        playTrack(searchResults.tracks[0]);
        setMainTab('music');
      } else if (searchResults.videos.length > 0) {
        setMainTab('videos');
      } else if (searchResults.albums.length > 0) {
        setMainTab('albums');
      } else if (searchResults.artists.length > 0) {
        setMainTab('artists');
      } else if (searchResults.playlists.length > 0) {
        selectPlaylist(searchResults.playlists[0].id);
        setMainTab('playlists');
      }
      setIsSearchFocused(false);
    }
  };

  return (
    <div
      onDoubleClick={handleToggleMaximize}
      className="window-titlebar titlebar-drag-region select-none"
    >
      {/* 1. Left Section: Video Mode Back button OR Brand Logo with Dropdown */}
      {mainTab === 'video-player' ? (
        <div
          className="no-drag"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '320px',
          }}
        >
          <button
            type="button"
            onClick={() => setMainTab('music')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              borderRadius: '999px',
              background: 'var(--theme-btn-bg)',
              border: '1px solid var(--theme-btn-border)',
              color: 'var(--theme-text)',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
            title="Back to library"
            aria-label="Back to library"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--theme-text)', lineHeight: 1.2 }}>
              {activeVideo ? activeVideo.title : 'Video Cinema'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-sub)', lineHeight: 1.2 }}>
              {activeVideo
                ? `${activeVideo.width && activeVideo.height ? `${activeVideo.width}×${activeVideo.height} · ` : ''}${activeVideo.file_path ? activeVideo.file_path.split('.').pop()?.toUpperCase() : 'Video'}`
                : 'Offline 4K & HDR Player'}
            </span>
          </div>
        </div>
      ) : (
        <div className="relative no-drag" ref={brandMenuRef}>
          <div
            role="button"
            tabIndex={0}
            onClick={() => setShowBrandMenu(!showBrandMenu)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setShowBrandMenu(!showBrandMenu);
              }
            }}
            aria-label="Play It Menu"
            aria-haspopup="true"
            aria-expanded={showBrandMenu}
            className="titlebar-brand"
            title="Play It Menu"
          >
            <div className="brand-disc">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="brand-play-glyph"
                aria-hidden="true"
                style={{ marginLeft: '2px' }}
              >
                <path d="M8 5l12 7-12 7z" />
              </svg>
            </div>
            <span className="brand-text">Play It</span>
          </div>

          {/* Brand Menu Dropdown */}
          <AnimatePresence>
            {showBrandMenu && (
              <motion.div
                initial={{ opacity: 0, scale: 0.94, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.94, y: 6 }}
                transition={{ duration: 0.15, ease: EASE_APPLE }}
                className="absolute left-0 top-11 w-52 p-1.5 rounded-2xl glass-panel shadow-2xl z-50 flex flex-col gap-1 border border-white/30 text-white"
                style={{ background: 'rgba(24, 16, 42, 0.94)' }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setShowBrandMenu(false);
                    setAboutOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-xs text-left transition-colors text-slate-200 hover:text-white"
                >
                  <Info className="w-4 h-4 text-sky-400" />
                  <span>About PLay It</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowBrandMenu(false);
                    setShortcutsOpen(true);
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-xs text-left transition-colors text-slate-200 hover:text-white"
                >
                  <Keyboard className="w-4 h-4 text-amber-400" />
                  <span>Check shortcuts</span>
                </button>

                <div className="h-px bg-white/10 my-0.5" />

                <button
                  type="button"
                  onClick={() => {
                    setShowBrandMenu(false);
                    setMainTab('settings');
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/15 text-xs text-left transition-colors text-slate-200 hover:text-white"
                >
                  <SettingsIcon className="w-4 h-4 text-rose-400" />
                  <span>Open settings</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Center Section: Video empty / Settings title / Main & Artists Search bar */}
      {mainTab === 'video-player' ? (
        <div className="flex-1" />
      ) : mainTab === 'settings' ? (
        <div className="relative no-drag flex-1 flex justify-center items-center">
          <span className="settings-header-title">Settings</span>
        </div>
      ) : (
        <div className="relative no-drag flex-1 flex justify-center">
          <div className="search-pill-container">
          <Search
            className="search-pill-icon"
            aria-hidden="true"
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search songs, artists, videos"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
            onKeyDown={handleSearchKeyDown}
            className="search-pill-input"
            aria-label="Search library"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="search-clear-btn"
              title="Clear search (Esc)"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Live Search Quick Results Dropdown */}
        <AnimatePresence>
          {isSearchFocused && cleanQuery && searchResults && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.98 }}
              transition={{ duration: 0.15, ease: EASE_APPLE }}
              className="absolute left-0 right-0 top-11 p-3 rounded-2xl glass-panel shadow-2xl z-50 flex flex-col gap-2.5 border border-white/30 text-white max-h-96 overflow-y-auto"
              style={{ background: 'rgba(24, 16, 42, 0.96)' }}
            >
              {searchResults.totalMatches === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No matches found for "{searchQuery}"
                </div>
              ) : (
                <>
                  {/* Tracks */}
                  {searchResults.tracks.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-2 mb-1">
                        Songs
                      </div>
                      {searchResults.tracks.map((t) => (
                        <div
                          key={`track-${t.id}`}
                          onClick={() => {
                            playTrack(t);
                            setMainTab('music');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Music className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="font-medium truncate">{t.title}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">{t.artist}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Videos */}
                  {searchResults.videos.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400 px-2 mb-1">
                        Videos
                      </div>
                      {searchResults.videos.map((v) => (
                        <div
                          key={`video-${v.id}`}
                          onClick={() => {
                            setMainTab('videos');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <VideoIcon className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="font-medium truncate">{v.title}</span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                            4K
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Albums */}
                  {searchResults.albums.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-sky-400 px-2 mb-1">
                        Albums
                      </div>
                      {searchResults.albums.map((a, idx) => (
                        <div
                          key={`album-${idx}`}
                          onClick={() => {
                            setMainTab('albums');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center justify-between px-2.5 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer text-xs transition-colors"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Disc className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="font-medium truncate">{a.album}</span>
                          </div>
                          <span className="text-[11px] text-slate-400 shrink-0 ml-2">{a.artist}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Artists */}
                  {searchResults.artists.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 px-2 mb-1">
                        Artists
                      </div>
                      {searchResults.artists.map((artist, idx) => (
                        <div
                          key={`artist-${idx}`}
                          onClick={() => {
                            setMainTab('artists');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer text-xs transition-colors"
                        >
                          <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="font-medium truncate">{artist}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Playlists */}
                  {searchResults.playlists.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400 px-2 mb-1">
                        Playlists
                      </div>
                      {searchResults.playlists.map((p) => (
                        <div
                          key={`playlist-${p.id}`}
                          onClick={() => {
                            selectPlaylist(p.id);
                            setMainTab('playlists');
                            setIsSearchFocused(false);
                          }}
                          className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-white/10 cursor-pointer text-xs transition-colors"
                        >
                          <ListMusic className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="font-medium truncate">{p.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      )}

      {/* 3. Right Window Action Controls (Minimize, Maximize/Restore, Close) */}
      <div className="window-buttons-group no-drag">
        <button
          type="button"
          onClick={handleMinimize}
          className="win-circle-btn"
          title="Minimize"
          aria-label="Minimize Window"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>

        <button
          type="button"
          onClick={handleToggleMaximize}
          className="win-circle-btn"
          title={isMaximized ? 'Restore' : 'Maximize'}
          aria-label={isMaximized ? 'Restore Window' : 'Maximize Window'}
        >
          {isMaximized ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="8" y="8" width="11" height="11" rx="2" />
              <path d="M5 15V6a2 2 0 0 1 2-2h9" />
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="5" y="5" width="14" height="14" rx="3" />
            </svg>
          )}
        </button>

        <button
          type="button"
          onClick={handleClose}
          className="win-circle-btn win-circle-btn-close"
          title="Close"
          aria-label="Close Window"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>
    </div>
  );
};
