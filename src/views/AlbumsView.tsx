import React, { useState, useMemo, useRef } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Track } from '../types';
import { Disc, Play, Shuffle, ChevronLeft, Plus } from 'lucide-react';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #F5C518, #FF9A1F)',
  'linear-gradient(135deg, #FF9A1F, #FF5E7A)',
  'linear-gradient(135deg, #FF5E7A, #E040FB)',
  'linear-gradient(135deg, #8CD11F, #059669)',
  'linear-gradient(135deg, #38d9ff, #6366f1)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #ffa94d, #fd7e14)',
  'linear-gradient(135deg, #d4ee38, #8ce934)',
];

export const AlbumsView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    tracks,
    searchQuery,
    pickAndImportAudio,
  } = useLibraryStore();

  const { playTrack, setQueue } = usePlayerStore();
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [hoveredAlbum, setHoveredAlbum] = useState<string | null>(null);

  // Group real SQLite tracks by album
  const albumGroups = useMemo(() => {
    if (tracks.length === 0) return [];

    const groups: Record<
      string,
      { album: string; artist: string; coverArt: string | null; tracks: Track[]; gradient: string }
    > = {};

    let idx = 0;
    tracks.forEach((t) => {
      const albName = (t.album && t.album.trim()) ? t.album.trim() : 'Unknown Album';
      if (!groups[albName]) {
        groups[albName] = {
          album: albName,
          artist: (t.artist && t.artist.trim()) ? t.artist.trim() : 'Unknown Artist',
          coverArt: t.cover_art || null,
          tracks: [],
          gradient: CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length],
        };
        idx++;
      }
      if (!groups[albName].coverArt && t.cover_art) {
        groups[albName].coverArt = t.cover_art;
      }
      groups[albName].tracks.push(t);
    });

    let list = Object.values(groups);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((a) => a.album.toLowerCase().includes(q) || a.artist.toLowerCase().includes(q));
    }
    return list;
  }, [tracks, searchQuery]);

  const currentAlbumData = useMemo(() => {
    if (!selectedAlbum) return null;
    return albumGroups.find((a) => a.album === selectedAlbum) || null;
  }, [albumGroups, selectedAlbum]);

  const handlePlayAll = (albumTracks: Track[], shuffle = false) => {
    if (albumTracks.length === 0) return;
    const list = shuffle ? [...albumTracks].sort(() => Math.random() - 0.5) : albumTracks;
    setQueue(list);
    playTrack(list[0]);
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 1. EMPTY STATE IF NO TRACKS
  if (tracks.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 0,
          borderRadius: '28px',
          padding: '40px 24px',
          background: 'var(--theme-card-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid var(--theme-card-border)',
          boxShadow: 'var(--theme-card-shadow)',
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
          <Disc className="w-8 h-8" />
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
            No Albums in Library
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
            Import your local music files to automatically organize albums and album art.
          </p>
        </div>

        <button
          type="button"
          onClick={() => pickAndImportAudio()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 22px',
            borderRadius: '999px',
            background: 'var(--accent-gradient)',
            border: 'none',
            color: '#ffffff',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(255, 94, 98, 0.35)',
            marginTop: '8px',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add audio files</span>
        </button>
      </div>
    );
  }

  // 2. DETAIL VIEW FOR AN ALBUM
  if (currentAlbumData) {
    return (
      <div
        ref={containerRef}
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          borderRadius: '28px',
          padding: '24px',
          background: 'var(--theme-card-bg)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          border: '1px solid var(--theme-card-border)',
          boxShadow: 'var(--theme-card-shadow)',
          overflowY: 'auto',
          scrollbarWidth: 'none',
        }}
      >
        <button
          type="button"
          onClick={() => setSelectedAlbum(null)}
          style={{
            alignSelf: 'flex-start',
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
            marginBottom: '16px',
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Back to Albums</span>
        </button>

        {/* Album Header Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
            padding: '20px',
            borderRadius: '22px',
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid var(--theme-btn-border)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '18px',
              overflow: 'hidden',
              background: currentAlbumData.gradient,
              boxShadow: '0 8px 24px rgba(255, 140, 60, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {currentAlbumData.coverArt ? (
              <img src={currentAlbumData.coverArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Disc className="w-12 h-12 text-white/70" />
            )}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
              Album
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--theme-text)', margin: 0 }}>
              {currentAlbumData.album}
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--theme-text-sub)', margin: 0, fontWeight: 500 }}>
              {currentAlbumData.artist} · {currentAlbumData.tracks.length} tracks
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <button
                type="button"
                onClick={() => handlePlayAll(currentAlbumData.tracks, false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
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
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Play all</span>
              </button>

              <button
                type="button"
                onClick={() => handlePlayAll(currentAlbumData.tracks, true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '999px',
                  background: 'var(--theme-btn-bg)',
                  border: '1px solid var(--theme-btn-border)',
                  color: 'var(--theme-text)',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>Shuffle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tracks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {currentAlbumData.tracks.map((track, i) => (
            <div
              key={track.id}
              onClick={() => playTrack(track, currentAlbumData.tracks)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '10px 14px',
                borderRadius: '14px',
                background: 'transparent',
                cursor: 'pointer',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-row-hover)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <span style={{ width: '20px', fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-sub)' }}>
                {i + 1}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text)' }}>
                  {track.title}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-sub)' }}>
                  {track.artist}
                </div>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--theme-text-sub)', fontVariantNumeric: 'tabular-nums' }}>
                {formatDuration(track.duration)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 3. ALBUMS GRID VIEW
  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: 0,
        borderRadius: '28px',
        padding: '24px',
        background: 'var(--theme-card-bg)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        border: '1px solid var(--theme-card-border)',
        boxShadow: 'var(--theme-card-shadow)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
              Albums
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--theme-text-sub)' }}>
              {albumGroups.length} albums
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
            Albums collection sorted by artist & release
          </p>
        </div>

        <button
          type="button"
          onClick={() => pickAndImportAudio()}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 16px',
            borderRadius: '999px',
            background: 'var(--theme-btn-bg)',
            border: '1px solid var(--theme-btn-border)',
            color: 'var(--theme-text)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Plus className="w-4 h-4" />
          <span>Add audio files</span>
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '16px',
          paddingBottom: '20px',
          scrollbarWidth: 'none',
        }}
      >
        {albumGroups.map((album) => {
          const isHovered = hoveredAlbum === album.album;
          return (
            <div
              key={album.album}
              onMouseEnter={() => setHoveredAlbum(album.album)}
              onMouseLeave={() => setHoveredAlbum(null)}
              onClick={() => setSelectedAlbum(album.album)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                padding: '12px',
                background: isHovered ? 'var(--theme-row-hover)' : 'rgba(255, 255, 255, 0.45)',
                border: '1px solid var(--theme-btn-border)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 8px 24px rgba(255, 140, 60, 0.18)' : 'none',
              }}
            >
              {/* Cover Art */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '1 / 1',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: album.gradient,
                  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {album.coverArt ? (
                  <img src={album.coverArt} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <Disc className="w-12 h-12 text-white/70" />
                )}

                {/* Hover Play Button */}
                {isHovered && (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayAll(album.tracks, false);
                    }}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'var(--accent-gradient)',
                      boxShadow: '0 4px 12px rgba(255, 94, 98, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                    }}
                  >
                    <Play className="w-4 h-4 fill-current ml-0.5" />
                  </div>
                )}
              </div>

              {/* Title & Artist */}
              <div style={{ marginTop: '10px' }}>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--theme-text)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={album.album}
                >
                  {album.album}
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--theme-text-sub)',
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={album.artist}
                >
                  {album.artist} · {album.tracks.length} songs
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
