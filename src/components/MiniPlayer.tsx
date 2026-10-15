import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Maximize2, Music2 } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';
import { generateGradientCover } from '../utils/colorExtractor';

export const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying, togglePlay, playNext, playPrev, currentTime, duration, seek } = usePlayerStore();

  const handleExpand = () => {
    window.glassAPI?.toggleMiniPlayer();
  };

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="titlebar-drag-region w-full h-full p-3 flex flex-col justify-between bg-[rgba(10,14,24,0.85)] backdrop-blur-2xl border border-white/20 rounded-2xl select-none text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate">
          <div
            className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center shadow-md"
            style={{
              background: currentTrack?.cover_art
                ? undefined
                : generateGradientCover(currentTrack?.title || '', currentTrack?.artist || ''),
            }}
          >
            {currentTrack?.cover_art ? (
              <img src={currentTrack.cover_art} alt="" className="w-full h-full object-cover" />
            ) : (
              <Music2 className="w-4 h-4 text-white/70" />
            )}
          </div>

          <div className="truncate">
            <p className="text-xs font-semibold truncate">{currentTrack?.title || 'PLay It'}</p>
            <p className="text-[10px] text-slate-400 truncate">{currentTrack?.artist || 'Idle'}</p>
          </div>
        </div>

        <button
          onClick={handleExpand}
          className="no-drag p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          title="Restore full window"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress & Controls */}
      <div className="no-drag flex flex-col gap-1.5 mt-2">
        <input
          type="range"
          min="0"
          max={duration || 1}
          step="0.1"
          value={currentTime}
          onChange={(e) => seek(parseFloat(e.target.value))}
          className="glass-slider w-full"
        />

        <div className="flex items-center justify-between text-[9px] text-slate-400 px-0.5" style={{ fontFamily: "'Outfit', sans-serif", fontVariantNumeric: 'tabular-nums' }}>
          <span>{formatTime(currentTime)}</span>
          <div className="flex items-center gap-2">
            <button onClick={playPrev} className="p-1 hover:text-white">
              <SkipBack className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={togglePlay}
              className="w-6 h-6 rounded-full bg-white text-slate-950 flex items-center justify-center hover:scale-105"
            >
              {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
            </button>
            <button onClick={playNext} className="p-1 hover:text-white">
              <SkipForward className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
};
