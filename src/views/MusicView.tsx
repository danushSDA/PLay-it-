import React, { useState } from 'react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { Play, ChevronRight, ChevronLeft, Music } from 'lucide-react';
import { Track } from '../types';

interface TopPick {
  id: string;
  category: string;
  titleLine1: string;
  titleLine2?: string;
  subtitle: string;
  gradient: string;
  type: 'morning' | 'disc' | 'album-card' | 'station';
  trackTitle: string;
  artist: string;
}

const TOP_PICKS: TopPick[] = [
  {
    id: 'pick-morning',
    category: 'Made for You',
    titleLine1: 'Morning',
    titleLine2: 'Mix',
    subtitle: 'Artist Name, Artist Name and more',
    gradient: 'linear-gradient(145deg, #ff5722 0%, #ff7043 55%, #e64a19 100%)',
    type: 'morning',
    trackTitle: 'Morning Mix',
    artist: 'Various Artists',
  },
  {
    id: 'pick-tracks',
    category: 'Most Played',
    titleLine1: 'Night Signals',
    titleLine2: 'Top Tracks',
    subtitle: 'Your most played songs this month',
    gradient: 'linear-gradient(145deg, #5c6b84 0%, #3e4c63 100%)',
    type: 'disc',
    trackTitle: 'Night Signals',
    artist: 'Top Tracks',
  },
  {
    id: 'pick-single',
    category: 'New Release',
    titleLine1: 'Paper Moons – Single',
    subtitle: 'Artist Name · 2026',
    gradient: 'linear-gradient(145deg, #d8cbba 0%, #c4b5a0 100%)',
    type: 'album-card',
    trackTitle: 'Paper Moons',
    artist: 'Artist Name · 2026',
  },
  {
    id: 'pick-station',
    category: 'Made for You',
    titleLine1: 'Your Station',
    subtitle: 'Personalized music mix',
    gradient: 'linear-gradient(145deg, #ff4081 0%, #f50057 100%)',
    type: 'station',
    trackTitle: 'Your Station',
    artist: 'Personalized Stream',
  },
];

interface RecentItem {
  id: string;
  title: string;
  artist: string;
  gradient: string;
}

const RECENT_ITEMS: RecentItem[] = [
  {
    id: 'recent-1',
    title: 'Night Signals',
    artist: 'Artist Name',
    gradient: 'linear-gradient(180deg, #ff5722 0%, #c2185b 45%, #3f51b5 100%)',
  },
  {
    id: 'recent-2',
    title: 'Paper Moons',
    artist: 'Artist Name',
    gradient: 'linear-gradient(135deg, #d8b4e2 0%, #b892c9 100%)',
  },
  {
    id: 'recent-3',
    title: 'Low Tide',
    artist: 'Artist Name',
    gradient: 'linear-gradient(135deg, #b6d5f7 0%, #89b7e9 100%)',
  },
  {
    id: 'recent-4',
    title: 'Golden Static',
    artist: 'Artist Name',
    gradient: 'linear-gradient(135deg, #ffc4bc 0%, #fff0b3 50%, #b8edd2 100%)',
  },
  {
    id: 'recent-5',
    title: 'Echo Garden',
    artist: 'Artist Name',
    gradient: 'radial-gradient(circle at 50% 50%, #c084fc 0%, #581c87 50%, #2e1065 100%)',
  },
];

export const MusicView: React.FC = () => {
  const { tracks, searchQuery, setSearchQuery } = useLibraryStore();
  const { playTrack, isPlaying, currentTrack } = usePlayerStore();
  const [activeRecentIndex, setActiveRecentIndex] = useState<number | null>(null);

  // Play synthetic track or real library track when card clicked
  const handlePlayCard = (title: string, artist: string) => {
    // If library has a track matching or just any track
    if (tracks.length > 0) {
      const match = tracks.find(
        (t) =>
          t.title.toLowerCase().includes(title.toLowerCase()) ||
          t.artist?.toLowerCase().includes(artist.toLowerCase())
      );
      if (match) {
        playTrack(match);
        return;
      }
      // If no exact match, play the first track in library
      playTrack(tracks[0]);
      return;
    }

    // Fallback demo track to populate UI and state
    const demoTrack: Track = {
      id: Math.floor(Math.random() * 100000),
      title: title,
      artist: artist,
      album: 'Play It Ambient',
      duration: 221,
      file_path: '',
      is_favorite: false,
      play_count: 1,
      last_played: Date.now(),
    };
    playTrack(demoTrack);
  };

  return (
    <div className="music-picks-container">
      {/* ===================== SECTION 1: TOP PICKS FOR YOU ===================== */}
      <div className="picks-section">
        {/* Header with Title and < > Arrow Buttons */}
        <div className="picks-section-header">
          <h2 className="picks-title">Top Picks for You</h2>
          <div className="picks-nav-group">
            <button
              type="button"
              className="picks-nav-btn"
              title="Previous picks"
              aria-label="Previous picks"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              className="picks-nav-btn"
              title="Next picks"
              aria-label="Next picks"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4 Large Top Pick Cards */}
        <div className="top-picks-grid">
          {TOP_PICKS.map((pick) => (
            <div
              key={pick.id}
              className="top-pick-card-wrapper"
              onClick={() => handlePlayCard(pick.trackTitle, pick.artist)}
            >
              {/* Category pill/label above card */}
              <div className="top-pick-category">{pick.category}</div>

              {/* Main Card Surface */}
              <div
                className="top-pick-card"
                style={{ background: pick.gradient }}
              >
                {/* Variant 1: Morning Mix (Vibrant Orange Radial Gradient) */}
                {pick.type === 'morning' && (
                  <div className="morning-card-content">
                    <div className="morning-text-block">
                      <div className="morning-title-large">{pick.titleLine1}</div>
                      <div className="morning-title-large">{pick.titleLine2}</div>
                    </div>
                    {/* Circular White Play Button */}
                    <div className="morning-play-btn">
                      <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                )}

                {/* Variant 2: Night Signals Top Tracks (Slate Indigo + Disc Graphic) */}
                {pick.type === 'disc' && (
                  <div className="disc-card-content">
                    <div className="disc-graphic-circle" />
                    <div className="disc-text-block">
                      <div className="disc-title-bold">{pick.titleLine1}</div>
                      <div className="disc-title-sub">{pick.titleLine2}</div>
                    </div>
                  </div>
                )}

                {/* Variant 3: Paper Moons – Single (Tan/Sand + Vertical Preview) */}
                {pick.type === 'album-card' && (
                  <div className="album-card-content">
                    <div className="cassette-artwork-mockup" />
                    <div className="album-card-pill-banner">
                      <div className="album-banner-title">{pick.titleLine1}</div>
                      <div className="album-banner-sub">{pick.subtitle}</div>
                    </div>
                  </div>
                )}

                {/* Variant 4: Your Station (Hot Magenta/Pink + Play Glyph) */}
                {pick.type === 'station' && (
                  <div className="station-card-content">
                    <div className="station-glyph-wrap">
                      <svg width="74" height="74" viewBox="0 0 24 24" fill="rgba(255,255,255,0.4)">
                        <polygon points="6 3 20 12 6 21 6 3" />
                      </svg>
                    </div>
                    <div className="station-banner-pill">
                      <span className="station-banner-text">{pick.titleLine1}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Subtitle (for Morning & Night Signals) */}
              {pick.type !== 'album-card' && pick.type !== 'station' && (
                <div className="top-pick-subtitle" title={pick.subtitle}>
                  {pick.subtitle}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ===================== SECTION 2: RECENTLY PLAYED ===================== */}
      <div className="picks-section recently-played-section">
        {/* Header with Chevron */}
        <div className="picks-section-header">
          <div className="recently-played-heading">
            <h3 className="picks-title">Recently Played</h3>
            <ChevronRight className="w-4 h-4 text-white/70" />
          </div>
        </div>

        {/* 5 Square Rounded Cards */}
        <div className="recently-played-grid">
          {RECENT_ITEMS.map((item, idx) => {
            const isItemPlaying =
              currentTrack &&
              currentTrack.title.toLowerCase() === item.title.toLowerCase() &&
              isPlaying;

            return (
              <div
                key={item.id}
                className="recent-card-wrapper"
                onClick={() => {
                  setActiveRecentIndex(idx);
                  handlePlayCard(item.title, item.artist);
                }}
              >
                {/* Square Card Artwork with Gradient */}
                <div
                  className="recent-card-art"
                  style={{ background: item.gradient }}
                >
                  <div className="recent-card-hover-overlay">
                    <div className="recent-play-disc">
                      <Play className="w-4 h-4 fill-white text-white ml-0.5" />
                    </div>
                  </div>
                </div>

                {/* Title & Artist */}
                <div className="recent-card-meta">
                  <div className="recent-card-title" title={item.title}>
                    {item.title}
                  </div>
                  <div className="recent-card-artist" title={item.artist}>
                    {item.artist}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
