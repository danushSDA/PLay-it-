import React, { useState, useRef } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Playlist, Track } from '../types';
import { ListMusic, Play, Shuffle, ChevronLeft, Plus, Edit2, Trash2, Check, X, Music } from 'lucide-react';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #FF9A1F, #FF5E62)',
  'linear-gradient(135deg, #38d9ff, #2563eb)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
  'linear-gradient(135deg, #8CD11F, #059669)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
];

export const PlaylistsView: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const {
    playlists,
    activePlaylistId,
    activePlaylistTracks,
    selectPlaylist,
    createPlaylist,
    renamePlaylist,
    deletePlaylist,
    removeTrackFromPlaylist,
  } = useLibraryStore();

  const { playTrack, setQueue } = usePlayerStore();

  const [isCreatingInline, setIsCreatingInline] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  const activePlaylist = playlists.find((p) => p.id === activePlaylistId) || null;

  const handleCreate = async () => {
    const name = newPlaylistName.trim();
    if (!name) return;
    await createPlaylist(name);
    setNewPlaylistName('');
    setIsCreatingInline(false);
  };

  const handleRename = async (id: number) => {
    const name = editingName.trim();
    if (!name) return;
    await renamePlaylist(id, name);
    setEditingId(null);
  };

  const handlePlayAll = (tracksToPlay: Track[], shuffle = false) => {
    if (tracksToPlay.length === 0) return;
    const list = shuffle ? [...tracksToPlay].sort(() => Math.random() - 0.5) : tracksToPlay;
    setQueue(list);
    playTrack(list[0]);
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // 1. DETAIL VIEW FOR A SELECTED PLAYLIST
  if (activePlaylist) {
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
          onClick={() => selectPlaylist(null)}
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
          <span>Back to Playlists</span>
        </button>

        {/* Header */}
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
              width: '110px',
              height: '110px',
              borderRadius: '18px',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 8px 24px rgba(255, 140, 60, 0.25)',
              flexShrink: 0,
            }}
          >
            <ListMusic className="w-12 h-12" />
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent-color)', textTransform: 'uppercase' }}>
              Playlist
            </span>
            <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--theme-text)', margin: 0 }}>
              {activePlaylist.name}
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--theme-text-sub)', margin: 0 }}>
              {activePlaylistTracks.length} tracks
            </p>

            {activePlaylistTracks.length > 0 && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                <button
                  type="button"
                  onClick={() => handlePlayAll(activePlaylistTracks, false)}
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
                  onClick={() => handlePlayAll(activePlaylistTracks, true)}
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
            )}
          </div>
        </div>

        {/* Tracks List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {activePlaylistTracks.length === 0 ? (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--theme-text-sub)',
              }}
            >
              <Music className="w-10 h-10 text-orange-950/20 mx-auto mb-2" />
              <p style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>This playlist is empty</p>
              <p style={{ fontSize: '12px', margin: '4px 0 0' }}>
                Right-click any track in your library or queue to add it here.
              </p>
            </div>
          ) : (
            activePlaylistTracks.map((t, idx) => (
              <div
                key={t.id}
                onClick={() => playTrack(t, activePlaylistTracks)}
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
                <span style={{ width: '20px', fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-sub)' }}>
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text)' }}>
                    {t.title}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-sub)' }}>
                    {t.artist}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTrackFromPlaylist(activePlaylist.id, t.id);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    padding: '6px',
                    cursor: 'pointer',
                    color: 'var(--theme-text-sub)',
                  }}
                  title="Remove from playlist"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <span style={{ fontSize: '12px', color: 'var(--theme-text-sub)' }}>
                  {formatDuration(t.duration)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 2. PLAYLISTS OVERVIEW GRID
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
              Playlists
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--theme-text-sub)' }}>
              {playlists.length} playlists
            </span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
            Personal collections and curated listening queues
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsCreatingInline(true)}
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
          <span>New playlist</span>
        </button>
      </div>

      {isCreatingInline && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '16px',
            background: 'rgba(255, 255, 255, 0.6)',
            border: '1px solid var(--accent-color)',
            marginBottom: '16px',
          }}
        >
          <input
            type="text"
            autoFocus
            placeholder="Playlist name"
            value={newPlaylistName}
            onChange={(e) => setNewPlaylistName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            style={{
              flex: 1,
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.8)',
              border: '1px solid var(--theme-btn-border)',
              color: 'var(--theme-text)',
              fontSize: '13px',
              fontWeight: 600,
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={handleCreate}
            style={{
              padding: '6px 14px',
              borderRadius: '8px',
              background: 'var(--accent-color)',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setIsCreatingInline(false);
              setNewPlaylistName('');
            }}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid var(--theme-btn-border)',
              color: 'var(--theme-text)',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {playlists.length === 0 && !isCreatingInline ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px 24px',
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
            <ListMusic className="w-8 h-8" />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
              No Playlists Yet
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
              Create custom playlists to organize your favorite music for any mood.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreatingInline(true)}
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
            <span>Create first playlist</span>
          </button>
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            minHeight: 0,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            paddingBottom: '20px',
            scrollbarWidth: 'none',
          }}
        >
          {playlists.map((playlist, idx) => {
            const isHovered = hoveredId === playlist.id;
            const isEditing = editingId === playlist.id;
            const gradient = CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length];

            return (
              <div
                key={playlist.id}
                onMouseEnter={() => setHoveredId(playlist.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => !isEditing && selectPlaylist(playlist.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: '20px',
                  padding: '12px',
                  background: isHovered ? 'var(--theme-row-hover)' : 'rgba(255, 255, 255, 0.45)',
                  border: '1px solid var(--theme-btn-border)',
                  cursor: isEditing ? 'default' : 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  transform: isHovered && !isEditing ? 'translateY(-2px)' : 'none',
                  boxShadow: isHovered ? '0 8px 24px rgba(255, 140, 60, 0.18)' : 'none',
                }}
              >
                {/* Art Container */}
                <div
                  style={{
                    width: '100%',
                    aspectRatio: '1 / 1',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: gradient,
                    boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <ListMusic className="w-12 h-12 text-white/80" />
                </div>

                {/* Info & Actions */}
                <div style={{ marginTop: '10px' }}>
                  {isEditing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        autoFocus
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(playlist.id)}
                        style={{
                          flex: 1,
                          padding: '4px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--accent-color)',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleRename(playlist.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <Check className="w-4 h-4 text-green-600" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px' }}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          style={{
                            fontSize: '14px',
                            fontWeight: 700,
                            color: 'var(--theme-text)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={playlist.name}
                        >
                          {playlist.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--theme-text-sub)', marginTop: '2px' }}>
                          {playlist.track_count || 0} songs
                        </div>
                      </div>

                      {isHovered && (
                        <div style={{ display: 'flex', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(playlist.id);
                              setEditingName(playlist.name);
                            }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--theme-text-sub)' }}
                            title="Rename"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deletePlaylist(playlist.id)}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--theme-text-sub)' }}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
