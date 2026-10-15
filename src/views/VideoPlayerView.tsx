import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Headphones,
  Subtitles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  PictureInPicture,
  Info,
  Check,
  Video as VideoIcon,
  Plus,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { MediaProbeResult, Video } from '../types';
import { formatTime, parseTimeToSeconds } from '../utils/timeUtils';

const CITRUS_GRADIENTS = [
  'linear-gradient(135deg, #FF9A1F, #FF5E62)',
  'linear-gradient(135deg, #38d9ff, #2563eb)',
  'linear-gradient(135deg, #8CD11F, #059669)',
  'linear-gradient(135deg, #a855f7, #ec4899)',
  'linear-gradient(135deg, #f59e0b, #ef4444)',
];

export const VideoPlayerView: React.FC = () => {
  const { videos, pickAndImportVideos } = useLibraryStore();
  const { activeVideo, setActiveVideo } = usePlayerStore();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const speedMenuRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(85);
  const [isMuted, setIsMuted] = useState(false);
  const [speed, setSpeed] = useState('1x');
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackMode, setPlaybackMode] = useState<'direct' | 'remuxed' | 'transcoded'>('direct');
  const [abLoop, setAbLoop] = useState<{ a: number | null; b: number | null }>({ a: null, b: null });
  const [probeData, setProbeData] = useState<MediaProbeResult | null>(null);
  const [bufferedPercent, setBufferedPercent] = useState(0);

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPos, setSeekPos] = useState(0);
  const [hoverPos, setHoverPos] = useState<number | null>(null);
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [timeInputVal, setTimeInputVal] = useState('');
  const [showRemaining, setShowRemaining] = useState(false);

  const safeCurrentTime = (Number.isFinite(currentTime) && currentTime >= 0) ? currentTime : 0;
  const safeSeekPos = Number.isFinite(seekPos) && seekPos >= 0 ? seekPos : 0;
  const currentDisplayTime = isSeeking ? safeSeekPos : safeCurrentTime;
  const totalDuration = (Number.isFinite(duration) && duration > 0)
    ? duration
    : (activeVideo?.duration && Number.isFinite(activeVideo.duration) && activeVideo.duration > 0 ? activeVideo.duration : 0);
  const playedRatio = totalDuration > 0
    ? Math.min(1, Math.max(0, currentDisplayTime / totalDuration))
    : 0;
  const playedPercent = Number.isFinite(playedRatio) ? playedRatio * 100 : 0;

  // If no video is selected but library has videos, auto-select first video
  useEffect(() => {
    if (!activeVideo && videos.length > 0) {
      setActiveVideo(videos[0]);
    }
  }, [activeVideo, videos, setActiveVideo]);

  // When activeVideo changes, probe media info using Electron's ffprobe
  useEffect(() => {
    if (!activeVideo) {
      setProbeData(null);
      return;
    }

    let isMounted = true;
    if (window.glassAPI?.probeVideo) {
      window.glassAPI.probeVideo(activeVideo.file_path).then((res) => {
        if (!isMounted || !res) return;
        setProbeData(res);
        if (res.suggestedTier === 'remux') setPlaybackMode('remuxed');
        else if (res.suggestedTier === 'transcode') setPlaybackMode('transcoded');
        else setPlaybackMode('direct');
      }).catch((err) => {
        console.warn('[VideoPlayer] Probe video failed:', err);
      });
    }

    return () => {
      isMounted = false;
    };
  }, [activeVideo]);

  // Handle outside click for speed menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isEditingTime) {
      timeInputRef.current?.focus();
      timeInputRef.current?.select();
    }
  }, [isEditingTime]);


  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Buffer progress
    if (videoRef.current.buffered.length > 0 && videoRef.current.duration > 0) {
      const end = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      setBufferedPercent((end / videoRef.current.duration) * 100);
    }

    // A-B Loop enforcement
    if (abLoop.a !== null && abLoop.b !== null && cur >= abLoop.b) {
      videoRef.current.currentTime = abLoop.a;
    }
  };

  const handleDurationChange = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
      videoRef.current.volume = isMuted ? 0 : volume / 100;
      videoRef.current.playbackRate = parseFloat(speed) || 1;
      videoRef.current.play().catch(() => {
        // Auto-play was prevented by browser policy, keep paused
        setIsPlaying(false);
      });
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (newTime: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(totalDuration, newTime));
    videoRef.current.currentTime = clamped;
    setCurrentTime(clamped);
  };

  const handleStartTimeEdit = () => {
    if (totalDuration <= 0) return;
    setIsEditingTime(true);
    setTimeInputVal(formatTime(currentDisplayTime));
  };

  const handleCommitTimeEdit = () => {
    if (!isEditingTime) return;
    const parsed = parseTimeToSeconds(timeInputVal, currentDisplayTime, totalDuration);
    if (parsed !== null) {
      handleSeek(parsed);
    }
    setIsEditingTime(false);
  };

  const handleWheelTime = (e: React.WheelEvent) => {
    if (totalDuration <= 0) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 5 : -5;
    const nextTime = Math.max(0, Math.min(totalDuration, currentDisplayTime + delta));
    handleSeek(nextTime);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : newVol / 100;
    }
    if (isMuted && newVol > 0) setIsMuted(false);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.volume = nextMuted ? 0 : volume / 100;
    }
  };

  const handleSpeedSelect = (s: string) => {
    setSpeed(s);
    setShowSpeedMenu(false);
    if (videoRef.current) {
      videoRef.current.playbackRate = parseFloat(s) || 1;
    }
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(console.error);
    } else {
      containerRef.current.requestFullscreen().catch(console.error);
    }
  };

  const handlePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('[VideoPlayer] Picture-in-Picture error:', e);
    }
  };

  const streamUrl = activeVideo
    ? (window.glassAPI?.getMediaStreamUrl
        ? window.glassAPI.getMediaStreamUrl(activeVideo.file_path)
        : activeVideo.file_path)
    : '';

  // Derived Media Info values
  const resolutionDisplay = probeData?.video
    ? `${probeData.video.width}×${probeData.video.height}`
    : activeVideo?.width && activeVideo?.height
    ? `${activeVideo.width}×${activeVideo.height}`
    : activeVideo ? 'Probing...' : '–';

  const codecDisplay = probeData?.video?.codec
    ? probeData.video.codec.toUpperCase()
    : activeVideo ? 'H.264 / HEVC' : '–';

  const fpsDisplay = probeData?.video?.fps
    ? `${Math.round(probeData.video.fps)} fps`
    : activeVideo ? '60 fps' : '–';

  const bitrateDisplay = probeData?.video?.bitRate
    ? `${Math.round(probeData.video.bitRate / 1000000)} Mb/s`
    : probeData?.overallBitrate
    ? `${Math.round(probeData.overallBitrate / 1000000)} Mb/s`
    : activeVideo ? 'Auto' : '–';

  const audioDisplay = probeData?.audioTracks?.[0]
    ? `${probeData.audioTracks[0].codec.toUpperCase()} ${probeData.audioTracks[0].channelLayout || (probeData.audioTracks[0].channels ? probeData.audioTracks[0].channels + 'ch' : '')}`
    : activeVideo ? 'Stereo' : '–';

  const containerDisplay = probeData?.container
    ? probeData.container.toUpperCase()
    : activeVideo?.file_path
    ? activeVideo.file_path.split('.').pop()?.toUpperCase() || 'MP4'
    : '–';


  return (
    <div className="video-player-screen" ref={containerRef}>
      {/* 1. Main Video Stage */}
      <div className="video-stage-container">
        <div className="video-stage-canvas">
          {/* Ambient Video Glow Background */}
          <div className="video-stage-bg-gradient" />

          {/* Actual HTML5 Video Element */}
          {activeVideo && streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              onTimeUpdate={handleTimeUpdate}
              onDurationChange={handleDurationChange}
              onLoadedMetadata={handleLoadedMetadata}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                zIndex: 1,
                cursor: 'pointer',
              }}
            />
          ) : (
            /* Empty stage when no video is selected */
            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                gap: '16px',
                textAlign: 'center',
                padding: '24px',
              }}
            >
              <div
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '26px',
                  background: 'var(--accent-gradient)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#ffffff',
                  boxShadow: '0 8px 32px rgba(255, 94, 98, 0.45)',
                }}
              >
                <VideoIcon className="w-10 h-10" />
              </div>

              <div>
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                  No Video Selected
                </h2>
                <p style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', margin: '6px 0 0' }}>
                  Choose a video from the queue or open a video file from your computer.
                </p>
              </div>

              <button
                type="button"
                onClick={() => pickAndImportVideos()}
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
                  boxShadow: '0 4px 16px rgba(255, 94, 98, 0.4)',
                }}
              >
                <Plus className="w-4 h-4" />
                <span>Open video file</span>
              </button>
            </div>
          )}

          {/* Top-left Chips */}
          {activeVideo && (
            <div className="video-stage-chips-top">
              <span className="video-chip">
                {probeData?.video?.resolutionLabel || resolutionDisplay}
              </span>
              <span className="video-chip">{speed}</span>
              {probeData?.video?.isHdr && <span className="video-chip">HDR</span>}
            </div>
          )}

          {/* Big Centered Play Icon only while paused and video is active */}
          {!isPlaying && activeVideo && (
            <button
              type="button"
              onClick={togglePlay}
              className="video-center-play-btn"
              aria-label="Play video"
            >
              <Play className="w-10 h-10 ml-1 text-white" fill="currentColor" />
            </button>
          )}

          {/* Video Control Bar overlay */}
          <div className="video-controls-overlay">
            {/* Top row: elapsed, seek bar with A-B markers & band, total / remaining */}
            <div className="video-seek-row">
              {/* Current Time - Click to edit inline, scroll wheel to adjust +/- 5s */}
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
                  className="video-time-input"
                  title="Enter timestamp (e.g. 1:30, 90, +15, -10)"
                />
              ) : (
                <span
                  className={`video-time-text ${totalDuration > 0 ? 'adjustable' : ''}`}
                  onClick={handleStartTimeEdit}
                  onWheel={handleWheelTime}
                  title={totalDuration > 0 ? 'Click to jump to time · Scroll wheel to adjust (±5s)' : undefined}
                >
                  {formatTime(currentDisplayTime)}
                </span>
              )}

              <div
                className="video-seek-track"
                onPointerDown={(e) => {
                  if (totalDuration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  setIsSeeking(true);
                  setSeekPos(pos * totalDuration);
                  try {
                    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
                  } catch (_) {}
                }}
                onPointerMove={(e) => {
                  if (totalDuration <= 0) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                  if (isSeeking) {
                    setSeekPos(pos * totalDuration);
                  }
                  setHoverPos(pos);
                }}
                onPointerUp={(e) => {
                  if (isSeeking && totalDuration > 0) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                    handleSeek(pos * totalDuration);
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
                {hoverPos !== null && totalDuration > 0 && (
                  <div
                    className="video-seek-tooltip"
                    style={{ left: `${hoverPos * 100}%` }}
                  >
                    {formatTime(hoverPos * totalDuration)}
                  </div>
                )}

                {/* Buffered fill */}
                <div className="video-seek-buffered" style={{ width: `${bufferedPercent}%` }} />

                {/* A-B loop band */}
                {abLoop.a !== null && abLoop.b !== null && totalDuration > 0 && (
                  <div
                    className="video-seek-ab-band"
                    style={{
                      left: `${(abLoop.a / totalDuration) * 100}%`,
                      width: `${((abLoop.b - abLoop.a) / totalDuration) * 100}%`,
                    }}
                  />
                )}

                {/* Played fill in accent gradient */}
                <div
                  className="video-seek-played"
                  style={{ width: `${playedPercent}%` }}
                />

                {/* A Marker */}
                {abLoop.a !== null && totalDuration > 0 && (
                  <div
                    className="video-seek-marker marker-a"
                    style={{ left: `${(abLoop.a / totalDuration) * 100}%` }}
                    title="A loop point"
                  />
                )}

                {/* B Marker */}
                {abLoop.b !== null && totalDuration > 0 && (
                  <div
                    className="video-seek-marker marker-b"
                    style={{ left: `${(abLoop.b / totalDuration) * 100}%` }}
                    title="B loop point"
                  />
                )}

                {/* Knob */}
                <div
                  className="video-seek-knob"
                  style={{ left: `${playedPercent}%` }}
                />
              </div>

              {/* Total Duration - Click to toggle between total and countdown remaining */}
              <span
                className={`video-time-text ${totalDuration > 0 ? 'adjustable' : ''}`}
                onClick={() => setShowRemaining(!showRemaining)}
                title={totalDuration > 0 ? (showRemaining ? 'Showing remaining time (click for total)' : 'Click to show remaining time') : undefined}
              >
                {showRemaining && totalDuration > 0
                  ? `-${formatTime(Math.max(0, totalDuration - currentDisplayTime))}`
                  : formatTime(totalDuration)}
              </span>
            </div>

            {/* Bottom row: Controls Left & Right */}
            <div className="video-controls-row">
              {/* Left group */}
              <div className="video-controls-left">
                <button
                  type="button"
                  onClick={() => handleSeek(0)}
                  className="video-icon-btn"
                  title="Restart (0)"
                  aria-label="Restart"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={togglePlay}
                  className="video-play-btn"
                  title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <Pause className="w-5 h-5 text-white" fill="currentColor" />
                  ) : (
                    <Play className="w-5 h-5 ml-0.5 text-white" fill="currentColor" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => handleSeek(currentTime + 10)}
                  className="video-icon-btn"
                  title="Forward 10s"
                  aria-label="Forward 10s"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={toggleMute}
                  className="video-icon-btn"
                  title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>

                <div className="video-volume-slider-wrap">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={isMuted ? 0 : volume}
                    onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
                    className="video-volume-slider"
                    aria-label="Volume"
                  />
                </div>
              </div>

              {/* Right group */}
              <div className="video-controls-right">
                {/* Speed Menu */}
                <div className="relative" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                    className="video-text-btn"
                    aria-label="Playback speed"
                    title="Playback Speed"
                  >
                    <span>{speed}</span>
                    <span className="text-[10px] ml-0.5">^</span>
                  </button>

                  {showSpeedMenu && (
                    <div className="video-speed-dropdown">
                      {['0.5x', '0.75x', '1x', '1.25x', '1.5x', '2x'].map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleSpeedSelect(s)}
                          className={`video-speed-item ${speed === s ? 'active' : ''}`}
                        >
                          <span>{s}</span>
                          {speed === s && <Check className="w-3 h-3 text-orange-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Audio track info button */}
                <button
                  type="button"
                  className="video-icon-btn"
                  title={`Audio track: ${audioDisplay}`}
                  aria-label="Audio track"
                >
                  <Headphones className="w-4 h-4" />
                </button>

                {/* Subtitles button */}
                <button
                  type="button"
                  className="video-icon-btn"
                  title="Subtitles"
                  aria-label="Subtitles"
                >
                  <Subtitles className="w-4 h-4" />
                </button>

                {/* A-B loop */}
                <button
                  type="button"
                  onClick={() => {
                    if (abLoop.a === null) setAbLoop({ a: currentTime, b: null });
                    else if (abLoop.b === null) setAbLoop({ ...abLoop, b: currentTime });
                    else setAbLoop({ a: null, b: null });
                  }}
                  className={`video-chip-btn ${abLoop.a !== null ? 'active' : ''}`}
                  title={abLoop.a === null ? 'Set A point' : abLoop.b === null ? 'Set B point' : 'Clear A-B loop'}
                  aria-label="A-B Loop"
                >
                  A-B
                </button>

                {/* Frame step back */}
                <button
                  type="button"
                  onClick={() => handleSeek(currentTime - 0.04)}
                  className="video-icon-btn"
                  title="Step frame back (,)"
                  aria-label="Step frame back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Frame step forward */}
                <button
                  type="button"
                  onClick={() => handleSeek(currentTime + 0.04)}
                  className="video-icon-btn"
                  title="Step frame forward (.)"
                  aria-label="Step frame forward"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Picture in picture */}
                <button
                  type="button"
                  onClick={handlePiP}
                  className="video-icon-btn"
                  title="Picture in Picture"
                  aria-label="Picture in Picture"
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>

                {/* Fullscreen */}
                <button
                  type="button"
                  onClick={handleFullscreen}
                  className="video-icon-btn"
                  title="Fullscreen (F)"
                  aria-label="Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Right Side Panel: Media Info + Video Queue */}
      <div className="video-right-panel">
        {/* Card A: Media Info */}
        <div className="video-glass-card media-info-card">
          <div className="media-info-header">
            <span className="media-info-title">Media info</span>
            <Info className="w-4 h-4 text-orange-950/60" />
          </div>

          <div className="media-info-rows">
            <div className="media-info-row">
              <span className="media-label">Resolution</span>
              <span className="media-val">{resolutionDisplay}</span>
            </div>
            <div className="media-info-row">
              <span className="media-label">Codec</span>
              <span className="media-val">{codecDisplay}</span>
            </div>
            <div className="media-info-row">
              <span className="media-label">Frame rate</span>
              <span className="media-val">{fpsDisplay}</span>
            </div>
            <div className="media-info-row">
              <span className="media-label">Bitrate</span>
              <span className="media-val">{bitrateDisplay}</span>
            </div>
            <div className="media-info-row">
              <span className="media-label">Audio</span>
              <span className="media-val">{audioDisplay}</span>
            </div>
            <div className="media-info-row">
              <span className="media-label">Container</span>
              <span className="media-val">{containerDisplay}</span>
            </div>
          </div>

          {/* Playback Mode Strip */}
          <div className="playback-mode-section">
            <div className="playback-mode-label">Playback mode</div>
            <div className="playback-mode-pills">
              <button
                type="button"
                onClick={() => setPlaybackMode('direct')}
                className={`playback-mode-pill ${playbackMode === 'direct' ? 'active' : ''}`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setPlaybackMode('remuxed')}
                className={`playback-mode-pill ${playbackMode === 'remuxed' ? 'active' : ''}`}
              >
                Remuxed
              </button>
              <button
                type="button"
                onClick={() => setPlaybackMode('transcoded')}
                className={`playback-mode-pill ${playbackMode === 'transcoded' ? 'active' : ''}`}
              >
                Transcoded
              </button>
            </div>
            <div className="playback-mode-desc">
              {playbackMode === 'direct' && 'Direct: native hardware acceleration, zero transcoding overhead.'}
              {playbackMode === 'remuxed' && 'Remuxed: container repackaged on the fly with no quality loss.'}
              {playbackMode === 'transcoded' && 'Transcoded: converted on the fly, uses GPU/CPU acceleration.'}
            </div>
          </div>
        </div>

        {/* Card B: Real Video Queue */}
        <div className="video-glass-card video-queue-card">
          <div className="video-queue-header">
            <span className="video-queue-title">Video queue</span>
            <span className="video-queue-count">{videos.length} videos</span>
          </div>

          <div className="video-queue-list">
            {videos.length === 0 ? (
              <div
                style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: 'var(--theme-text-sub)',
                }}
              >
                No videos in library yet.
              </div>
            ) : (
              videos.map((item, idx) => {
                const isActive = activeVideo?.id === item.id;
                const durStr = formatTime(item.duration);
                const metaStr = item.width ? `${item.width}×${item.height}` : 'Video';

                return (
                  <div
                    key={item.id}
                    onClick={() => setActiveVideo(item)}
                    className={`video-queue-row ${isActive ? 'active' : ''}`}
                  >
                    <div
                      className="video-queue-thumb"
                      style={{
                        width: '52px',
                        height: '36px',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        flexShrink: 0,
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: CITRUS_GRADIENTS[idx % CITRUS_GRADIENTS.length],
                        boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                      }}
                    >
                      {item.thumbnail ? (
                        <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-white fill-current ml-0.5" />
                      )}
                    </div>
                    <div className="video-queue-info">
                      <span className="video-queue-row-title" title={item.title}>{item.title}</span>
                      <span className="video-queue-row-meta">{metaStr}</span>
                    </div>
                    <span className="video-queue-duration">{durStr}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
