import React, { useState, useMemo } from 'react';
import { Play, Shuffle, Heart, ArrowUpDown, Music, Plus, User } from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Track } from '../types';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #ff9f1c, #ff5d73)',
  'linear-gradient(135deg, #d4ee38, #8ce934)',
  'linear-gradient(135deg, #8cd11f, #66b514)',
  'linear-gradient(135deg, #ff9f1c, #fd7e14)',
  'linear-gradient(135deg, #ffa94d, #fd7e14)',
  'linear-gradient(135deg, #ff8787, #ffa94d)',
  'linear-gradient(135deg, #d8f564, #94d82d)',
  'linear-gradient(135deg, #ffa94d, #f76707)',
  'linear-gradient(135deg, #ff9f1c, #ff6b8b)',
  'linear-gradient(135deg, #f5c518, #ff9a1f)',
];

interface AggregatedArtist {
  id: string;
  name: string;
  initial: string;
  songsCount: number;
  albumsCount: number;
  totalTime: string;
  gradient: string;
  tracks: Track[];
  topTracks: Track[];
  albums: { title: string; gradient: string; tracks: Track[] }[];
}

export const ArtistsView: React.FC = () => {
  const { tracks, searchQuery, pickAndImportAudio } = useLibraryStore();
  const { playTrack, setQueue } = usePlayerStore();

  const [selectedArtistId, setSelectedArtistId] = useState<string | null>(null);
  const [favoriteArtists, setFavoriteArtists] = useState<Record<string, boolean>>({});
  const [sortMode, setSortMode] = useState<'name' | 'songs' | 'recent'>('name');

  const formatTotalTime = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0 min';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs} h ${mins} min`;
    }
    return `${mins} min`;
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Group real SQLite tracks by artist
  const artistsList = useMemo(() => {
    if (tracks.length === 0) return [];

    const map = new Map<string, Track[]>();
    for (const t of tracks) {
      const artist = (t.artist && t.artist.trim()) ? t.artist.trim() : 'Unknown Artist';
      if (!map.has(artist)) {
        map.set(artist, []);
      }
      map.get(artist)!.push(t);
    }

    const result: AggregatedArtist[] = [];
    let idx = 0;

    map.forEach((artistTracks, artistName) => {
      const uniqueAlbums = Array.from(new Set(artistTracks.map((t) => t.album || 'Unknown Album')));
      const totalSec = artistTracks.reduce((sum, t) => sum + (t.duration || 0), 0);

      // Group tracks by album for this artist
      const albumMap = new Map<string, Track[]>();
      for (const t of artistTracks) {
        const alb = t.album || 'Unknown Album';
        if (!albumMap.has(alb)) albumMap.set(alb, []);
        albumMap.get(alb)!.push(t);
      }

      const albumsList = Array.from(albumMap.entries()).map(([albTitle, albTracks], albIdx) => ({
        title: albTitle,
        gradient: CITRUS_GRADIENTS[(idx + albIdx + 2) % CITRUS_GRADIENTS.length],
        tracks: albTracks,
      }));

      // Top tracks sorted by play_count desc or original order
      const sortedTracks = [...artistTracks].sort((a, b) => (b.play_count || 0) - (a.play_count || 0));

      result.push({
        id: encodeURIComponent(artistName.toLowerCase()),
        name: artistName,
        initial: artistName.charAt(0).toUpperCase() || '?',
        songsCount: artistTracks.length,
        albumsCount: uniqueAlbums.length,
        totalTime: formatTotalTime(totalSec),
        gradient: CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length],
        tracks: artistTracks,
        topTracks: sortedTracks.slice(0, 6),
        albums: albumsList,
      });

      idx++;
    });

    let filtered = result;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((a) => a.name.toLowerCase().includes(q));
    }

    if (sortMode === 'name') {
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMode === 'songs') {
      return [...filtered].sort((a, b) => b.songsCount - a.songsCount);
    }
    return filtered;
  }, [tracks, searchQuery, sortMode]);

  const selectedArtist = useMemo(() => {
    if (artistsList.length === 0) return null;
    if (selectedArtistId) {
      const found = artistsList.find((a) => a.id === selectedArtistId);
      if (found) return found;
    }
    return artistsList[0];
  }, [artistsList, selectedArtistId]);

  const handlePlayAll = (artistTracks: Track[], shuffle = false) => {
    if (!artistTracks || artistTracks.length === 0) return;
    const queue = shuffle ? [...artistTracks].sort(() => Math.random() - 0.5) : artistTracks;
    setQueue(queue);
    playTrack(queue[0]);
  };

  const isFavorite = selectedArtist ? Boolean(favoriteArtists[selectedArtist.id]) : false;

  const toggleFavoriteArtist = (id: string) => {
    setFavoriteArtists((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 1. EMPTY STATE IF NO TRACKS IN LIBRARY
  if (tracks.length === 0) {
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
            <User className="w-8 h-8" />
          </div>

          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
              No Artists in Library
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
              Add music files to your library to automatically index artists and their discography.
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

  return (
    <div className="artists-screen-grid">
      {/* 1. Left Panel: Artists Grid (flex 1.3) */}
      <div className="artists-grid-card">
        {/* Header */}
        <div className="artists-header-row">
          <div className="flex items-center gap-2">
            <span className="artists-header-title">Artists</span>
            <span className="artists-header-count">{artistsList.length} artists</span>
          </div>

          <button
            type="button"
            onClick={() => {
              setSortMode((prev) => (prev === 'name' ? 'songs' : prev === 'songs' ? 'recent' : 'name'));
            }}
            className="artists-sort-btn"
            title="Sort artists"
            aria-label="Sort artists"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>
              {sortMode === 'name' ? 'Name A–Z' : sortMode === 'songs' ? 'Most songs' : 'Recently added'}
            </span>
          </button>
        </div>

        {/* 3-column Grid of Artist Cards */}
        <div className="artists-cards-scroll">
          <div className="artists-3col-grid">
            {artistsList.map((artist) => {
              const isSelected = selectedArtist?.id === artist.id;
              return (
                <div
                  key={artist.id}
                  onClick={() => setSelectedArtistId(artist.id)}
                  className={`artist-card ${isSelected ? 'selected' : ''}`}
                >
                  <div
                    className="artist-avatar-circle"
                    style={{ background: artist.gradient }}
                  >
                    <span>{artist.initial}</span>
                  </div>
                  <span className="artist-card-name" title={artist.name}>{artist.name}</span>
                  <span className="artist-card-meta">
                    {artist.songsCount} songs · {artist.albumsCount} albums
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Right Panel: Artist Detail Panel (flex 1) */}
      {selectedArtist && (
        <div className="artist-detail-card">
          {/* Artist Header */}
          <div className="artist-detail-header">
            <div
              className="artist-detail-avatar"
              style={{ background: selectedArtist.gradient }}
            >
              <span>{selectedArtist.initial}</span>
            </div>

            <div className="artist-detail-title-group">
              <div className="flex items-center gap-2">
                <span className="artist-detail-name" title={selectedArtist.name}>
                  {selectedArtist.name}
                </span>
                <button
                  type="button"
                  onClick={() => toggleFavoriteArtist(selectedArtist.id)}
                  className="artist-fav-heart"
                  title="Favorite artist"
                  aria-label="Favorite artist"
                >
                  <Heart
                    className="w-4 h-4"
                    fill={isFavorite ? '#FF5E7A' : 'none'}
                    stroke={isFavorite ? '#FF5E7A' : 'currentColor'}
                  />
                </button>
              </div>
              <span className="artist-detail-meta">
                {selectedArtist.songsCount} songs · {selectedArtist.albumsCount} albums · {selectedArtist.totalTime}
              </span>
            </div>
          </div>

          {/* Action Buttons: Play all & Shuffle */}
          <div className="artist-detail-actions">
            <button
              type="button"
              onClick={() => handlePlayAll(selectedArtist.tracks, false)}
              className="artist-play-all-btn"
            >
              <Play className="w-4 h-4 ml-0.5 fill-current" />
              <span>Play all</span>
            </button>

            <button
              type="button"
              onClick={() => handlePlayAll(selectedArtist.tracks, true)}
              className="artist-shuffle-btn"
            >
              <Shuffle className="w-4 h-4" />
              <span>Shuffle</span>
            </button>
          </div>

          {/* Top tracks Section */}
          <div className="artist-top-tracks-section">
            <div className="artist-section-title">Top tracks</div>
            <div className="artist-tracks-list">
              {selectedArtist.topTracks.map((track, i) => (
                <div
                  key={track.id}
                  onClick={() => playTrack(track, selectedArtist.tracks)}
                  className="artist-track-row"
                >
                  <span className="artist-track-num">{i + 1}</span>
                  <div className="artist-track-info">
                    <span className="artist-track-title">{track.title}</span>
                    <span className="artist-track-album">{track.album || 'Unknown Album'}</span>
                  </div>
                  <span className="artist-track-duration">{formatDuration(track.duration)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Albums Section */}
          {selectedArtist.albums.length > 0 && (
            <div className="artist-albums-section">
              <div className="artist-section-title">Albums</div>
              <div className="artist-albums-row">
                {selectedArtist.albums.map((alb, idx) => (
                  <div
                    key={idx}
                    className="artist-album-box"
                    onClick={() => handlePlayAll(alb.tracks, false)}
                    title={`Play ${alb.title}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <div
                      className="artist-album-cover"
                      style={{ background: alb.gradient }}
                    />
                    <span className="artist-album-title">{alb.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
