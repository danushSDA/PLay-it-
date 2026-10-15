import React, { useState, useRef, useEffect } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { formatTime, parseTimeToSeconds } from '../utils/timeUtils';

export const PlayerBar: React.FC = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    shuffle,
    repeat,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleMute,
    toggleShuffle,
    cycleRepeat,
    toggleQueueOpen,
  } = usePlayerStore();

  const { toggleTrackFavorite } = useLibraryStore();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInputVal, setTimeInputVal] = useState('');
  const [showRemaining, setShowRemaining] = useState(false);

  const timeInputRef = useRef<HTMLInputElement>(null);

  const safeCurrentTime = Number.isFinite(currentTime) && currentTime >= 0 ? currentTime : 0;
  const safeSeekPos = Number.isFinite(seekPos) && seekPos >= 0 ? seekPos : 0;
  const currentDisplayTime = isSeeking ? safeSeekPos : safeCurrentTime;
  const totalDisplayDuration =
    Number.isFinite(duration) && duration > 0
      ? duration
      : currentTrack?.duration && Number.isFinite(currentTrack.duration) && currentTrack.duration > 0
      ? currentTrack.duration
      : 0;
  const progressRatio =
    totalDisplayDuration > 0
      ? Math.min(1, Math.max(0, currentDisplayTime / totalDisplayDuration))
      : 0;
  const progressPercent = Number.isFinite(progressRatio) ? progressRatio * 100 : 0;

  useEffect(() => {
    if (isEditingTime) {
      timeInputRef.current?.focus();
      timeInputRef.current?.select();
    }
  }, [isEditingTime]);

  const handleStartTimeEdit = () => {
    if (totalDisplayDuration <= 0) return;
    setIsEditingTime(true);
    setTimeInputVal(formatTime(currentDisplayTime));
  };

  const handleCommitTimeEdit = () => {
    if (!isEditingTime) return;
    const parsed = parseTimeToSeconds(timeInputVal, currentDisplayTime, totalDisplayDuration);
    if (parsed !== null && Number.isFinite(parsed)) {
      seek(parsed);
    }
    setIsEditingTime(false);
  };

  const handleWheelTime = (e: React.WheelEvent) => {
    if (totalDisplayDuration <= 0) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    const nextTime = Math.max(0, Math.min(totalDisplayDuration, safeCurrentTime + delta));
    seek(nextTime);
  };

  const handleMiniPlayer = () => {
    window.glassAPI?.toggleMiniPlayer();
  };

  const isFavorited = Boolean(currentTrack?.is_favorite);

  const handleToggleFavorite = () => {
    if (currentTrack?.id) {
      toggleTrackFavorite(currentTrack.id);
    }
  };

  const title = currentTrack ? currentTrack.title : 'Neon Rain';
  const artist = currentTrack ? currentTrack.artist || 'Night Signals' : 'Night Signals';

  return (
    <div className="player-bar-container floating-capsule">
      {/* Soft curved specular highlight on top */}
      <div className="player-specular-highlight" />

      {/* Left: Artwork, Track Title, Artist, Heart Toggle */}
      <div className="player-left-col">
        <div className="player-left-art">
          {currentTrack?.cover_art ? (
            <img src={currentTrack.cover_art} alt="" />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #c084fc 0%, #a855f7 40%, #6366f1 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            />
          )}
        </div>
        <div className="player-left-meta">
          <div className="player-left-title" title={title}>
            {title}
          </div>
          <div className="player-left-artist" title={artist}>
            {artist}
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleFavorite}
          className={`player-heart-btn ${isFavorited ? 'active' : ''}`}
          title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
          aria-label="Favorite button"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill={isFavorited ? '#ff5277' : 'none'}
            stroke={isFavorited ? '#ff5277' : 'currentColor'}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Center: Controls & Seek Bar */}
      <div className="player-center-col">
        {/* Buttons Row: shuffle, prev, white pill play/pause, next, repeat */}
        <div className="player-controls-row">
          <button
            onClick={toggleShuffle}
            className={`ctrl-btn-outline ${shuffle ? 'active' : ''}`}
            style={{ width: '32px', height: '32px' }}
            title="Shuffle"
            aria-label="Shuffle"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M16 4h4v4M4 20L20 4M20 16v4h-4M4 4l5 5M15 15l5 5" />
            </svg>
          </button>

          <button
            onClick={playPrev}
            className="ctrl-btn-outline"
            style={{ width: '32px', height: '32px' }}
            title="Previous track"
            aria-label="Previous track"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="19 20 9 12 19 4 19 20" />
              <line x1="5" y1="19" x2="5" y2="5" />
            </svg>
          </button>

          {/* Center White Pill Play/Pause button */}
          <button
            onClick={togglePlay}
            className="play-pause-pill"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="#111111" aria-hidden="true">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="#111111"
                aria-hidden="true"
                style={{ marginLeft: '2px' }}
              >
                <polygon points="7 4 20 12 7 20 7 4" />
              </svg>
            )}
          </button>

          <button
            onClick={playNext}
            className="ctrl-btn-outline"
            style={{ width: '32px', height: '32px' }}
            title="Next track"
            aria-label="Next track"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="5 4 15 12 5 20 5 4" />
              <line x1="19" y1="5" x2="19" y2="19" />
            </svg>
          </button>

          <button
            onClick={cycleRepeat}
            className={`ctrl-btn-outline ${repeat !== 'off' ? 'active' : ''}`}
            style={{ width: '32px', height: '32px' }}
            title="Repeat"
            aria-label="Repeat"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3" />
            </svg>
          </button>
        </div>

        {/* Seek Bar with adjustable timestamp, hover preview, and remaining time toggle */}
        <div className="player-progress-row">
          {/* Current Time */}
          {isEditingTime ? (
            <input
              ref={timeInputRef}
              type="text"
              value={timeInputVal}
              onChange={(e) => setTimeInputVal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCommitTimeEdit();
                else if (e.key === 'Escape') setIsEditingTime(false);
              }}
              onBlur={handleCommitTimeEdit}
              className="progress-time-input"
              title="Enter timestamp (e.g. 1:30, 90, +15, -10)"
            />
          ) : (
            <span
              className={`progress-time-label ${totalDisplayDuration > 0 ? 'adjustable' : ''}`}
              style={{ textAlign: 'right' }}
              onClick={handleStartTimeEdit}
              onWheel={handleWheelTime}
              title={totalDisplayDuration > 0 ? 'Click to jump to time · Scroll wheel to adjust (±5s)' : undefined}
            >
              {formatTime(currentDisplayTime)}
            </span>
          )}

          {/* Seek Track with drag-scrubbing and hover tooltip */}
          <div
            className="progress-track-bg"
            onPointerDown={(e) => {
              if (totalDisplayDuration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setIsSeeking(true);
              setSeekPos(pos * totalDisplayDuration);
              try {
                (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              } catch (_) {}
            }}
            onPointerMove={(e) => {
              if (totalDisplayDuration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              if (isSeeking) {
                setSeekPos(pos * totalDisplayDuration);
              }
              setHoverPos(pos);
            }}
            onPointerUp={(e) => {
              if (isSeeking && totalDisplayDuration > 0) {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                seek(pos * totalDisplayDuration);
                setIsSeeking(false);
              }
              try {
                (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
              } catch (_) {}
            }}
            onPointerCancel={() => setIsSeeking(false)}
            onPointerLeave={() => {
              if (!isSeeking) setHoverPos(null);
            }}
          >
            {/* Hover tooltip badge */}
            {hoverPos !== null && totalDisplayDuration > 0 && (
              <div
                className="progress-seek-tooltip"
                style={{ left: `${hoverPos * 100}%` }}
              >
                {formatTime(hoverPos * totalDisplayDuration)}
              </div>
            )}

            <div
              className="progress-track-fill-citrus"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="progress-thumb-knob-citrus"
              style={{ left: `${progressPercent}%` }}
            />
          </div>

          {/* Total Duration - Click to toggle between total and countdown remaining */}
          <span
            className={`progress-time-label ${totalDisplayDuration > 0 ? 'adjustable' : ''}`}
            style={{ textAlign: 'left' }}
            onClick={() => setShowRemaining(!showRemaining)}
            title={
              totalDisplayDuration > 0
                ? showRemaining
                  ? 'Showing remaining time (click for total)'
                  : 'Click to show remaining time'
                : undefined
            }
          >
            {showRemaining && totalDisplayDuration > 0
              ? `-${formatTime(Math.max(0, totalDisplayDuration - currentDisplayTime))}`
              : formatTime(totalDisplayDuration || 221)}
          </span>
        </div>
      </div>

      {/* Right: volume icon + volume slider, queue button, mini-player button */}
      <div className="player-right-col">
        <button
          onClick={toggleMute}
          className="player-mute-btn"
          title={isMuted ? 'Unmute' : 'Mute'}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>

        <div
          className="volume-track-bg"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
            setVolume(pos);
          }}
        >
          <div
            className="volume-track-fill-citrus"
            style={{ width: `${isMuted ? 0 : volume * 100}%` }}
          />
        </div>

        <button
          onClick={toggleQueueOpen}
          className="ctrl-btn-glass"
          style={{ width: '32px', height: '32px' }}
          title="Open Queue"
          aria-label="Open Queue"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M4 6h16M4 12h16M4 18h10" />
          </svg>
        </button>

        <button
          onClick={handleMiniPlayer}
          className="ctrl-btn-glass"
          style={{ width: '32px', height: '32px' }}
          title="Mini Player"
          aria-label="Mini Player"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="5" width="18" height="14" rx="3" />
            <rect x="12" y="11" width="7" height="5" rx="1.5" />
          </svg>
        </button>
      </div>
    </div>
  );
};
