import { create } from 'zustand';
import { Track, Video, RepeatMode, EqualizerSettings } from '../types';

export const EQ_FREQUENCIES = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  rock: [4.5, 3.2, 1.8, 0, -1.0, -0.5, 1.2, 2.5, 3.8, 4.2],
  pop: [-1.2, 1.0, 3.2, 4.0, 3.5, 1.2, -0.5, -1.0, 1.5, 2.0],
  bass: [6.0, 5.2, 4.0, 2.5, 1.0, 0, 0, 0, 0, 0],
  vocal: [-2.0, -1.5, 0, 2.5, 4.2, 4.0, 2.5, 1.0, 0, -1.0],
  jazz: [3.0, 2.0, 1.0, 1.8, -1.5, -1.5, 0, 1.5, 2.8, 3.5],
  electronic: [5.0, 4.0, 1.5, 0, -1.8, 1.2, 0.5, 2.0, 4.0, 4.8],
  acoustic: [3.2, 2.5, 1.0, 0.8, 1.5, 1.2, 2.0, 2.8, 2.5, 1.5],
};

interface PlayerState {
  currentTrack: Track | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  playbackRate: number;
  shuffle: boolean;
  repeat: RepeatMode;
  queue: Track[];
  queueIndex: number;
  activeVideo: Video | null;
  isQueueOpen: boolean;
  isEqualizerOpen: boolean;
  audioElement: HTMLAudioElement | null;
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  biquadFilters: BiquadFilterNode[];
  equalizer: EqualizerSettings;
  sleepTimerEnd: number | null; // timestamp when sleep timer triggers

  // Actions
  initAudioEngine: () => void;
  playTrack: (track: Track, newQueue?: Track[]) => void;
  togglePlay: () => void;
  pause: () => void;
  resume: () => void;
  seek: (seconds: number) => void;
  playNext: () => void;
  playPrev: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  addToQueue: (track: Track) => void;
  addToQueueNext: (track: Track) => void;
  removeFromQueue: (index: number) => void;
  reorderQueue: (fromIndex: number, toIndex: number) => void;
  clearQueue: () => void;
  setActiveVideo: (video: Video | null) => void;
  toggleQueueOpen: () => void;
  toggleEqualizerOpen: () => void;
  setEqualizerBand: (bandIndex: number, gainDb: number) => void;
  setEqualizerPreset: (presetName: string) => void;
  setEqualizerEnabled: (enabled: boolean) => void;
  setSleepTimer: (minutes: number | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentTrack: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isMuted: false,
  playbackRate: 1.0,
  shuffle: false,
  repeat: 'off',
  queue: [],
  queueIndex: -1,
  activeVideo: null,
  isQueueOpen: false,
  isEqualizerOpen: false,
  audioElement: null,
  audioContext: null,
  analyserNode: null,
  biquadFilters: [],
  equalizer: {
    enabled: true,
    preset: 'flat',
    bands: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  },
  sleepTimerEnd: null,

  initAudioEngine: () => {
    if (get().audioElement) return;

    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = get().volume;

    // Web Audio API setup: AudioContext -> AnalyserNode -> 10 BiquadFilters -> Destination
    let ctx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let filters: BiquadFilterNode[] = [];

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      ctx = new AudioContextClass();
      analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;

      const source = ctx.createMediaElementSource(audio);

      // Create 10 band peaking filters
      filters = EQ_FREQUENCIES.map((freq, idx) => {
        const filter = ctx!.createBiquadFilter();
        if (idx === 0) {
          filter.type = 'lowshelf';
        } else if (idx === EQ_FREQUENCIES.length - 1) {
          filter.type = 'highshelf';
        } else {
          filter.type = 'peaking';
          filter.Q.value = 1.4;
        }
        filter.frequency.value = freq;
        filter.gain.value = get().equalizer.bands[idx] || 0;
        return filter;
      });

      // Connect source -> analyser -> filter 0 -> filter 1 ... -> destination
      source.connect(analyser);
      let lastNode: AudioNode = analyser;
      for (const f of filters) {
        lastNode.connect(f);
        lastNode = f;
      }
      lastNode.connect(ctx.destination);
    } catch (e) {
      console.warn('[AudioEngine] Web Audio setup warning:', e);
    }

    // Audio Event listeners
    audio.addEventListener('timeupdate', () => {
      const cur = audio.currentTime;
      set({ currentTime: Number.isFinite(cur) ? cur : 0 });

      // Check sleep timer
      const sleepEnd = get().sleepTimerEnd;
      if (sleepEnd && Date.now() >= sleepEnd) {
        get().pause();
        set({ sleepTimerEnd: null });
      }
    });

    const updateDuration = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0) {
        set({ duration: d });
      } else {
        const fallback = get().currentTrack?.duration;
        if (Number.isFinite(fallback) && (fallback as number) > 0) {
          set({ duration: fallback as number });
        }
      }
    };

    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('loadedmetadata', updateDuration);

    audio.addEventListener('ended', () => {
      const { repeat } = get();
      if (repeat === 'one') {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      } else {
        get().playNext();
      }
    });

    audio.addEventListener('play', () => set({ isPlaying: true }));
    audio.addEventListener('pause', () => set({ isPlaying: false }));
    audio.addEventListener('error', (e) => {
      console.error('[AudioEngine] Playback error:', e);
      set({ isPlaying: false });
    });

    set({
      audioElement: audio,
      audioContext: ctx,
      analyserNode: analyser,
      biquadFilters: filters,
    });

    // Setup MediaSession handlers
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => get().resume());
      navigator.mediaSession.setActionHandler('pause', () => get().pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => get().playPrev());
      navigator.mediaSession.setActionHandler('nexttrack', () => get().playNext());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) get().seek(details.seekTime);
      });
    }

    // Listen to tray commands from main process
    if (window.glassAPI?.onTrayCommand) {
      window.glassAPI.onTrayCommand((cmd) => {
        if (cmd === 'toggle-play') get().togglePlay();
        else if (cmd === 'next') get().playNext();
        else if (cmd === 'prev') get().playPrev();
      });
    }

    // Load saved settings if any
    if (window.glassAPI?.getSettings) {
      window.glassAPI.getSettings().then((saved) => {
        if (saved) {
          if (typeof saved.volume === 'number') {
            audio.volume = saved.volume;
            set({ volume: saved.volume });
          }
          if (saved.repeat) set({ repeat: saved.repeat });
          if (typeof saved.shuffle === 'boolean') set({ shuffle: saved.shuffle });
          if (saved.equalizer) {
            set({ equalizer: saved.equalizer });
            if (filters.length > 0 && Array.isArray(saved.equalizer.bands)) {
              filters.forEach((f, i) => {
                f.gain.value = saved.equalizer.bands[i] || 0;
              });
            }
          }
        }
      });
    }
  },

  playTrack: (track: Track, newQueue?: Track[]) => {
    const { audioElement, audioContext } = get();
    if (!audioElement) return;

    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }

    let updatedQueue = newQueue || get().queue;
    let idx = updatedQueue.findIndex((t) => t.id === track.id);
    if (idx === -1) {
      updatedQueue = [...updatedQueue, track];
      idx = updatedQueue.length - 1;
    }

    const streamUrl = window.glassAPI?.getMediaStreamUrl
      ? window.glassAPI.getMediaStreamUrl(track.file_path)
      : track.file_path;

    audioElement.src = streamUrl;
    audioElement.playbackRate = get().playbackRate;
    audioElement.play().catch((err) => console.warn('[Player] Auto-play prevented or stream error:', err));

    const initialDuration = (track.duration && Number.isFinite(track.duration) && track.duration > 0)
      ? track.duration
      : 0;

    set({
      currentTrack: track,
      queue: updatedQueue,
      queueIndex: idx,
      isPlaying: true,
      currentTime: 0,
      duration: initialDuration,
    });

    // Record play in SQLite
    if (window.glassAPI?.recordTrackPlay) {
      window.glassAPI.recordTrackPlay(track.id);
    }

    // Update MediaSession
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: track.title,
        artist: track.artist,
        album: track.album,
        artwork: track.cover_art ? [{ src: track.cover_art, sizes: '512x512', type: 'image/jpeg' }] : [],
      });
    }
  },

  togglePlay: () => {
    const { isPlaying, currentTrack, queue } = get();
    if (!currentTrack) {
      if (queue.length > 0) {
        get().playTrack(queue[0]);
      }
      return;
    }
    if (isPlaying) {
      get().pause();
    } else {
      get().resume();
    }
  },

  pause: () => {
    const { audioElement } = get();
    if (audioElement) audioElement.pause();
    set({ isPlaying: false });
  },

  resume: () => {
    const { audioElement, audioContext } = get();
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    if (audioElement) {
      audioElement.play().catch(console.error);
      set({ isPlaying: true });
    }
  },

  seek: (seconds: number) => {
    const { audioElement, duration, currentTrack } = get();
    const effectiveDuration = (Number.isFinite(duration) && duration > 0)
      ? duration
      : (currentTrack?.duration && Number.isFinite(currentTrack.duration) ? currentTrack.duration : 0);
    const target = Number.isFinite(seconds) ? seconds : 0;
    const clamped = effectiveDuration > 0
      ? Math.max(0, Math.min(effectiveDuration, target))
      : Math.max(0, target);

    if (audioElement) {
      try {
        audioElement.currentTime = clamped;
      } catch (err) {
        console.warn('[Player] Seek error:', err);
      }
    }
    set({ currentTime: clamped });
  },

  playNext: () => {
    const { queue, queueIndex, shuffle, repeat } = get();
    if (queue.length === 0) return;

    if (shuffle && queue.length > 1) {
      const nextIdx = Math.floor(Math.random() * queue.length);
      get().playTrack(queue[nextIdx]);
      return;
    }

    let nextIdx = queueIndex + 1;
    if (nextIdx >= queue.length) {
      if (repeat === 'all') {
        nextIdx = 0;
      } else {
        set({ isPlaying: false });
        return;
      }
    }
    get().playTrack(queue[nextIdx]);
  },

  playPrev: () => {
    const { queue, queueIndex, audioElement } = get();
    if (queue.length === 0) return;

    if (audioElement && audioElement.currentTime > 3) {
      audioElement.currentTime = 0;
      set({ currentTime: 0 });
      return;
    }

    let prevIdx = queueIndex - 1;
    if (prevIdx < 0) {
      prevIdx = queue.length - 1;
    }
    get().playTrack(queue[prevIdx]);
  },

  setVolume: (volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    const { audioElement } = get();
    if (audioElement) {
      audioElement.volume = clamped;
      audioElement.muted = clamped === 0;
    }
    set({ volume: clamped, isMuted: clamped === 0 });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('volume', clamped);
    }
  },

  toggleMute: () => {
    const { audioElement, isMuted, volume } = get();
    if (!audioElement) return;

    if (isMuted) {
      audioElement.muted = false;
      audioElement.volume = volume > 0 ? volume : 0.5;
      set({ isMuted: false });
    } else {
      audioElement.muted = true;
      set({ isMuted: true });
    }
  },

  setPlaybackRate: (rate: number) => {
    const { audioElement } = get();
    if (audioElement) {
      audioElement.playbackRate = rate;
    }
    set({ playbackRate: rate });
  },

  toggleShuffle: () => {
    const newVal = !get().shuffle;
    set({ shuffle: newVal });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('shuffle', newVal);
    }
  },

  cycleRepeat: () => {
    const current = get().repeat;
    const next: RepeatMode = current === 'off' ? 'all' : current === 'all' ? 'one' : 'off';
    set({ repeat: next });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('repeat', next);
    }
  },

  setQueue: (tracks: Track[], startIndex = 0) => {
    set({ queue: tracks });
    if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
      get().playTrack(tracks[startIndex], tracks);
    }
  },

  addToQueue: (track: Track) => {
    set((state) => ({ queue: [...state.queue, track] }));
  },

  addToQueueNext: (track: Track) => {
    set((state) => {
      const newQueue = [...state.queue];
      const insertIdx = state.queueIndex + 1;
      newQueue.splice(insertIdx, 0, track);
      return { queue: newQueue };
    });
  },

  removeFromQueue: (index: number) => {
    set((state) => {
      const newQueue = [...state.queue];
      newQueue.splice(index, 1);
      let newIdx = state.queueIndex;
      if (index < state.queueIndex) {
        newIdx--;
      } else if (index === state.queueIndex) {
        newIdx = Math.min(newIdx, newQueue.length - 1);
      }
      return { queue: newQueue, queueIndex: newIdx };
    });
  },

  reorderQueue: (fromIndex: number, toIndex: number) => {
    set((state) => {
      const newQueue = [...state.queue];
      const [moved] = newQueue.splice(fromIndex, 1);
      newQueue.splice(toIndex, 0, moved);

      let newIdx = state.queueIndex;
      if (state.queueIndex === fromIndex) {
        newIdx = toIndex;
      } else if (fromIndex < state.queueIndex && toIndex >= state.queueIndex) {
        newIdx--;
      } else if (fromIndex > state.queueIndex && toIndex <= state.queueIndex) {
        newIdx++;
      }
      return { queue: newQueue, queueIndex: newIdx };
    });
  },

  clearQueue: () => {
    get().pause();
    set({ queue: [], queueIndex: -1, currentTrack: null });
  },

  setActiveVideo: (video: Video | null) => {
    if (video) {
      get().pause(); // Pause audio if playing video
    }
    set({ activeVideo: video });
  },

  toggleQueueOpen: () => set((state) => ({ isQueueOpen: !state.isQueueOpen })),
  toggleEqualizerOpen: () => set((state) => ({ isEqualizerOpen: !state.isEqualizerOpen })),

  setEqualizerBand: (bandIndex: number, gainDb: number) => {
    const { biquadFilters, equalizer } = get();
    const newBands = [...equalizer.bands];
    newBands[bandIndex] = gainDb;

    if (biquadFilters[bandIndex]) {
      biquadFilters[bandIndex].gain.value = equalizer.enabled ? gainDb : 0;
    }

    const updated = { ...equalizer, preset: 'custom', bands: newBands };
    set({ equalizer: updated });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('equalizer', updated);
    }
  },

  setEqualizerPreset: (presetName: string) => {
    const preset = EQ_PRESETS[presetName];
    if (!preset) return;
    const { biquadFilters, equalizer } = get();

    biquadFilters.forEach((filter, idx) => {
      filter.gain.value = equalizer.enabled ? (preset[idx] || 0) : 0;
    });

    const updated = { ...equalizer, preset: presetName, bands: [...preset] };
    set({ equalizer: updated });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('equalizer', updated);
    }
  },

  setEqualizerEnabled: (enabled: boolean) => {
    const { biquadFilters, equalizer } = get();
    biquadFilters.forEach((filter, idx) => {
      filter.gain.value = enabled ? (equalizer.bands[idx] || 0) : 0;
    });

    const updated = { ...equalizer, enabled };
    set({ equalizer: updated });
    if (window.glassAPI?.saveSetting) {
      window.glassAPI.saveSetting('equalizer', updated);
    }
  },

  setSleepTimer: (minutes: number | null) => {
    if (minutes === null) {
      set({ sleepTimerEnd: null });
    } else {
      set({ sleepTimerEnd: Date.now() + minutes * 60 * 1000 });
    }
  },
}));
