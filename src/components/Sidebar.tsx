import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { SidebarItem } from './SidebarItem';
import {
  MusicIcon,
  VideosIcon,
  AlbumsIcon,
  ArtistsIcon,
  PlaylistsIcon,
  FavoritesIcon,
  SettingsIcon,
} from './SidebarIcons';
import { useLibraryStore } from '../store/useLibraryStore';
import { useSettingsStore } from '../store/useSettingsStore';
import {
  useMotionStore,
  getTransition,
  EASE_APPLE,
  DEFAULT_SPRING_SOFT,
} from '../motion';

export const Sidebar: React.FC = () => {
  const {
    mainTab,
    setMainTab,
    isSidebarCollapsed,
    toggleSidebarCollapse,
    selectPlaylist,
    activePlaylistId,
    playlists,
    reorderPlaylists,
    createPlaylist,
    pickAndImportAudio,
    pickAndImportVideos,
    pickAndImportFolder,
    scanWatchedFolders,
  } = useLibraryStore();

  const animationPreference = useSettingsStore((s) => s.animationPreference) || 'full';
  const reducedMotion = animationPreference === 'reduced' || animationPreference === 'off';
  const { sheenKey, triggerSheen } = useMotionStore();

  const isCollapsed = isSidebarCollapsed;
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [sheenActive, setSheenActive] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  // Active item determination
  const isMusicActive = mainTab === 'music';
  const isVideosActive = mainTab === 'videos';
  const isAlbumsActive = mainTab === 'albums';
  const isArtistsActive = mainTab === 'artists';
  const isPlaylistsActive = mainTab === 'playlists';
  const isFavoritesActive = mainTab === 'favorites';
  const isSettingsActive = mainTab === 'settings';

  // Trigger sheen sweep on launch
  useEffect(() => {
    setSheenActive(true);
    const timer = setTimeout(() => setSheenActive(false), 1400);
    return () => clearTimeout(timer);
  }, [sheenKey]);

  // Global Ctrl+B shortcut for collapse/expand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleSidebarCollapse();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebarCollapse]);

  // Specular cursor light calculation using requestAnimationFrame
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      if (containerRef.current) {
        containerRef.current.style.setProperty('--mx', `${x}px`);
        containerRef.current.style.setProperty('--my', `${y}px`);
      }
    });
  };

  const handlePointerLeave = () => {
    if (containerRef.current) {
      containerRef.current.style.setProperty('--mx', '-999px');
      containerRef.current.style.setProperty('--my', '-999px');
    }
    setHoveredIndex(null);
  };

  // Nav item list for index tracking & neighbor wave
  const NAV_ITEMS = [
    {
      id: 'music',
      label: 'Music',
      icon: MusicIcon,
      isActive: isMusicActive,
      onClick: () => {
        setMainTab('music');
        selectPlaylist(null);
      },
    },
    {
      id: 'videos',
      label: 'Videos',
      icon: VideosIcon,
      isActive: isVideosActive,
      onClick: () => {
        setMainTab('videos');
      },
    },
    {
      id: 'albums',
      label: 'Albums',
      icon: AlbumsIcon,
      isActive: isAlbumsActive,
      onClick: () => {
        setMainTab('albums');
      },
    },
    {
      id: 'artists',
      label: 'Artists',
      icon: ArtistsIcon,
      isActive: isArtistsActive,
      onClick: () => {
        setMainTab('artists');
      },
    },
    {
      id: 'playlists',
      label: 'Playlists',
      icon: PlaylistsIcon,
      isActive: isPlaylistsActive,
      onClick: () => {
        setMainTab('playlists');
      },
    },
    {
      id: 'favorites',
      label: 'Favorites',
      icon: FavoritesIcon,
      isActive: isFavoritesActive,
      onClick: () => {
        setMainTab('favorites');
      },
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: SettingsIcon,
      isActive: isSettingsActive,
      onClick: () => {
        setMainTab('settings');
      },
    },
  ];

  // Keyboard navigation across sidebar items (ArrowUp / ArrowDown)
  const handleContainerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const currentIndex = NAV_ITEMS.findIndex((item) => item.isActive);
      const nextIndex =
        e.key === 'ArrowDown'
          ? (currentIndex + 1) % NAV_ITEMS.length
          : (currentIndex - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
      NAV_ITEMS[nextIndex].onClick();
    }
  };

  // Motion transitions
  const softTransition = getTransition('soft', animationPreference);

  // Stagger entrance variants
  const containerVariants = {
    hidden: { x: -24, opacity: 0, scale: 0.98 },
    visible: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        ...softTransition,
        staggerChildren: reducedMotion ? 0 : 0.06,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 8, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.22,
        ease: EASE_APPLE,
      },
    },
  };

  return (
    <motion.aside
      ref={containerRef}
      role="navigation"
      aria-label="Media Player Navigation"
      tabIndex={0}
      onKeyDown={handleContainerKeyDown}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      layout
      transition={{
        ...DEFAULT_SPRING_SOFT,
        layout: DEFAULT_SPRING_SOFT,
      }}
      className={`glass-sidebar ${isCollapsed ? 'is-rail' : ''}`}
      style={{
        position: 'relative',
        width: isCollapsed ? '72px' : '210px',
        padding: isCollapsed ? '12px 10px' : '14px',
        borderRadius: '24px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        flexShrink: 0,
        outline: 'none',
        willChange: 'transform',
      }}
    >
      {/* 1. Cursor Follow Specular Radial Light */}
      {!reducedMotion && (
        <div
          className="sidebar-cursor-light"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(130px at var(--mx, -999px) var(--my, -999px), rgba(255,255,255,0.35), transparent 75%)',
            zIndex: 1,
          }}
        />
      )}

      {/* 2. Diagonal Sheen Sweep on App Launch / Expand */}
      {!reducedMotion && sheenActive && (
        <motion.div
          key={`sheen-${sheenKey}`}
          className="sidebar-sheen-line"
          initial={{ x: '-150%', opacity: 0 }}
          animate={{ x: '250%', opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.2, ease: EASE_APPLE }}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: '80px',
            background:
              'linear-gradient(105deg, transparent, rgba(255, 255, 255, 0.45) 50%, transparent)',
            pointerEvents: 'none',
            zIndex: 2,
          }}
        />
      )}



      {/* 4. Primary Navigation Items & Playlists inside flex: 1 scrollable area */}
      <div
        className="sidebar-nav-scroll"
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '3px',
          zIndex: 3,
          scrollbarWidth: 'none',
        }}
      >
        {NAV_ITEMS.map((item, idx) => (
          <motion.div key={item.id} variants={itemVariants}>
            <SidebarItem
              id={item.id}
              label={item.label}
              icon={item.icon}
              isActive={item.isActive}
              isCollapsed={isCollapsed}
              index={idx}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
              onClick={item.onClick}
            />
          </motion.div>
        ))}

        {/* 5. Custom Playlists Section (Drag and Reorder with Reorder.Group) */}
      {playlists.length > 0 && !isCollapsed && (
        <motion.div
          variants={itemVariants}
          style={{
            marginTop: '8px',
            borderTop: '1px solid rgba(255, 255, 255, 0.12)',
            paddingTop: '8px',
            zIndex: 3,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 8px 4px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
              color: 'var(--theme-text-sub, rgba(255, 255, 255, 0.6))',
            }}
          >
            <span>Playlists ({playlists.length})</span>
            <button
              type="button"
              onClick={() => setShowNewPlaylistModal(true)}
              title="Create new playlist"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '0 4px',
              }}
            >
              +
            </button>
          </div>

          <div
            className="sidebar-playlists-scroll"
            style={{
              maxHeight: '120px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              WebkitMaskImage:
                'linear-gradient(transparent, #000 8px, #000 calc(100% - 12px), transparent)',
              maskImage:
                'linear-gradient(transparent, #000 8px, #000 calc(100% - 12px), transparent)',
              scrollbarWidth: 'none',
            }}
          >
            <Reorder.Group
              axis="y"
              values={playlists}
              onReorder={reorderPlaylists}
              style={{ listStyle: 'none', margin: 0, padding: 0 }}
            >
              {playlists.map((pl) => {
                const isSelected = activePlaylistId === pl.id;
                return (
                  <Reorder.Item
                    key={pl.id}
                    value={pl}
                    whileDrag={{
                      scale: 1.04,
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                      zIndex: 10,
                    }}
                    transition={DEFAULT_SPRING_SOFT}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      height: '34px',
                      padding: '0 10px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(255, 255, 255, 0.22)' : 'transparent',
                      color: isSelected ? 'var(--theme-text, #fff)' : 'var(--theme-text-sub, rgba(255, 255, 255, 0.75))',
                      fontSize: '13px',
                      cursor: 'grab',
                      userSelect: 'none',
                    }}
                    onClick={() => {
                      setMainTab('music');
                      setMusicViewMode('playlists');
                      selectPlaylist(pl.id);
                    }}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9 18V5l11-2v13" />
                      <circle cx="6" cy="18" r="3" />
                    </svg>
                    <span
                      style={{
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {pl.name}
                    </span>
                  </Reorder.Item>
                );
              })}
            </Reorder.Group>
          </div>
        </motion.div>
      )}

      </div>

      {/* 6. Footer (Always visible, flex: none, padding-bottom: 14px) */}
      <div className="sidebar-footer" style={{ flex: 'none', paddingBottom: '14px', zIndex: 5, marginTop: 'auto' }}>
        <motion.div
          variants={itemVariants}
          style={{ position: 'relative', zIndex: 5, marginTop: '8px' }}
        >
        <motion.button
          type="button"
          onClick={() => setShowAddMenu(!showAddMenu)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          transition={DEFAULT_SPRING_SOFT}
          className="sidebar-add-btn"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '42px',
            borderRadius: isCollapsed ? '21px' : '14px',
            gap: isCollapsed ? 0 : '8px',
            padding: isCollapsed ? 0 : '0 14px',
            width: '100%',
          }}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          {!isCollapsed && <span>Add media</span>}
        </motion.button>

        {/* Add Media Popover Menu */}
        <AnimatePresence>
          {showAddMenu && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 6 }}
              transition={{ duration: 0.18, ease: EASE_APPLE }}
              style={{
                position: 'absolute',
                bottom: '48px',
                left: isCollapsed ? '76px' : 0,
                right: isCollapsed ? 'auto' : 0,
                width: isCollapsed ? '180px' : '100%',
                background: 'rgba(20, 16, 50, 0.95)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '16px',
                padding: '6px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45)',
                zIndex: 30,
              }}
              onMouseLeave={() => setShowAddMenu(false)}
            >
              <button
                type="button"
                onClick={() => {
                  pickAndImportAudio();
                  setShowAddMenu(false);
                }}
                className="add-media-popover-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                🎵 Add MP3 files
              </button>
              <button
                type="button"
                onClick={() => {
                  pickAndImportVideos();
                  setShowAddMenu(false);
                }}
                className="add-media-popover-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                📺 Add MP4 videos
              </button>
              <button
                type="button"
                onClick={() => {
                  pickAndImportFolder();
                  setShowAddMenu(false);
                }}
                className="add-media-popover-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                📁 Add folder
              </button>
              <button
                type="button"
                onClick={() => {
                  scanWatchedFolders();
                  setShowAddMenu(false);
                }}
                className="add-media-popover-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                🔍 Scan watched folders
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Collapse Toggle Button */}
      <motion.button
        type="button"
        onClick={toggleSidebarCollapse}
        aria-label={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        title={isCollapsed ? 'Expand sidebar (Ctrl+B)' : 'Collapse sidebar (Ctrl+B)'}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '32px',
          borderRadius: isCollapsed ? '16px' : '10px',
          background: 'rgba(255, 255, 255, 0.08)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          color: 'var(--theme-text-sub, rgba(255, 255, 255, 0.7))',
          cursor: 'pointer',
          width: '100%',
          marginTop: '6px',
          fontSize: '11px',
          gap: '6px',
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {isCollapsed ? (
            <path d="M13 17l5-5-5-5M6 17l5-5-5-5" />
          ) : (
            <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
          )}
        </svg>
        {!isCollapsed && <span>{isCollapsed ? 'Expand' : 'Collapse (Ctrl+B)'}</span>}
      </motion.button>


      </div>

      {/* 8. New Playlist Modal */}
      <AnimatePresence>
        {showNewPlaylistModal && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
            }}
            onClick={() => setShowNewPlaylistModal(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.94, opacity: 0 }}
              transition={DEFAULT_SPRING_SOFT}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '320px',
                padding: '20px',
                borderRadius: '20px',
                background: 'rgba(25, 18, 48, 0.96)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                gap: '14px',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 600 }}>Create New Playlist</div>
              <input
                type="text"
                autoFocus
                placeholder="Playlist name"
                value={newPlaylistName}
                onChange={(e) => setNewPlaylistName(e.target.value)}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && newPlaylistName.trim()) {
                    await createPlaylist(newPlaylistName.trim());
                    setNewPlaylistName('');
                    setShowNewPlaylistModal(false);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  outline: 'none',
                  fontSize: '14px',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowNewPlaylistModal(false)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    background: 'transparent',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: '#fff',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (newPlaylistName.trim()) {
                      await createPlaylist(newPlaylistName.trim());
                      setNewPlaylistName('');
                      setShowNewPlaylistModal(false);
                    }
                  }}
                  style={{
                    padding: '6px 16px',
                    borderRadius: '10px',
                    background: 'var(--accent-cyan, #38bdf8)',
                    border: 'none',
                    color: '#000',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Create
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
};
