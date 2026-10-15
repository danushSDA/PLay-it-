import React, { useMemo, useState, useRef } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Track, Video } from '../types';
import { Heart, Play, Shuffle, Music, Video as VideoIcon } from 'lucide-react';

export const FavoritesView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    tracks,
    videos,
    searchQuery,
    toggleTrackFavorite,
    toggleVideoFavorite,
    setMainTab,
  } = useLibraryStore();

  const { playTrack, setQueue, setActiveVideo } = usePlayerStore();
  const [activeTab, setActiveTab] = useState<'songs' | 'videos'>('songs');

  const favoriteTracks = useMemo(() => {
    let list = tracks.filter((t) => t.is_favorite === 1);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((t) => (t.title && t.title.toLowerCase().includes(q)) || (t.artist && t.artist.toLowerCase().includes(q)));
    }
    return list;
  }, [tracks, searchQuery]);

  const favoriteVideos = useMemo(() => {
    let list = videos.filter((v) => v.is_favorite === 1);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((v) => v.title && v.title.toLowerCase().includes(q));
    }
    return list;
  }, [videos, searchQuery]);

  const handlePlayAll = (shuffle = false) => {
    if (favoriteTracks.length === 0) return;
    const list = shuffle ? [...favoriteTracks].sort(() => Math.random() - 0.5) : favoriteTracks;
    setQueue(list);
    playTrack(list[0]);
  };

  const handlePlayVideo = (video: Video) => {
    setActiveVideo(video);
    setMainTab('video-player');
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
      {/* Top Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px',
          borderRadius: '22px',
          background: 'rgba(255, 255, 255, 0.45)',
          border: '1px solid var(--theme-btn-border)',
          marginBottom: '20px',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '18px',
              background: 'linear-gradient(135deg, #FF5E7A, #FF9A1F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(255, 94, 122, 0.35)',
            }}
          >
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--theme-text)', margin: 0 }}>
              Favorites
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
              {favoriteTracks.length} songs · {favoriteVideos.length} videos
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {favoriteTracks.length > 0 && activeTab === 'songs' && (
            <>
              <button
                type="button"
                onClick={() => handlePlayAll(false)}
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
                onClick={() => handlePlayAll(true)}
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
            </>
          )}
        </div>
      </div>

      {/* Tabs Switcher: Songs vs Videos */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => setActiveTab('songs')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: activeTab === 'songs' ? 'var(--accent-gradient)' : 'var(--theme-btn-bg)',
            border: activeTab === 'songs' ? 'none' : '1px solid var(--theme-btn-border)',
            color: activeTab === 'songs' ? '#ffffff' : 'var(--theme-text)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'songs' ? '0 2px 8px rgba(255, 94, 98, 0.3)' : 'none',
          }}
        >
          <Music className="w-3.5 h-3.5" />
          <span>Songs ({favoriteTracks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('videos')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 16px',
            borderRadius: '999px',
            background: activeTab === 'videos' ? 'var(--accent-gradient)' : 'var(--theme-btn-bg)',
            border: activeTab === 'videos' ? 'none' : '1px solid var(--theme-btn-border)',
            color: activeTab === 'videos' ? '#ffffff' : 'var(--theme-text)',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: activeTab === 'videos' ? '0 2px 8px rgba(255, 94, 98, 0.3)' : 'none',
          }}
        >
          <VideoIcon className="w-3.5 h-3.5" />
          <span>Videos ({favoriteVideos.length})</span>
        </button>
      </div>

      {/* Content List */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          scrollbarWidth: 'none',
        }}
      >
        {activeTab === 'songs' && (
          favoriteTracks.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 24px',
                gap: '12px',
              }}
            >
              <Heart className="w-10 h-10 text-orange-950/30" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>
                  No Favorite Songs Yet
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-sub)', margin: '4px 0 0' }}>
                  Click the heart icon on any song in your library to add it here.
                </p>
              </div>
            </div>
          ) : (
            favoriteTracks.map((track) => (
              <div
                key={track.id}
                onClick={() => playTrack(track, favoriteTracks)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-row-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #FF9A1F, #FF5E62)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <Music className="w-4 h-4" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text)' }}>
                    {track.title}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-sub)' }}>
                    {track.artist} · {track.album}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleTrackFavorite(track.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: 'var(--accent-color)',
                  }}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>

                <span style={{ fontSize: '12px', color: 'var(--theme-text-sub)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(track.duration)}
                </span>
              </div>
            ))
          )
        )}

        {activeTab === 'videos' && (
          favoriteVideos.length === 0 ? (
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                padding: '40px 24px',
                gap: '12px',
              }}
            >
              <Heart className="w-10 h-10 text-orange-950/30" />
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--theme-text)', margin: 0 }}>
                  No Favorite Videos Yet
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--theme-text-sub)', margin: '4px 0 0' }}>
                  Click the heart icon on any video in your library to add it here.
                </p>
              </div>
            </div>
          ) : (
            favoriteVideos.map((video) => (
              <div
                key={video.id}
                onClick={() => handlePlayVideo(video)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '10px 14px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--theme-row-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  style={{
                    width: '56px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #FF9A1F, #FF5E62)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    flexShrink: 0,
                  }}
                >
                  <Play className="w-4 h-4 fill-current ml-0.5" />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text)' }}>
                    {video.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-sub)' }}>
                    {video.width ? `${video.width}×${video.height} · ` : ''}Video
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
                    color: 'var(--accent-color)',
                  }}
                  title="Remove from favorites"
                  aria-label="Remove from favorites"
                >
                  <Heart className="w-4 h-4 fill-current" />
                </button>

                <span style={{ fontSize: '12px', color: 'var(--theme-text-sub)', fontVariantNumeric: 'tabular-nums' }}>
                  {formatDuration(video.duration)}
                </span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
