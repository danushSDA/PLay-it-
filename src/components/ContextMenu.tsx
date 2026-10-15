import React, { useEffect, useRef } from 'react';
import { Play, ListPlus, Folder, Heart, Trash2, ListMusic } from 'lucide-react';
import { Track } from '../types';
import { usePlayerStore } from '../store/usePlayerStore';
import { useLibraryStore } from '../store/useLibraryStore';

interface ContextMenuProps {
  x: number;
  y: number;
  track: Track;
  onClose: () => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({ x, y, track, onClose }) => {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { playTrack, addToQueue, addToQueueNext } = usePlayerStore();
  const { toggleTrackFavorite, removeTrack, playlists, addTrackToPlaylist } = useLibraryStore();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust positioning to stay within window bounds
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  return (
    <div
      ref={menuRef}
      style={{ left: adjustedX, top: adjustedY }}
      className="fixed z-50 w-52 py-1.5 rounded-2xl glass-panel shadow-2xl border border-white/20 select-none text-xs flex flex-col gap-0.5 text-slate-200"
    >
      <button
        onClick={() => {
          playTrack(track);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
      >
        <Play className="w-3.5 h-3.5 text-sky-400" />
        <span>Play Now</span>
      </button>

      <button
        onClick={() => {
          addToQueueNext(track);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
      >
        <ListPlus className="w-3.5 h-3.5 text-indigo-400" />
        <span>Play Next</span>
      </button>

      <button
        onClick={() => {
          addToQueue(track);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
      >
        <ListPlus className="w-3.5 h-3.5 text-purple-400" />
        <span>Add to Queue</span>
      </button>

      <button
        onClick={() => {
          toggleTrackFavorite(track.id);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
      >
        <Heart className={`w-3.5 h-3.5 ${track.is_favorite ? 'fill-rose-500 text-rose-500' : 'text-rose-400'}`} />
        <span>{track.is_favorite ? 'Remove Favorite' : 'Add to Favorites'}</span>
      </button>

      {/* Playlist submenu */}
      {playlists.length > 0 && (
        <div className="relative group/sub">
          <div className="flex items-center justify-between px-3 py-1.5 hover:bg-white/10 cursor-pointer">
            <div className="flex items-center gap-2.5">
              <ListMusic className="w-3.5 h-3.5 text-amber-400" />
              <span>Add to Playlist</span>
            </div>
            <span className="text-[10px] text-slate-400">›</span>
          </div>

          <div className="hidden group-hover/sub:flex flex-col absolute left-full top-0 ml-1 w-44 py-1.5 rounded-2xl glass-panel shadow-2xl border border-white/20 bg-slate-900/90 max-h-48 overflow-y-auto">
            {playlists.map((pl) => (
              <button
                key={pl.id}
                onClick={() => {
                  addTrackToPlaylist(pl.id, track.id);
                  onClose();
                }}
                className="px-3 py-1.5 hover:bg-white/10 text-left truncate transition-colors text-slate-300 hover:text-white"
              >
                {pl.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="h-[1px] bg-white/10 my-1" />

      <button
        onClick={() => {
          window.glassAPI?.showInFolder(track.file_path);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-white/10 text-left transition-colors"
      >
        <Folder className="w-3.5 h-3.5 text-emerald-400" />
        <span>Show in Explorer</span>
      </button>

      <button
        onClick={() => {
          removeTrack(track.id);
          onClose();
        }}
        className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-rose-500/20 text-rose-400 text-left transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        <span>Remove from Library</span>
      </button>
    </div>
  );
};
