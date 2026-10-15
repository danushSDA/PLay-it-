import React, { useMemo } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Music, Plus, FolderOpen, Search, Play } from 'lucide-react';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #ff9f1c, #ff5d73)',
  'linear-gradient(135deg, #d4ee38, #8ce934)',
  'linear-gradient(135deg, #ffc078, #ff6b8b)',
  'linear-gradient(135deg, #ffa94d, #fd7e14)',
  'linear-gradient(135deg, #ff8787, #ffa94d)',
  'linear-gradient(135deg, #d8f564, #94d82d)',
  'linear-gradient(135deg, #e9ed40, #b8d82d)',
  'linear-gradient(135deg, #ffa8a8, #ff6b6b)',
  'linear-gradient(135deg, #ffe066, #ff922b)',
  'linear-gradient(135deg, #c0eb38, #69db7c)',
];

export const MusicView: React.FC = () => {
  const {
    tracks,
    searchQuery,
    setSearchQuery,
    setMainTab,
    pickAndImportAudio,
    pickAndImportFolder,
  } = useLibraryStore();
  const { playTrack, currentTrack } = usePlayerStore();

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const displayList = useMemo(() => {
    if (tracks.length === 0) return [];

    let filtered = tracks;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          (t.title && t.title.toLowerCase().includes(q)) ||
          (t.artist && t.artist.toLowerCase().includes(q)) ||
          (t.album && t.album.toLowerCase().includes(q))
      );
    }
    return filtered.map((t, idx) => ({
      id: t.id,
      rawTrack: t,
      title: t.title || 'Unknown Title',
      artist: t.artist || 'Unknown Artist',
      duration: t.duration || 0,
      cover_art: t.cover_art,
      isVideo: Boolean(t.file_path && t.file_path.toLowerCase().endsWith('.mp4')),
      gradient: CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length],
    }));
  }, [tracks, searchQuery]);

  return (
    <div className="up-next-card">
      {/* Header */}
      <div className="up-next-header">
        <span className="up-next-title">Up next</span>
        <span className="up-next-count">
          {tracks.length > 0 ? `${displayList.length} items` : '0 items'}
        </span>
      </div>

      {/* Empty State: No Tracks in Library */}
      {tracks.length === 0 ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            textAlign: 'center',
            gap: '16px',
          }}
        >
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 28px rgba(255, 94, 98, 0.35)',
            }}
          >
            <Music className="w-8 h-8" />
          </div>

          <div>
            <h2
              style={{
                fontSize: '20px',
                fontWeight: 700,
                color: 'var(--theme-text)',
                margin: 0,
              }}
            >
              Your Music Library is Empty
            </h2>
            <p
              style={{
                fontSize: '13px',
                color: 'var(--theme-text-sub)',
                margin: '6px 0 0',
                maxWidth: '360px',
                lineHeight: 1.5,
              }}
            >
              Import your local MP3, FLAC, WAV, AAC, or M4A music files to begin playback.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => pickAndImportAudio()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '999px',
                background: 'var(--accent-gradient)',
                border: 'none',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(255, 94, 98, 0.35)',
              }}
            >
              <Plus className="w-4 h-4" />
              <span>Add audio files</span>
            </button>

            <button
              type="button"
              onClick={() => pickAndImportFolder()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '999px',
                background: 'var(--theme-btn-bg)',
                border: '1px solid var(--theme-btn-border)',
                color: 'var(--theme-text)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Scan folder</span>
            </button>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--theme-text-sub)', opacity: 0.75 }}>
            Or drag and drop music files anywhere into this window
          </span>
        </div>
      ) : displayList.length === 0 ? (
        /* Empty Search Results */
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 24px',
            textAlign: 'center',
            gap: '12px',
          }}
        >
          <Search className="w-8 h-8 text-orange-950/40" />
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>
              No matches found
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--theme-text-sub)', margin: '4px 0 0' }}>
              No tracks match &ldquo;{searchQuery}&rdquo;. Try a different search term.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            style={{
              padding: '6px 16px',
              borderRadius: '999px',
              background: 'var(--theme-btn-bg)',
              border: '1px solid var(--theme-btn-border)',
              color: 'var(--theme-text)',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              marginTop: '4px',
            }}
          >
            Clear search
          </button>
        </div>
      ) : (
        /* Scrollable Rows */
        <div className="up-next-scroll-list">
          {displayList.map((item) => {
            const isActive = currentTrack ? currentTrack.id === item.id : false;
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (item.isVideo) {
                    setMainTab('video-player');
                  } else if (item.rawTrack) {
                    playTrack(item.rawTrack);
                  }
                }}
                className={`track-row ${isActive ? 'active' : ''}`}
              >
                {/* Thumbnail 44px rounded */}
                <div
                  className="track-row-thumb"
                  style={{
                    background: item.cover_art ? undefined : (item.isVideo ? 'transparent' : item.gradient),
                    border: 'none',
                  }}
                >
                  {item.cover_art ? (
                    <img src={item.cover_art} alt="" />
                  ) : item.isVideo ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="#2b1500" aria-hidden="true" style={{ marginLeft: '4px' }}>
                      <path d="M8 5l12 7-12 7z" />
                    </svg>
                  ) : (
                    <Play className="w-3.5 h-3.5 text-white/90 fill-current ml-0.5" />
                  )}
                </div>

                {/* Title & Subtitle */}
                <div className="track-row-info">
                  <div className="track-row-title">{item.title}</div>
                  <div className="track-row-artist">{item.artist}</div>
                </div>

                {/* Video Chip Badge */}
                {item.isVideo && <span className="pill-chip-video">MP4</span>}

                {/* Duration */}
                <span className="track-row-time">{formatDuration(item.duration)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
