import React, { useEffect, useState } from 'react';
import { Heart } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

export const HeroCard: React.FC = () => {
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const analyserNode = usePlayerStore((s) => s.analyserNode);
  const setMainTab = useLibraryStore((s) => s.setMainTab);
  const toggleTrackFavorite = useLibraryStore((s) => s.toggleTrackFavorite);

  const [isFav, setIsFav] = useState(false);

  const baseHeights = [
    20, 34, 48, 62, 40, 74, 56, 36, 70, 52,
    80, 60, 42, 76, 62, 46, 82, 58, 38, 72,
    50, 66, 40, 62, 48, 34, 52, 38, 26, 18
  ];
  const [eqHeights, setEqHeights] = useState<number[]>(baseHeights);

  useEffect(() => {
    if (currentTrack) {
      setIsFav(Boolean(currentTrack.is_favorite));
    }
  }, [currentTrack]);

  useEffect(() => {
    if (!isPlaying) {
      setEqHeights(baseHeights.map(() => 14));
      return;
    }

    let animId: number;
    let step = 0;
    const buffer = analyserNode ? new Uint8Array(analyserNode.frequencyBinCount) : null;

    const update = () => {
      animId = requestAnimationFrame(update);
      step++;
      let totalEnergy = 0;
      if (analyserNode && buffer) {
        analyserNode.getByteFrequencyData(buffer);
        for (let j = 0; j < 30; j++) totalEnergy += buffer[j];
      }

      if (totalEnergy > 10 && buffer) {
        const heights = [];
        const count = 30;
        for (let i = 0; i < count; i++) {
          const idx = Math.floor(Math.pow(i / count, 1.4) * (buffer.length / 3));
          const val = buffer[idx] || 0;
          heights.push(Math.max(14, Math.min(84, (val / 255) * 84)));
        }
        setEqHeights(heights);
      } else {
        // Natural organic pulsation around the 30 visualizer bars
        const heights = baseHeights.map((bh, i) => {
          const wave = Math.sin(step * 0.08 + i * 0.55) * 8;
          return Math.max(16, Math.min(84, Math.round(bh + wave)));
        });
        setEqHeights(heights);
      }
    };

    update();
    return () => cancelAnimationFrame(animId);
  }, [analyserNode, isPlaying]);

  const title = currentTrack ? currentTrack.title : 'No track playing';
  const artist = currentTrack
    ? (currentTrack.artist || 'Unknown Artist')
    : 'Select a track or import music to start';
  const isVideo = Boolean(currentTrack?.file_path?.toLowerCase().endsWith('.mp4'));
  const fileExtension = currentTrack?.file_path
    ? currentTrack.file_path.split('.').pop()?.toUpperCase() || 'AUDIO'
    : 'AUDIO';

  const handleHeartToggle = () => {
    if (currentTrack) {
      toggleTrackFavorite(currentTrack.id);
      setIsFav(!isFav);
    }
  };

  const handleArtClick = () => {
    if (isVideo) {
      setMainTab('video-player');
    }
  };

  return (
    <div className="hero-card">
      {/* 216x216 Album Art Box with generated citrus gradient */}
      <div
        className="hero-art-box"
        style={{ width: '216px', height: '216px', cursor: isVideo ? 'pointer' : 'default' }}
        onClick={handleArtClick}
        title={isVideo ? 'Click to open video player' : undefined}
      >
        {currentTrack?.cover_art ? (
          <img src={currentTrack.cover_art} alt="" className="hero-art-img" />
        ) : (
          <>
            <div className="hero-art-bubble-1" />
            <div className="hero-art-bubble-2" />
          </>
        )}

        {/* Liquid wave at bottom */}
        <svg
          className={`hero-wave-2 ${!isPlaying ? 'paused' : ''}`}
          width="472"
          height="80"
          viewBox="0 0 472 80"
          aria-hidden="true"
        >
          <path d="M0 36 Q59 12 118 36 T236 36 T354 36 T472 36 V80 H0 Z" fill="rgba(255,255,255,.24)" />
        </svg>
        <svg
          className={`hero-wave-1 ${!isPlaying ? 'paused' : ''}`}
          width="472"
          height="64"
          viewBox="0 0 472 64"
          aria-hidden="true"
        >
          <path d="M0 28 Q59 6 118 28 T236 28 T354 28 T472 28 V64 H0 Z" fill="rgba(255,255,255,.32)" />
        </svg>
      </div>

      {/* Title with Favorite Heart */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', maxWidth: '90%' }}>
        <h1
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: 'var(--theme-text)',
            letterSpacing: '-0.3px',
            margin: 0,
            lineHeight: 1.15,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={title}
        >
          {title}
        </h1>
        {currentTrack && (
          <button
            type="button"
            onClick={handleHeartToggle}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: isFav ? '#FF5E7A' : 'var(--theme-text-sub)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease',
              flexShrink: 0,
            }}
            title={isFav ? 'Remove from favorites' : 'Add to favorites'}
            aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart
              className="w-5 h-5"
              fill={isFav ? '#FF5E7A' : 'none'}
              stroke={isFav ? '#FF5E7A' : 'currentColor'}
            />
          </button>
        )}
      </div>

      <div
        className="hero-artist"
        style={{
          maxWidth: '85%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {artist}
      </div>

      {/* Chips: Format and Status */}
      <div className="hero-chips-row">
        <span className="pill-chip">{currentTrack ? fileExtension : 'Offline Engine'}</span>
        <span className="pill-chip">
          {currentTrack ? (isPlaying ? 'Now playing' : 'Paused') : 'Ready'}
        </span>
      </div>

      {/* Visualizer: ~70% width */}
      <div className="hero-visualizer-container" style={{ width: '70%' }}>
        {eqHeights.map((h, i) => (
          <div
            key={i}
            className={`hero-eq-bar ${!isPlaying ? 'paused' : ''}`}
            style={{
              height: `${h}px`,
              animation: isPlaying ? undefined : 'none',
              transform: isPlaying ? undefined : 'scaleY(0.2)',
            }}
          />
        ))}
      </div>
    </div>
  );
};
