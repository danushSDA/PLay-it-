import React, { useState, useMemo } from 'react';
import { Video as VideoIcon, Play, Heart, FolderOpen, Plus, Search } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Video } from '../types';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #FF9A1F, #FF5E62)',
  'linear-gradient(135deg, #38d9ff, #2563eb)',
  'linear-gradient(135deg, #8CD11F, #059669)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #06b6d4, #0284c7)',
];

export const VideosView: React.FC = () => {
  const {
    videos,
    searchQuery,
    setSearchQuery,
    pickAndImportVideos,
    pickAndImportFolder,
    toggleVideoFavorite,
    setMainTab,
  } = useLibraryStore();

  const setActiveVideo = usePlayerStore((s) => s.setActiveVideo);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const displayVideos = useMemo(() => {
    if (videos.length === 0) return [];

    let filtered = videos;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((v) => v.title && v.title.toLowerCase().includes(q));
    }
    return filtered.map((v, idx) => ({
      id: v.id,
      rawVideo: v,
      title: v.title || 'Untitled Video',
      duration: v.duration || 0,
      meta: v.width ? `${v.width}×${v.height}` : 'Video file',
      is_favorite: v.is_favorite,
      thumbnail: v.thumbnail,
      gradient: CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length],
    }));
  }, [videos, searchQuery]);

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handlePlayVideo = (video: Video) => {
    setActiveVideo(video);
    setMainTab('video-player');
  };

  // 1. EMPTY STATE IF NO VIDEOS IN LIBRARY
  if (videos.length === 0) {
    return (
      <div
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
          <VideoIcon className="w-8 h-8" />
        </div>

        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
            No Videos in Library
          </h2>
          <p
            style={{
              fontSize: '13px',
              color: 'var(--theme-text-sub)',
              margin: '6px 0 0',
              maxWidth: '380px',
              lineHeight: 1.5,
            }}
          >
            Import your local MP4, MKV, WebM, AVI, or MOV video files for offline 4K and cinema playback.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={() => pickAndImportVideos()}
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
            <span>Add videos</span>
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
      </div>
    );
  }

  return (
    <div
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
      {/* Header */}
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
              Videos
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--theme-text-sub)' }}>
              {displayVideos.length} items
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
            Offline 4K & HDR cinema playback with hardware decoding
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => pickAndImportVideos()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
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
            <span>Add videos</span>
          </button>

          <button
            type="button"
            onClick={() => pickAndImportFolder()}
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
            <FolderOpen className="w-4 h-4" />
            <span>Scan folder</span>
          </button>
        </div>
      </div>

      {/* Grid of video cards */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
          gap: '16px',
          paddingBottom: '20px',
          scrollbarWidth: 'none',
        }}
      >
        {displayVideos.map((video) => {
          const isHovered = hoveredId === video.id;
          return (
            <div
              key={video.id}
              onMouseEnter={() => setHoveredId(video.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handlePlayVideo(video.rawVideo)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '20px',
                padding: '12px',
                background: isHovered ? 'var(--theme-row-hover)' : 'rgba(255, 255, 255, 0.55)',
                border: '1px solid var(--theme-btn-border)',
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                transform: isHovered ? 'translateY(-2px)' : 'none',
                boxShadow: isHovered ? '0 8px 24px rgba(255, 140, 60, 0.18)' : 'none',
              }}
            >
              {/* Thumbnail Container */}
              <div
                style={{
                  width: '100%',
                  aspectRatio: '16 / 9',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: video.gradient,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}
              >
                {video.thumbnail ? (
                  <img src={video.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  /* Play disc on hover */
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '50%',
                      background: 'rgba(0, 0, 0, 0.45)',
                      backdropFilter: 'blur(8px)',
                      border: '1px solid rgba(255, 255, 255, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                      transition: 'transform 0.18s ease',
                    }}
                  >
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                )}

                {/* Duration Badge */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '8px',
                    right: '8px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(0, 0, 0, 0.65)',
                    backdropFilter: 'blur(6px)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 600,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {formatDuration(video.duration)}
                </div>
              </div>

              {/* Info Row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '14px',
                      fontWeight: 700,
                      color: 'var(--theme-text)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={video.title}
                  >
                    {video.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-sub)', marginTop: '2px' }}>
                    {video.meta}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleVideoFavorite(video.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: video.is_favorite ? 'var(--accent-color)' : 'var(--theme-text-sub)',
                  }}
                  title={video.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                  aria-label={video.is_favorite ? 'Remove from favorites' : 'Add to favorites'}
                >
                  <Heart className="w-4 h-4" fill={video.is_favorite ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
