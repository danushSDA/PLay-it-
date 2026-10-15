import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  Play,
  Pause,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  PictureInPicture,
  RotateCcw,
  X,
  AlertTriangle,
  Info,
  Subtitles,
  AudioLines,
  Repeat,
  ChevronRight,
  ChevronLeft,
  Settings as SettingsIcon,
  Sliders,
  Check,
  FilePlus,
  Zap,
} from 'lucide-react';
import { Video, MediaProbeResult, AudioTrackInfo, SubtitleTrackInfo, SubtitleSettings } from '../types';
import { useLibraryStore } from '../store/useLibraryStore';

interface VideoPlayerModalProps {
  video: Video;
  onClose: () => void;
}

export const VideoPlayerModal: React.FC<VideoPlayerModalProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(0.9);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number>(0);
  const [isPreparing, setIsPreparing] = useState(true);
  const [preparingMessage, setPreparingMessage] = useState('Analyzing media streams with FFmpeg...');

  // 3-Tier Pipeline & Media info
  const [mediaProbe, setMediaProbe] = useState<MediaProbeResult | null>(null);
  const [activeTier, setActiveTier] = useState<'direct' | 'remux' | 'transcode'>('direct');
  const [streamUrl, setStreamUrl] = useState<string>('');
  const [activeAudioTrackIndex, setActiveAudioTrackIndex] = useState<number>(0);

  // Subtitles
  const [activeSubtitleIndex, setActiveSubtitleIndex] = useState<number>(-1); // -1 = off
  const [subtitleTrackUrl, setSubtitleTrackUrl] = useState<string | null>(null);
  const [subtitleCues, setSubtitleCues] = useState<{ start: number; end: number; text: string }[]>([]);
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [subtitleSettings, setSubtitleSettings] = useState<SubtitleSettings>({
    size: 'medium',
    color: 'yellow',
    background: 'shadow',
    delay: 0,
  });

  // A-B Loop
  const [loopPointA, setLoopPointA] = useState<number | null>(null);
  const [loopPointB, setLoopPointB] = useState<number | null>(null);
  const [isLoopActive, setIsLoopActive] = useState(false);

  // Panels & Popups
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showAudioMenu, setShowAudioMenu] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [showSubSettings, setShowSubSettings] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [showResumeNotice, setShowResumeNotice] = useState(false);
  const [gpuStatus, setGpuStatus] = useState<any>(null);

  // Errors
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // 1. Initialize 3-Tier Pipeline
  useEffect(() => {
    let isCancelled = false;

    const initPlayback = async () => {
      setIsPreparing(true);
      setHasError(false);
      setPreparingMessage('Analyzing media container & codecs...');

      try {
        // Query GPU hardware decoding status
        if (window.glassAPI?.getGpuStatus) {
          window.glassAPI.getGpuStatus().then((s) => !isCancelled && setGpuStatus(s));
        }

        const session = await window.glassAPI?.prepareVideoPlayback(video.file_path, activeAudioTrackIndex);

        if (isCancelled) return;

        if (session?.error) {
          setHasError(true);
          setErrorMessage(session.message || 'Cannot play this video file.');
          setIsPreparing(false);
          return;
        }

        if (session) {
          setMediaProbe(session.probe);
          setActiveTier(session.tier);
          setStreamUrl(session.streamUrl);
          setIsPreparing(false);

          // Handle Resume prompt if last_position > 5
          if (video.last_position > 5 && (!video.duration || video.last_position < video.duration - 5)) {
            setShowResumeNotice(true);
          }
        } else {
          // Fallback to direct stream
          const directUrl = window.glassAPI?.getMediaStreamUrl(video.file_path) || video.file_path;
          setStreamUrl(directUrl);
          setIsPreparing(false);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('[VideoPlayer] Initialization error:', err);
          setHasError(true);
          setErrorMessage('Failed to initialize playback engine: ' + err.message);
          setIsPreparing(false);
        }
      }
    };

    initPlayback();

    return () => {
      isCancelled = true;
    };
  }, [video.file_path, activeAudioTrackIndex]);

  // 2. Video element setup & synchronization
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !streamUrl) return;

    v.volume = isMuted ? 0 : volume;
    v.playbackRate = playbackRate;

    const onLoadedMetadata = () => {
      setDuration(v.duration || video.duration || 0);

      // Auto resume if position was valid and notice active
      if (video.last_position > 5 && video.last_position < v.duration - 5) {
        v.currentTime = video.last_position;
        setCurrentTime(video.last_position);
      }
    };

    const onTimeUpdate = () => {
      const now = v.currentTime;
      setCurrentTime(now);

      // A-B Loop checking
      if (isLoopActive && loopPointA !== null && loopPointB !== null) {
        if (now >= loopPointB || now < loopPointA) {
          v.currentTime = loopPointA;
        }
      }

      // Live Subtitle matching
      if (subtitleCues.length > 0) {
        const adjustedNow = now - subtitleSettings.delay;
        const matching = subtitleCues.find((c) => adjustedNow >= c.start && adjustedNow <= c.end);
        setCurrentSubtitleText(matching ? matching.text : '');
      } else {
        setCurrentSubtitleText('');
      }

      // Periodically update last_position in SQLite
      if (Math.floor(now) % 4 === 0) {
        window.glassAPI?.updateVideoPosition(video.id, now);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onError = () => {
      if (!isPreparing) {
        setHasError(true);
        setErrorMessage(
          'Video decoder encountered a stream playback error. This file may have corrupted packets or an unsupported profile.'
        );
      }
    };

    v.addEventListener('loadedmetadata', onLoadedMetadata);
    v.addEventListener('timeupdate', onTimeUpdate);
    v.addEventListener('play', onPlay);
    v.addEventListener('pause', onPause);
    v.addEventListener('error', onError);

    v.play().catch(() => {});

    return () => {
      if (v) {
        window.glassAPI?.updateVideoPosition(video.id, v.currentTime);
        v.pause();
        v.removeEventListener('loadedmetadata', onLoadedMetadata);
        v.removeEventListener('timeupdate', onTimeUpdate);
        v.removeEventListener('play', onPlay);
        v.removeEventListener('pause', onPause);
        v.removeEventListener('error', onError);
      }
    };
  }, [streamUrl, isLoopActive, loopPointA, loopPointB, subtitleCues, subtitleSettings.delay]);

  // 3. Subtitle track loader & parser (.vtt)
  useEffect(() => {
    if (activeSubtitleIndex === -1 || !mediaProbe) {
      setSubtitleTrackUrl(null);
      setSubtitleCues([]);
      setCurrentSubtitleText('');
      return;
    }

    const subTrack = mediaProbe.subtitleTracks[activeSubtitleIndex];
    if (!subTrack) return;

    const loadSub = async () => {
      let vttUrl: string | null = null;
      if (subTrack.isExternal && subTrack.filePath) {
        vttUrl = await window.glassAPI?.convertExternalSub(subTrack.filePath);
      } else if (!subTrack.isExternal && subTrack.streamIndex !== undefined) {
        vttUrl = await window.glassAPI?.extractSubtitles(video.file_path, subTrack.streamIndex);
      }

      if (vttUrl) {
        setSubtitleTrackUrl(vttUrl);
        // Fetch and parse VTT cues for custom styled glass rendering
        try {
          const resp = await fetch(vttUrl);
          const vttContent = await resp.text();
          const parsed = parseVttToCues(vttContent);
          setSubtitleCues(parsed);
        } catch (e) {
          console.warn('[VideoPlayer] Error parsing VTT cues:', e);
        }
      }
    };

    loadSub();
  }, [activeSubtitleIndex, mediaProbe, video.file_path]);

  // Parse WebVTT text into cue array
  const parseVttToCues = (text: string) => {
    const cues: { start: number; end: number; text: string }[] = [];
    const lines = text.split(/\r?\n/);
    const timeRegex = /(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})\s+-->\s+(?:(\d{2}):)?(\d{2}):(\d{2})\.(\d{3})/;

    let currentStart = 0;
    let currentEnd = 0;
    let buffer: string[] = [];

    const toSeconds = (h = '0', m: string, s: string, ms: string) => {
      return parseInt(h || '0', 10) * 3600 + parseInt(m, 10) * 60 + parseInt(s, 10) + parseInt(ms, 10) / 1000;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const match = line.match(timeRegex);
      if (match) {
        if (buffer.length > 0) {
          cues.push({ start: currentStart, end: currentEnd, text: buffer.join('\n') });
          buffer = [];
        }
        currentStart = toSeconds(match[1], match[2], match[3], match[4]);
        currentEnd = toSeconds(match[5], match[6], match[7], match[8]);
      } else if (line && !line.startsWith('WEBVTT') && !line.startsWith('NOTE')) {
        buffer.push(line);
      } else if (!line && buffer.length > 0) {
        cues.push({ start: currentStart, end: currentEnd, text: buffer.join('\n') });
        buffer = [];
      }
    }
    if (buffer.length > 0) {
      cues.push({ start: currentStart, end: currentEnd, text: buffer.join('\n') });
    }
    return cues;
  };

  // 4. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if an input is focused
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const v = videoRef.current;
      if (!v) return;

      if (e.key === ' ' || e.code === 'Space' || e.key === 'k' || e.key === 'K') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        seek(Math.max(0, v.currentTime - 5));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        seek(Math.min(v.duration, v.currentTime + 5));
      } else if (e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        seek(Math.max(0, v.currentTime - 10));
      } else if (e.key === 'l' || e.key === 'L') {
        e.preventDefault();
        seek(Math.min(v.duration, v.currentTime + 10));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleVolumeChange(Math.min(1, volume + 0.05));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleVolumeChange(Math.max(0, volume - 0.05));
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault();
        toggleMute();
      } else if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePiP();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        // Toggle subtitles
        setActiveSubtitleIndex((prev) => (prev === -1 ? 0 : -1));
      } else if (e.key === '[') {
        e.preventDefault();
        changeSpeed(-0.25);
      } else if (e.key === ']') {
        e.preventDefault();
        changeSpeed(0.25);
      } else if (e.key === ',' || e.key === '<') {
        e.preventDefault();
        stepFrame(-1);
      } else if (e.key === '.' || e.key === '>') {
        e.preventDefault();
        stepFrame(1);
      } else if (e.key === 'i' || e.key === 'I') {
        e.preventDefault();
        setShowInfoModal((prev) => !prev);
      } else if (e.key === 'Escape') {
        if (showInfoModal) setShowInfoModal(false);
        else if (showSubSettings) setShowSubSettings(false);
        else if (document.fullscreenElement) document.exitFullscreen();
        else onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isPlaying, showInfoModal, showSubSettings, onClose]);

  // 5. Controls idle auto-hide
  useEffect(() => {
    let timeout: any;
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying && !showAudioMenu && !showSubMenu && !showSubSettings && !showSpeedMenu && !showInfoModal) {
          setShowControls(false);
        }
      }, 3500);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying, showAudioMenu, showSubMenu, showSubSettings, showSpeedMenu, showInfoModal]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(console.error);
    else v.pause();
  };

  const seek = (seconds: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = seconds;
      setCurrentTime(seconds);
    }
  };

  const stepFrame = (frames: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    const fps = mediaProbe?.video?.fps || 30;
    const delta = frames * (1 / fps);
    seek(Math.max(0, Math.min(v.duration, v.currentTime + delta)));
  };

  const handleVolumeChange = (val: number) => {
    const v = videoRef.current;
    setVolume(val);
    if (v) {
      v.volume = val;
      v.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const changeSpeed = (delta: number) => {
    const speeds = [0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];
    const currIdx = speeds.indexOf(playbackRate);
    const targetIdx = Math.max(0, Math.min(speeds.length - 1, currIdx + (delta > 0 ? 1 : -1)));
    const newSpeed = speeds[targetIdx];
    setPlaybackRate(newSpeed);
    if (videoRef.current) videoRef.current.playbackRate = newSpeed;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  const togglePiP = async () => {
    const v = videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await v.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('[PiP] Error:', e);
    }
  };

  // A-B Loop Controls
  const setPointA = () => {
    setLoopPointA(currentTime);
    setIsLoopActive(true);
  };

  const setPointB = () => {
    if (loopPointA !== null && currentTime > loopPointA) {
      setLoopPointB(currentTime);
      setIsLoopActive(true);
    } else {
      setLoopPointB(currentTime);
      setLoopPointA(Math.max(0, currentTime - 5));
      setIsLoopActive(true);
    }
  };

  const clearLoop = () => {
    setLoopPointA(null);
    setLoopPointB(null);
    setIsLoopActive(false);
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Subtitle styling generator
  const subtitleStyle = useMemo(() => {
    const sizeMap = {
      small: '18px',
      medium: '24px',
      large: '32px',
      xlarge: '42px',
    };
    const colorMap = {
      white: '#ffffff',
      yellow: '#fef08a',
      cyan: '#67e8f9',
      green: '#86efac',
    };

    const style: React.CSSProperties = {
      fontSize: sizeMap[subtitleSettings.size],
      color: colorMap[subtitleSettings.color],
      fontFamily: "'Outfit', 'Segoe UI Variable Display', sans-serif",
      fontWeight: 600,
      textAlign: 'center',
      lineHeight: 1.3,
      pointerEvents: 'none',
      userSelect: 'none',
    };

    if (subtitleSettings.background === 'shadow') {
      style.textShadow = '0 2px 4px rgba(0,0,0,0.9), 0 0 10px rgba(0,0,0,0.7)';
    } else if (subtitleSettings.background === 'glow') {
      style.textShadow = '0 0 16px rgba(0,0,0,0.95), 0 0 6px #000000';
    } else if (subtitleSettings.background === 'box') {
      style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
      style.padding = '6px 14px';
      style.borderRadius = '8px';
      style.backdropFilter = 'blur(8px)';
    }

    return style;
  }, [subtitleSettings]);

  // Info Badge text
  const infoBadge = useMemo(() => {
    if (!mediaProbe?.video) return null;
    const v = mediaProbe.video;
    const parts = [v.resolutionLabel];
    if (v.codec) parts.push(v.codec.toUpperCase());
    if (v.isHdr) parts.push('HDR10');
    if (v.fps >= 50) parts.push(`${Math.round(v.fps)}fps`);
    if (activeTier === 'direct') parts.push('Direct Play');
    else if (activeTier === 'remux') parts.push('Remuxed');
    else parts.push('Transcoded');
    return parts.join(' • ');
  }, [mediaProbe, activeTier]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 select-none overflow-hidden"
    >
      {/* Video Stream Element */}
      {streamUrl && (
        <video
          ref={videoRef}
          src={streamUrl}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
        />
      )}

      {/* Preparing / Transcoding Loader Shimmer */}
      {isPreparing && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 backdrop-blur-md z-40">
          <div className="w-14 h-14 rounded-full border-3 border-white/20 border-t-amber-500 animate-spin flex items-center justify-center">
            <Zap className="w-6 h-6 text-amber-400" />
          </div>
          <div className="text-center">
            <h3 className="text-base font-semibold text-white">Starting Video Pipeline</h3>
            <p className="text-xs text-amber-300/90 mt-1 max-w-sm">{preparingMessage}</p>
          </div>
        </div>
      )}

      {/* Friendly Error State Modal */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/90 backdrop-blur-lg z-50 text-center">
          <div className="glass-panel p-8 max-w-md flex flex-col items-center gap-4 border border-rose-500/30 shadow-2xl">
            <div className="p-3.5 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-semibold text-white">Playback Interrupted</h3>
            <p className="text-xs text-rose-200/80 leading-relaxed">{errorMessage}</p>
            <div className="flex items-center gap-3 mt-2">
              <button onClick={onClose} className="glass-btn glass-btn-accent px-5 py-2 text-xs">
                Back to Library
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtitles Overlay */}
      {currentSubtitleText && !hasError && (
        <div className="absolute bottom-24 left-8 right-8 flex justify-center pointer-events-none z-30">
          <div style={subtitleStyle}>{currentSubtitleText}</div>
        </div>
      )}

      {/* Resume from where you stopped Toast */}
      {showResumeNotice && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 glass-panel px-4 py-2.5 flex items-center gap-3 z-40 border border-amber-400/30 shadow-xl animate-fade-in">
          <span className="text-xs text-amber-200">
            Resumed from {formatTime(video.last_position)}
          </span>
          <button
            onClick={() => {
              seek(0);
              setShowResumeNotice(false);
            }}
            className="text-[11px] font-semibold text-white px-2 py-0.5 rounded bg-white/20 hover:bg-white/30 transition-colors"
          >
            Start over
          </button>
          <button onClick={() => setShowResumeNotice(false)} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Glass Bar (Title, Info Badge, Media Info button & Close) */}
      <div
        className={`absolute top-0 left-0 right-0 p-5 flex items-center justify-between bg-gradient-to-b from-black/85 via-black/40 to-transparent transition-opacity duration-300 z-30 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-sm font-semibold text-white truncate max-w-md">{video.title}</span>
          {infoBadge && (
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-sm">
              {infoBadge}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Media Info Inspector Button */}
          <button
            onClick={() => setShowInfoModal(true)}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Media Info & Pipeline Diagnostics (I)"
          >
            <Info className="w-4 h-4" />
          </button>

          {/* Close Player */}
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Floating Liquid Glass Cinema Controls */}
      <div
        className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-4xl glass-panel p-4 flex flex-col gap-2.5 shadow-2xl transition-all duration-300 z-30 ${
          showControls ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'
        }`}
      >
        {/* Timeline Seek Bar with Hover Preview & A-B Loop Markers */}
        <div className="relative w-full flex items-center group">
          {/* Hover Time Preview Badge */}
          {hoverTime !== null && (
            <div
              style={{ left: `${hoverX}px`, fontVariantNumeric: 'tabular-nums' }}
              className="absolute -top-8 -translate-x-1/2 px-2 py-0.5 rounded bg-black/90 text-[11px] font-medium text-amber-300 pointer-events-none border border-white/20 shadow-lg"
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* A-B Loop visual marker overlays on seek bar */}
          {duration > 0 && loopPointA !== null && (
            <div
              style={{ left: `${(loopPointA / duration) * 100}%` }}
              className="absolute top-0 bottom-0 w-1 bg-amber-400 z-10 pointer-events-none shadow"
              title={`Loop Point A: ${formatTime(loopPointA)}`}
            />
          )}
          {duration > 0 && loopPointB !== null && (
            <div
              style={{ left: `${(loopPointB / duration) * 100}%` }}
              className="absolute top-0 bottom-0 w-1 bg-rose-400 z-10 pointer-events-none shadow"
              title={`Loop Point B: ${formatTime(loopPointB)}`}
            />
          )}

          <input
            type="range"
            min="0"
            max={duration || 1}
            step="0.05"
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
              setHoverTime(pos * duration);
              setHoverX(e.clientX - rect.left);
            }}
            onMouseLeave={() => setHoverTime(null)}
            className="glass-slider w-full cursor-pointer"
          />
        </div>

        {/* Controls Row */}
        <div className="flex items-center justify-between text-white">
          {/* Left: Play/Pause, Frame Step, Timestamps, Volume */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={togglePlay}
              className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-500 to-rose-500 text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md"
              title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {/* Frame step buttons */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5">
              <button
                onClick={() => stepFrame(-1)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/15"
                title="Frame Backwards (,)"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => stepFrame(1)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/15"
                title="Frame Forwards (.)"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <span className="text-xs text-slate-300 ml-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {/* Volume Control */}
            <div className="flex items-center gap-1.5 ml-2">
              <button onClick={toggleMute} className="p-1 text-slate-300 hover:text-white" title="Mute (M)">
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="glass-slider w-16"
              />
            </div>
          </div>

          {/* Right: A-B Loop, Audio Track, Subtitles, Speed, PiP, Fullscreen */}
          <div className="flex items-center gap-2">
            {/* A-B Loop Controls */}
            <div className="flex items-center bg-white/10 rounded-lg p-0.5 text-xs text-slate-200">
              <button
                onClick={setPointA}
                className={`px-2 py-0.5 rounded font-medium ${loopPointA !== null ? 'bg-amber-500/40 text-amber-300' : 'hover:bg-white/15'}`}
                title="Set Loop Point A (A)"
              >
                A
              </button>
              <button
                onClick={setPointB}
                className={`px-2 py-0.5 rounded font-medium ${loopPointB !== null ? 'bg-rose-500/40 text-rose-300' : 'hover:bg-white/15'}`}
                title="Set Loop Point B (B)"
              >
                B
              </button>
              {isLoopActive && (
                <button
                  onClick={clearLoop}
                  className="px-1.5 py-0.5 text-[10px] text-slate-400 hover:text-white"
                  title="Clear Loop"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Audio Track Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAudioMenu(!showAudioMenu);
                  setShowSubMenu(false);
                  setShowSpeedMenu(false);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  showAudioMenu ? 'bg-white/25 text-white' : 'hover:bg-white/15 text-slate-300'
                }`}
                title="Audio Tracks"
              >
                <AudioLines className="w-4 h-4" />
              </button>

              {showAudioMenu && mediaProbe && (
                <div className="absolute bottom-10 right-0 glass-panel p-2 min-w-[200px] shadow-2xl flex flex-col gap-1 z-50">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 px-2 py-1">
                    Audio Tracks
                  </span>
                  {mediaProbe.audioTracks.map((track) => (
                    <button
                      key={track.id}
                      onClick={() => {
                        setActiveAudioTrackIndex(track.index);
                        setShowAudioMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left transition-colors ${
                        activeAudioTrackIndex === track.index
                          ? 'bg-amber-500/25 text-amber-300 font-semibold'
                          : 'hover:bg-white/10 text-slate-200'
                      }`}
                    >
                      <span>{track.title}</span>
                      <span className="text-[10px] text-slate-400 ml-2">
                        {track.codec.toUpperCase()} {track.channelLayout}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Subtitles Selector & Settings */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSubMenu(!showSubMenu);
                  setShowAudioMenu(false);
                  setShowSpeedMenu(false);
                }}
                className={`p-1.5 rounded-lg transition-colors ${
                  activeSubtitleIndex !== -1 ? 'bg-amber-500/25 text-amber-300' : 'hover:bg-white/15 text-slate-300'
                }`}
                title="Subtitles (C)"
              >
                <Subtitles className="w-4 h-4" />
              </button>

              {showSubMenu && mediaProbe && (
                <div className="absolute bottom-10 right-0 glass-panel p-2 min-w-[220px] shadow-2xl flex flex-col gap-1 z-50">
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                      Subtitles
                    </span>
                    <button
                      onClick={() => {
                        setShowSubSettings(true);
                        setShowSubMenu(false);
                      }}
                      className="text-[11px] text-amber-300 hover:underline flex items-center gap-1"
                    >
                      <Sliders className="w-3 h-3" />
                      <span>Style</span>
                    </button>
                  </div>

                  {/* Off option */}
                  <button
                    onClick={() => {
                      setActiveSubtitleIndex(-1);
                      setShowSubMenu(false);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left ${
                      activeSubtitleIndex === -1
                        ? 'bg-amber-500/25 text-amber-300 font-semibold'
                        : 'hover:bg-white/10 text-slate-200'
                    }`}
                  >
                    <span>Off</span>
                    {activeSubtitleIndex === -1 && <Check className="w-3.5 h-3.5" />}
                  </button>

                  {/* Subtitle tracks */}
                  {mediaProbe.subtitleTracks.map((sub, idx) => (
                    <button
                      key={sub.id}
                      onClick={() => {
                        setActiveSubtitleIndex(idx);
                        setShowSubMenu(false);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs text-left ${
                        activeSubtitleIndex === idx
                          ? 'bg-amber-500/25 text-amber-300 font-semibold'
                          : 'hover:bg-white/10 text-slate-200'
                      }`}
                    >
                      <span className="truncate max-w-[150px]">{sub.title}</span>
                      <span className="text-[10px] text-slate-400 uppercase">{sub.codec}</span>
                    </button>
                  ))}

                  {/* External file loader */}
                  <button
                    onClick={async () => {
                      const res = await window.glassAPI?.pickSubtitleFile();
                      if (res) {
                        setMediaProbe((prev) => {
                          if (!prev) return null;
                          const newTrack: SubtitleTrackInfo = {
                            id: 999,
                            index: prev.subtitleTracks.length,
                            streamIndex: -1,
                            codec: 'vtt',
                            language: 'external',
                            title: res.title,
                            isDefault: true,
                            isExternal: true,
                            filePath: res.filePath,
                          };
                          return { ...prev, subtitleTracks: [...prev.subtitleTracks, newTrack] };
                        });
                        setActiveSubtitleIndex(mediaProbe.subtitleTracks.length);
                        setShowSubMenu(false);
                      }
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 mt-1 rounded-md text-xs text-amber-300 hover:bg-white/10 border-t border-white/10"
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Load subtitle file...</span>
                  </button>
                </div>
              )}
            </div>

            {/* Playback Speed */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSpeedMenu(!showSpeedMenu);
                  setShowAudioMenu(false);
                  setShowSubMenu(false);
                }}
                className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-slate-200"
                style={{ fontVariantNumeric: 'tabular-nums' }}
                title="Playback Speed ([ and ])"
              >
                {playbackRate}x
              </button>

              {showSpeedMenu && (
                <div className="absolute bottom-10 right-0 glass-panel p-1.5 min-w-[90px] shadow-2xl flex flex-col gap-0.5 z-50">
                  {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setPlaybackRate(s);
                        if (videoRef.current) videoRef.current.playbackRate = s;
                        setShowSpeedMenu(false);
                      }}
                      className={`px-2 py-1 rounded text-xs text-left ${
                        playbackRate === s
                          ? 'bg-amber-500/25 text-amber-300 font-semibold'
                          : 'hover:bg-white/10 text-slate-200'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Picture in Picture */}
            <button
              onClick={togglePiP}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
              title="Picture in Picture (P)"
            >
              <PictureInPicture className="w-4 h-4" />
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-1.5 rounded-lg hover:bg-white/15 text-slate-300 hover:text-white transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {/* Subtitle Settings Panel Modal */}
      {showSubSettings && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/75 backdrop-blur-md z-50">
          <div className="glass-panel p-6 max-w-sm w-full flex flex-col gap-4 shadow-2xl border border-white/20">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>Subtitle Settings</span>
              </h3>
              <button onClick={() => setShowSubSettings(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Size */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-medium">Text Size</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['small', 'medium', 'large', 'xlarge'] as const).map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSubtitleSettings((p) => ({ ...p, size: sz }))}
                    className={`py-1 text-xs rounded capitalize ${
                      subtitleSettings.size === sz
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Color */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-medium">Color</label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['white', 'yellow', 'cyan', 'green'] as const).map((col) => (
                  <button
                    key={col}
                    onClick={() => setSubtitleSettings((p) => ({ ...p, color: col }))}
                    className={`py-1 text-xs rounded capitalize ${
                      subtitleSettings.color === col
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {col}
                  </button>
                ))}
              </div>
            </div>

            {/* Style / Shadow */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-slate-300 font-medium">Backing Style</label>
              <div className="grid grid-cols-3 gap-1.5">
                {(['shadow', 'glow', 'box'] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => setSubtitleSettings((p) => ({ ...p, background: bg }))}
                    className={`py-1 text-xs rounded capitalize ${
                      subtitleSettings.background === bg
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            {/* Delay Offset */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-300 font-medium">Sync Delay</label>
                <span className="text-xs text-amber-300 font-mono">
                  {subtitleSettings.delay > 0 ? `+${subtitleSettings.delay.toFixed(1)}s` : `${subtitleSettings.delay.toFixed(1)}s`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSubtitleSettings((p) => ({ ...p, delay: Math.max(-10, p.delay - 0.5) }))}
                  className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  -0.5s
                </button>
                <button
                  onClick={() => setSubtitleSettings((p) => ({ ...p, delay: Math.max(-10, p.delay - 0.1) }))}
                  className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  -0.1s
                </button>
                <button
                  onClick={() => setSubtitleSettings((p) => ({ ...p, delay: 0 }))}
                  className="flex-1 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-slate-200 font-medium"
                >
                  Reset
                </button>
                <button
                  onClick={() => setSubtitleSettings((p) => ({ ...p, delay: Math.min(10, p.delay + 0.1) }))}
                  className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  +0.1s
                </button>
                <button
                  onClick={() => setSubtitleSettings((p) => ({ ...p, delay: Math.min(10, p.delay + 0.5) }))}
                  className="px-2 py-1 text-xs rounded bg-white/10 hover:bg-white/20 text-slate-200"
                >
                  +0.5s
                </button>
              </div>
            </div>

            <button onClick={() => setShowSubSettings(false)} className="glass-btn glass-btn-accent w-full py-2 mt-2 text-xs">
              Done
            </button>
          </div>
        </div>
      )}

      {/* Media Info Inspector Modal */}
      {showInfoModal && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md z-50">
          <div className="glass-panel p-6 max-w-lg w-full flex flex-col gap-4 shadow-2xl border border-white/20 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Info className="w-5 h-5 text-amber-400" />
                <span>Media Stream & Hardware Info</span>
              </h3>
              <button onClick={() => setShowInfoModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {mediaProbe ? (
              <div className="flex flex-col gap-3.5 text-xs text-slate-300">
                {/* Pipeline Tier Section */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white">Playback Pipeline Tier</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${
                        activeTier === 'direct'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : activeTier === 'remux'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {activeTier}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{mediaProbe.reason}</p>
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className="text-slate-400">GPU Hardware Decoder:</span>
                    <span className="text-emerald-400 font-semibold">
                      {gpuStatus?.videoDecode === 'enabled' ? 'Active (Hardware Accelerated)' : 'Active (Direct / Chromium D3D11)'}
                    </span>
                  </div>
                  {gpuStatus?.hwEncoder && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-slate-400">FFmpeg HW Encoder:</span>
                      <span className="text-amber-300 font-mono">{gpuStatus.hwEncoder}</span>
                    </div>
                  )}
                </div>

                {/* Video Stream Info */}
                {mediaProbe.video && (
                  <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2">
                    <span className="font-semibold text-white">Video Stream</span>
                    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                      <div>
                        <span className="text-slate-400">Codec: </span>
                        <span className="text-white font-medium uppercase">{mediaProbe.video.codec}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Resolution: </span>
                        <span className="text-white font-medium">
                          {mediaProbe.video.width} × {mediaProbe.video.height} ({mediaProbe.video.resolutionLabel})
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Frame Rate: </span>
                        <span className="text-white font-medium">{mediaProbe.video.fps} fps</span>
                      </div>
                      <div>
                        <span className="text-slate-400">HDR Transfer: </span>
                        <span className={mediaProbe.video.isHdr ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                          {mediaProbe.video.isHdr ? 'HDR10 (PQ/BT.2020)' : 'SDR (BT.709)'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400">Pixel Format: </span>
                        <span className="text-white font-mono">{mediaProbe.video.pixelFormat}</span>
                      </div>
                      {mediaProbe.video.bitRate && (
                        <div>
                          <span className="text-slate-400">Bitrate: </span>
                          <span className="text-white font-medium">{Math.round(mediaProbe.video.bitRate / 1000)} kbps</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Audio Stream Info */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2">
                  <span className="font-semibold text-white">Audio Streams ({mediaProbe.audioTracks.length})</span>
                  {mediaProbe.audioTracks.map((t) => (
                    <div
                      key={t.id}
                      className={`p-2 rounded-lg ${
                        activeAudioTrackIndex === t.index ? 'bg-amber-500/15 border border-amber-500/30' : 'bg-black/20'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white font-medium">{t.title}</span>
                        <span className="text-[10px] text-amber-300 uppercase font-mono">{t.codec}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {t.channels} channels ({t.channelLayout}) • {t.sampleRate} Hz
                        {t.bitRate ? ` • ${Math.round(t.bitRate / 1000)} kbps` : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Subtitle Stream Info */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-2">
                  <span className="font-semibold text-white">Subtitle Tracks ({mediaProbe.subtitleTracks.length})</span>
                  {mediaProbe.subtitleTracks.length === 0 ? (
                    <span className="text-slate-400 italic">No embedded subtitle streams</span>
                  ) : (
                    mediaProbe.subtitleTracks.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between py-1 border-b border-white/5 last:border-none">
                        <span className="text-white">{s.title}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{s.codec}</span>
                      </div>
                    ))
                  )}
                </div>

                {/* Container & File Info */}
                <div className="bg-white/5 rounded-xl p-3 border border-white/10 flex flex-col gap-1.5 text-[11px]">
                  <div>
                    <span className="text-slate-400">File Path: </span>
                    <span className="text-slate-200 font-mono break-all">{video.file_path}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Container Format: </span>
                    <span className="text-white uppercase font-mono">{mediaProbe.container}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">File Size: </span>
                    <span className="text-white">{(mediaProbe.fileSize / (1024 * 1024)).toFixed(1)} MB</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 text-center text-slate-400">Loading stream info...</div>
            )}

            <button onClick={() => setShowInfoModal(false)} className="glass-btn glass-btn-accent w-full py-2 text-xs">
              Close Inspector
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
