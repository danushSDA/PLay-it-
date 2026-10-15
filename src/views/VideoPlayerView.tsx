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
  Sparkles,
  PanelRight,
  Scan,
  X,
} from 'lucide-react';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';
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
  const ambientMenuRef = useRef<HTMLDivElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);

  const { ambientLight: storedAmbient, setAmbientLight } = useSettingsStore();
  const ambientSettings = storedAmbient || {
    enabled: true,
    preset: 'cinematic',
    blur: 64,
    opacity: 0.85,
    dynamicSampling: true,
    wideMediumScreen: true,
    saturation: 1.6,
  };
  const [showAmbientMenu, setShowAmbientMenu] = useState(false);
  const [ambientGradient, setAmbientGradient] = useState<string>(
    'radial-gradient(circle at 50% 45%, rgba(56, 217, 255, 0.45) 0%, rgba(65, 90, 119, 0.35) 50%, rgba(13, 27, 42, 0.95) 100%)'
  );

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
  const [showSidePanel, setShowSidePanel] = useState(false);
  const [fitMode, setFitMode] = useState<'contain' | 'cover' | 'fill'>('contain');
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const resetHideTimer = () => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => {
        if (!showAmbientMenu && !showSpeedMenu && !showSidePanel && !isSeeking) {
          setControlsVisible(false);
        }
      }, 3500);
    }
  };

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isPlaying, showAmbientMenu, showSpeedMenu, showSidePanel]);

  const cycleFitMode = () => {
    setFitMode((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

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

  // Handle outside click for speed menu and ambient menu
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setShowSpeedMenu(false);
      }
      if (ambientMenuRef.current && !ambientMenuRef.current.contains(e.target as Node)) {
        // Only close if not clicking ambient button
        const target = e.target as HTMLElement;
        if (!target.closest?.('.video-icon-btn.ambient-btn')) {
          setShowAmbientMenu(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Real-time video frame color sampling for ambient light
  useEffect(() => {
    if (!ambientSettings.enabled) return;

    if (ambientSettings.preset === 'deepsea') {
      setAmbientGradient(
        'radial-gradient(circle at 50% 40%, rgba(56, 217, 255, 0.5) 0%, rgba(27, 38, 59, 0.75) 45%, rgba(13, 27, 42, 0.98) 100%)'
      );
      return;
    }

    if (ambientSettings.preset === 'aurora') {
      setAmbientGradient(
        'radial-gradient(circle at 40% 40%, rgba(56, 217, 255, 0.52) 0%, rgba(168, 85, 247, 0.42) 40%, rgba(13, 27, 42, 0.96) 100%)'
      );
      return;
    }

    if (ambientSettings.preset === 'sunset') {
      setAmbientGradient(
        'radial-gradient(circle at 50% 45%, rgba(255, 154, 31, 0.5) 0%, rgba(255, 94, 98, 0.4) 45%, rgba(20, 10, 15, 0.96) 100%)'
      );
      return;
    }

    // Cinematic live video color sampling
    if (!ambientSettings.dynamicSampling || !isPlaying || !videoRef.current) {
      return;
    }

    let isMounted = true;
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 9;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const sampleInterval = setInterval(() => {
      if (!isMounted || !videoRef.current || videoRef.current.paused || videoRef.current.ended) return;
      try {
        ctx?.drawImage(videoRef.current, 0, 0, 16, 9);
        const imgData = ctx?.getImageData(0, 0, 16, 9).data;
        if (!imgData) return;

        let rTop = 0, gTop = 0, bTop = 0;
        let rBot = 0, gBot = 0, bBot = 0;
        let rMid = 0, gMid = 0, bMid = 0;

        for (let x = 0; x < 16; x++) {
          const topIdx = x * 4;
          rTop += imgData[topIdx];
          gTop += imgData[topIdx + 1];
          bTop += imgData[topIdx + 2];

          const botIdx = (8 * 16 + x) * 4;
          rBot += imgData[botIdx];
          gBot += imgData[botIdx + 1];
          bBot += imgData[botIdx + 2];

          const midIdx = (4 * 16 + x) * 4;
          rMid += imgData[midIdx];
          gMid += imgData[midIdx + 1];
          bMid += imgData[midIdx + 2];
        }

        const boost = ambientSettings.saturation || 1.4;
        const cap = (val: number) => Math.min(255, Math.round((val / 16) * boost));

        const topCol = `rgb(${cap(rTop)}, ${cap(gTop)}, ${cap(bTop)})`;
        const botCol = `rgb(${cap(rBot)}, ${cap(gBot)}, ${cap(bBot)})`;
        const midCol = `rgb(${cap(rMid)}, ${cap(gMid)}, ${cap(bMid)})`;

        const grad = `radial-gradient(circle at 50% 35%, ${midCol} 0%, ${topCol} 45%, ${botCol} 85%, rgba(13, 27, 42, 0.96) 100%)`;
        setAmbientGradient(grad);
      } catch (_) {}
    }, 100);

    return () => {
      isMounted = false;
      clearInterval(sampleInterval);
    };
  }, [ambientSettings, isPlaying]);

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

  const handleFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else if (containerRef.current) {
        await containerRef.current.requestFullscreen();
      }
    } catch (_) {
      window.glassAPI?.toggleMaximize?.();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        handleFullscreen();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        cycleFitMode();
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowSidePanel((prev) => !prev);
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleSeek(currentTime + 5);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleSeek(currentTime - 5);
      } else if (e.key === 'Escape') {
        if (showSidePanel) setShowSidePanel(false);
        if (showAmbientMenu) setShowAmbientMenu(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, totalDuration, showSidePanel, showAmbientMenu, isMuted]);

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
      {/* 1. Main Video Stage with Medium Screen Ambient Light Halo */}
      <div className="video-ambient-wrapper">
        {/* Dynamic Medium Screen Ambient Light Halo */}
        {ambientSettings.enabled && (
          <div
            className={`video-ambient-outer-halo ${ambientSettings.wideMediumScreen ? 'wide-active' : ''}`}
            style={{
              background: ambientGradient,
              opacity: ambientSettings.opacity,
              filter: `blur(${ambientSettings.blur}px)`,
            }}
          />
        )}

        <div className="video-stage-container">
          <div
            className={`video-stage-canvas ${!controlsVisible && isPlaying ? 'idle-cursor' : ''}`}
            onMouseMove={resetHideTimer}
            onClick={resetHideTimer}
          >
            {/* Ambient Video Glow Background (inside canvas) */}
            <div
              className="video-stage-bg-gradient"
              style={ambientSettings.enabled ? { background: ambientGradient, opacity: ambientSettings.opacity } : undefined}
            />

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
              onDoubleClick={handleFullscreen}
              playsInline
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: fitMode,
                zIndex: 1,
                cursor: !controlsVisible && isPlaying ? 'none' : 'pointer',
                transition: 'object-fit 0.2s ease',
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
            <div className={`video-stage-chips-top ${!controlsVisible && isPlaying ? 'video-controls-hidden' : ''}`}>
              <span className="video-chip">
                {probeData?.video?.resolutionLabel || resolutionDisplay}
              </span>
              <span className="video-chip">{speed}</span>
              <button
                type="button"
                onClick={cycleFitMode}
                className={`video-chip fit-chip ${fitMode === 'cover' ? 'active' : ''}`}
                title="Aspect Fit Mode: Fit (Contain) / Cover Screen / Stretch"
              >
                {fitMode === 'cover' ? 'Cover Screen' : fitMode === 'fill' ? 'Stretch' : 'Fit'}
              </button>
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
          <div className={`video-controls-overlay ${!controlsVisible && isPlaying ? 'video-controls-hidden' : ''}`}>
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

                {/* Ambient Light Customizations button */}
                <button
                  type="button"
                  onClick={() => setShowAmbientMenu(!showAmbientMenu)}
                  className={`video-icon-btn ambient-btn ${ambientSettings.enabled && showAmbientMenu ? 'ambient-active' : ''}`}
                  title="Ambient Light Customizations"
                  aria-label="Ambient Light Settings"
                >
                  <Sparkles className="w-4 h-4 text-cyan-300" />
                </button>

                {/* Fit / Cover Screen mode */}
                <button
                  type="button"
                  onClick={cycleFitMode}
                  className={`video-icon-btn ${fitMode === 'cover' ? 'ambient-active' : ''}`}
                  title={
                    fitMode === 'cover'
                      ? 'Screen: Cover Whole (Click for Stretch)'
                      : fitMode === 'fill'
                      ? 'Screen: Stretch (Click for Fit)'
                      : 'Screen: Fit / Letterbox (Click to Cover Whole Screen)'
                  }
                  aria-label="Toggle Screen Fit / Cover"
                >
                  <Scan className="w-4 h-4" />
                </button>

                {/* Media Info & Queue Drawer Toggle */}
                <button
                  type="button"
                  onClick={() => setShowSidePanel(!showSidePanel)}
                  className={`video-icon-btn ${showSidePanel ? 'ambient-active' : ''}`}
                  title={showSidePanel ? 'Hide Media Info & Queue (I)' : 'Show Media Info & Queue (I)'}
                  aria-label="Toggle Side Drawer"
                >
                  <PanelRight className="w-4 h-4" />
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

          {/* Ambient Light Customization Popover */}
          {showAmbientMenu && (
            <div className="video-ambient-popover" ref={ambientMenuRef}>
              <div className="ambient-popover-header">
                <div className="ambient-popover-title">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Ambient Light</span>
                </div>
                <span className="ambient-popover-badge">Medium Screen Ready</span>
              </div>

              {/* Master Toggle */}
              <div className="ambient-popover-row">
                <div>
                  <div className="ambient-popover-label">Ambient Glow</div>
                  <div className="ambient-popover-sub">Project dynamic atmospheric aura</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAmbientLight({ enabled: !ambientSettings.enabled })}
                  className={`liquid-glass-switch ${ambientSettings.enabled ? 'on' : 'off'}`}
                  aria-label="Toggle ambient glow"
                >
                  <div className="liquid-glass-switch-knob" />
                </button>
              </div>

              {/* Presets */}
              <div className="ambient-preset-grid">
                {[
                  { id: 'cinematic', label: '🎬 Cinematic' },
                  { id: 'deepsea', label: '🌊 Deep Sea' },
                  { id: 'aurora', label: '✨ Aurora' },
                  { id: 'sunset', label: '🌅 Sunset' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setAmbientLight({ preset: p.id as any })}
                    className={`ambient-preset-btn ${ambientSettings.preset === p.id ? 'active' : ''}`}
                  >
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>

              {/* Blur Spread Slider */}
              <div className="ambient-slider-row">
                <div className="ambient-slider-head">
                  <span>Glow Dispersion</span>
                  <span style={{ color: '#38d9ff', fontSize: '11px', fontFamily: 'monospace' }}>
                    {ambientSettings.blur}px
                  </span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={120}
                  value={ambientSettings.blur}
                  onChange={(e) => setAmbientLight({ blur: parseInt(e.target.value) })}
                  className="ambient-slider"
                />
              </div>

              {/* Opacity Slider */}
              <div className="ambient-slider-row">
                <div className="ambient-slider-head">
                  <span>Glow Opacity</span>
                  <span style={{ color: '#38d9ff', fontSize: '11px', fontFamily: 'monospace' }}>
                    {Math.round(ambientSettings.opacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={Math.round(ambientSettings.opacity * 100)}
                  onChange={(e) => setAmbientLight({ opacity: parseInt(e.target.value) / 100 })}
                  className="ambient-slider"
                />
              </div>

              {/* Medium Screen Dispersion toggle */}
              <div className="ambient-popover-row">
                <div>
                  <div className="ambient-popover-label">Medium Screen Wide Aura</div>
                  <div className="ambient-popover-sub">Expand halo in windowed view</div>
                </div>
                <button
                  type="button"
                  onClick={() => setAmbientLight({ wideMediumScreen: !ambientSettings.wideMediumScreen })}
                  className={`liquid-glass-switch ${ambientSettings.wideMediumScreen ? 'on' : 'off'}`}
                  aria-label="Toggle medium screen wide aura"
                >
                  <div className="liquid-glass-switch-knob" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

      {/* 2. Floating Liquid Glass Drawer: Media Info + Video Queue */}
      {showSidePanel && (
        <div className="video-right-panel drawer">
          <div className="video-drawer-top">
            <span className="video-drawer-title">Media Details & Queue</span>
            <button
              type="button"
              onClick={() => setShowSidePanel(false)}
              className="video-drawer-close-btn"
              title="Close Panel (Esc)"
              aria-label="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

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
      )}
    </div>
  );
};
