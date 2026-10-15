import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Sliders,
  Music,
  Video,
  FolderOpen,
  Monitor,
  RotateCcw,
  Play,
  Check,
  Volume2,
  Cpu,
  Trash2,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useLibraryStore } from '../store/useLibraryStore';
import { usePlayerStore } from '../store/usePlayerStore';

export const SettingsView: React.FC = () => {
  const {
    blurStrength,
    setBlurStrength,
    glassOpacity,
    setGlassOpacity,
    reduceTransparency,
    setReduceTransparency,
    accentColor,
    setAccentColor,
  } = useSettingsStore();

  const { pickAndImportFolder, loadLibrary } = useLibraryStore();
  const currentTrack = usePlayerStore((s) => s.currentTrack);

  const [activeCategory, setActiveCategory] = useState<
    'appearance' | 'playback' | 'video' | 'library' | 'system'
  >('appearance');

  // Appearance
  const [waveEffects, setWaveEffects] = useState(true);

  // Playback
  const [bufferSize, setBufferSize] = useState('128');
  const [crossfade, setCrossfade] = useState(0);
  const [replayGain, setReplayGain] = useState(true);
  const [eqPreset, setEqPreset] = useState('Citrus Glow');

  // Video
  const [hardwareAccel, setHardwareAccel] = useState(true);
  const [hdrToneMap, setHdrToneMap] = useState(true);
  const [subSize, setSubSize] = useState('medium');
  const [subColor, setSubColor] = useState('white');
  const [cacheSize, setCacheSize] = useState('0 MB');
  const [cacheCleared, setCacheCleared] = useState(false);

  // Library
  const [autoWatch, setAutoWatch] = useState(true);
  const [isRescanning, setIsRescanning] = useState(false);

  // System
  const [minimizeToTray, setMinimizeToTray] = useState(true);
  const [globalMediaKeys, setGlobalMediaKeys] = useState(true);
  const [startOnBoot, setStartOnBoot] = useState(false);

  // Accent Swatches: Lemon, Tangerine, Grapefruit, Lime
  const ACCENT_SWATCHES = [
    { label: 'Lemon', hex: '#F5C518' },
    { label: 'Tangerine', hex: '#FF9A1F' },
    { label: 'Grapefruit', hex: '#FF5E7A' },
    { label: 'Lime', hex: '#8CD11F' },
  ];

  // Sync settings
  useEffect(() => {
    window.glassAPI?.getSettings?.().then((saved: any) => {
      if (saved) {
        if (typeof saved.waveEffects === 'boolean') setWaveEffects(saved.waveEffects);
        if (typeof saved.minimizeToTray === 'boolean') setMinimizeToTray(saved.minimizeToTray);
      }
    });

    window.glassAPI?.getVideoCacheInfo?.().then((info) => {
      if (info?.formatted) setCacheSize(info.formatted);
    });
  }, []);

  const handleWaveEffectsChange = (v: boolean) => {
    setWaveEffects(v);
    window.glassAPI?.saveSetting?.('waveEffects', v);
  };

  const handleClearCache = async () => {
    if (window.glassAPI?.clearVideoCache) {
      await window.glassAPI.clearVideoCache();
      setCacheSize('0 MB');
      setCacheCleared(true);
      setTimeout(() => setCacheCleared(false), 2000);
    }
  };

  const handleRescan = async () => {
    setIsRescanning(true);
    await loadLibrary();
    setTimeout(() => setIsRescanning(false), 1200);
  };

  const handleResetDefaults = () => {
    setBlurStrength(32);
    setGlassOpacity(0.35);
    setReduceTransparency(false);
    setAccentColor('#FF9A1F');
    setWaveEffects(true);
    setBufferSize('128');
    setCrossfade(0);
    setReplayGain(true);
    setEqPreset('Citrus Glow');
    setHardwareAccel(true);
    setHdrToneMap(true);
    setSubSize('medium');
    setSubColor('white');
    setMinimizeToTray(true);
    setGlobalMediaKeys(true);
    setStartOnBoot(false);
  };

  return (
    <div className="settings-screen-layout">
      {/* 1. Left Column: Categories List (210px wide glass card) */}
      <div className="settings-categories-card">
        <div className="settings-categories-header">Settings</div>

        <div className="settings-categories-list">
          <button
            type="button"
            onClick={() => setActiveCategory('appearance')}
            className={`settings-cat-btn ${activeCategory === 'appearance' ? 'active' : ''}`}
          >
            <div className="settings-cat-icon-chip">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="settings-cat-text">
              <span className="settings-cat-title">Appearance</span>
              <span className="settings-cat-sub">Glass, accent</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('playback')}
            className={`settings-cat-btn ${activeCategory === 'playback' ? 'active' : ''}`}
          >
            <div className="settings-cat-icon-chip">
              <Music className="w-4 h-4" />
            </div>
            <div className="settings-cat-text">
              <span className="settings-cat-title">Playback</span>
              <span className="settings-cat-sub">Audio, equalizer</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('video')}
            className={`settings-cat-btn ${activeCategory === 'video' ? 'active' : ''}`}
          >
            <div className="settings-cat-icon-chip">
              <Video className="w-4 h-4" />
            </div>
            <div className="settings-cat-text">
              <span className="settings-cat-title">Video</span>
              <span className="settings-cat-sub">Decoding, cache</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('library')}
            className={`settings-cat-btn ${activeCategory === 'library' ? 'active' : ''}`}
          >
            <div className="settings-cat-icon-chip">
              <FolderOpen className="w-4 h-4" />
            </div>
            <div className="settings-cat-text">
              <span className="settings-cat-title">Library</span>
              <span className="settings-cat-sub">Folders, scanning</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('system')}
            className={`settings-cat-btn ${activeCategory === 'system' ? 'active' : ''}`}
          >
            <div className="settings-cat-icon-chip">
              <Monitor className="w-4 h-4" />
            </div>
            <div className="settings-cat-text">
              <span className="settings-cat-title">System</span>
              <span className="settings-cat-sub">Keys, tray, startup</span>
            </div>
          </button>
        </div>

        {/* Footer: Reset to defaults & caption */}
        <div className="settings-categories-footer">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="settings-reset-btn"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to defaults</span>
          </button>
          <span className="settings-offline-text">Works fully offline</span>
        </div>
      </div>

      {/* 2. Right Column: Settings Panel (flex glass card) */}
      <div className="settings-panel-card">
        {/* ==================== APPEARANCE ==================== */}
        {activeCategory === 'appearance' && (
          <div className="settings-panel-content">
            <div className="settings-panel-header">
              <div className="settings-panel-icon-chip">
                <Sliders className="w-4 h-4" />
              </div>
              <div className="settings-panel-heading">
                <h2 className="settings-panel-title">Appearance</h2>
                <p className="settings-panel-desc">
                  Glass look, transparency and accent color
                </p>
              </div>
            </div>

            {/* Live Preview Card */}
            <div className="settings-live-preview-box">
              <div className="settings-preview-wallpaper">
                <div className="settings-preview-glass-player">
                  <div className="settings-preview-art-thumb" />
                  <div className="settings-preview-meta">
                    <span className="settings-preview-title">{currentTrack ? currentTrack.title : 'Play It'}</span>
                    <span className="settings-preview-sub">{currentTrack ? (currentTrack.artist || 'Now playing') : 'Citrus Glass Preview'}</span>
                  </div>
                  <div className="settings-preview-visualizer">
                    {[35, 65, 85, 45, 95].map((h, i) => (
                      <div
                        key={i}
                        className={`preview-eq-bar ${!waveEffects ? 'paused' : ''}`}
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                  <div className="settings-preview-play-disc">
                    <Play className="w-3 h-3 text-white fill-current ml-0.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* Control Rows */}
            <div className="settings-controls-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Glass blur</span>
                  <span className="settings-row-sub">Lower is clearer</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={10}
                    max={60}
                    value={blurStrength}
                    disabled={reduceTransparency}
                    onChange={(e) => setBlurStrength(parseInt(e.target.value))}
                    className="settings-slider"
                  />
                  <span className="settings-slider-val">
                    {Math.round(((blurStrength - 10) / 50) * 100)}%
                  </span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Transparency</span>
                  <span className="settings-row-sub">Higher shows more wallpaper</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={0.1}
                    max={0.8}
                    step={0.01}
                    value={glassOpacity}
                    disabled={reduceTransparency}
                    onChange={(e) => setGlassOpacity(parseFloat(e.target.value))}
                    className="settings-slider"
                  />
                  <span className="settings-slider-val">
                    {Math.round(glassOpacity * 100)}%
                  </span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Accent color</span>
                  <span className="settings-row-sub">
                    Tints highlights and the seek bar
                  </span>
                </div>
                <div className="settings-swatches-row">
                  {ACCENT_SWATCHES.map((swatch) => {
                    const isSelected =
                      accentColor.toLowerCase() === swatch.hex.toLowerCase();
                    return (
                      <button
                        key={swatch.hex}
                        type="button"
                        onClick={() => setAccentColor(swatch.hex)}
                        title={swatch.label}
                        aria-label={`Accent ${swatch.label}`}
                        className={`settings-swatch-circle ${isSelected ? 'selected' : ''}`}
                        style={{ backgroundColor: swatch.hex }}
                      />
                    );
                  })}
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Reduce transparency</span>
                  <span className="settings-row-sub">
                    Adds a solid backing for readability
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setReduceTransparency(!reduceTransparency)}
                  className={`settings-toggle-switch ${reduceTransparency ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={reduceTransparency}
                  aria-label="Reduce transparency toggle"
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Wave effects</span>
                  <span className="settings-row-sub">
                    Animate the visualizer while playing
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleWaveEffectsChange(!waveEffects)}
                  className={`settings-toggle-switch ${waveEffects ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={waveEffects}
                  aria-label="Wave effects toggle"
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== PLAYBACK ==================== */}
        {activeCategory === 'playback' && (
          <div className="settings-panel-content">
            <div className="settings-panel-header">
              <div className="settings-panel-icon-chip">
                <Music className="w-4 h-4" />
              </div>
              <div className="settings-panel-heading">
                <h2 className="settings-panel-title">Playback</h2>
                <p className="settings-panel-desc">
                  Audio output engine, buffers and equalization
                </p>
              </div>
            </div>

            <div className="settings-controls-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Audio buffer size</span>
                  <span className="settings-row-sub">Lower values reduce latency; higher prevents crackle</span>
                </div>
                <select
                  value={bufferSize}
                  onChange={(e) => setBufferSize(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    background: 'var(--theme-btn-bg)',
                    border: '1px solid var(--theme-btn-border)',
                    color: 'var(--theme-text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="64">64 ms (Ultra-low latency)</option>
                  <option value="128">128 ms (Recommended)</option>
                  <option value="256">256 ms (Smooth)</option>
                  <option value="512">512 ms (Maximum stability)</option>
                </select>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Crossfade</span>
                  <span className="settings-row-sub">Smooth transition between sequential tracks</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="range"
                    min={0}
                    max={8}
                    step={1}
                    value={crossfade}
                    onChange={(e) => setCrossfade(parseInt(e.target.value))}
                    className="settings-slider"
                  />
                  <span className="settings-slider-val">{crossfade}s</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Volume normalization</span>
                  <span className="settings-row-sub">EBU R128 loudness matching across tracks</span>
                </div>
                <button
                  type="button"
                  onClick={() => setReplayGain(!replayGain)}
                  className={`settings-toggle-switch ${replayGain ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={replayGain}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Default EQ profile</span>
                  <span className="settings-row-sub">Tone color for the 10-band hardware filter</span>
                </div>
                <select
                  value={eqPreset}
                  onChange={(e) => setEqPreset(e.target.value)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '12px',
                    background: 'var(--theme-btn-bg)',
                    border: '1px solid var(--theme-btn-border)',
                    color: 'var(--theme-text)',
                    fontSize: '13px',
                    fontWeight: 600,
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <option value="Citrus Glow">Citrus Glow (Enhanced Warmth)</option>
                  <option value="Flat">Flat (Neutral Studio)</option>
                  <option value="Bass Boost">Bass Boost (+6dB Sub)</option>
                  <option value="Vocal Clarity">Vocal Clarity</option>
                  <option value="Electronic">Electronic / Dance</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* ==================== VIDEO ==================== */}
        {activeCategory === 'video' && (
          <div className="settings-panel-content">
            <div className="settings-panel-header">
              <div className="settings-panel-icon-chip">
                <Video className="w-4 h-4" />
              </div>
              <div className="settings-panel-heading">
                <h2 className="settings-panel-title">Video Engine</h2>
                <p className="settings-panel-desc">
                  Hardware acceleration, tone-mapping and caching
                </p>
              </div>
            </div>

            <div className="settings-controls-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Hardware decoding (D3D11VA)</span>
                  <span className="settings-row-sub">Uses GPU shader pipeline for 4K 60fps playback</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHardwareAccel(!hardwareAccel)}
                  className={`settings-toggle-switch ${hardwareAccel ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={hardwareAccel}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">HDR to SDR tone-mapping</span>
                  <span className="settings-row-sub">Real-time color curve mapping for HDR10 content</span>
                </div>
                <button
                  type="button"
                  onClick={() => setHdrToneMap(!hdrToneMap)}
                  className={`settings-toggle-switch ${hdrToneMap ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={hdrToneMap}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Subtitle appearance</span>
                  <span className="settings-row-sub">Size and color for embedded and .SRT/.VTT files</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select
                    value={subSize}
                    onChange={(e) => setSubSize(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '10px',
                      background: 'var(--theme-btn-bg)',
                      border: '1px solid var(--theme-btn-border)',
                      color: 'var(--theme-text)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                  <select
                    value={subColor}
                    onChange={(e) => setSubColor(e.target.value)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: '10px',
                      background: 'var(--theme-btn-bg)',
                      border: '1px solid var(--theme-btn-border)',
                      color: 'var(--theme-text)',
                      fontSize: '12px',
                      fontWeight: 600,
                    }}
                  >
                    <option value="white">White</option>
                    <option value="yellow">Yellow</option>
                    <option value="cyan">Cyan</option>
                  </select>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Remux & stream cache</span>
                  <span className="settings-row-sub">Local disk cache used: {cacheSize}</span>
                </div>
                <button
                  type="button"
                  onClick={handleClearCache}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: cacheCleared ? '#22c55e' : 'var(--theme-btn-bg)',
                    border: '1px solid var(--theme-btn-border)',
                    color: cacheCleared ? '#ffffff' : 'var(--theme-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {cacheCleared ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
                  <span>{cacheCleared ? 'Cleared' : 'Clear cache'}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== LIBRARY ==================== */}
        {activeCategory === 'library' && (
          <div className="settings-panel-content">
            <div className="settings-panel-header">
              <div className="settings-panel-icon-chip">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div className="settings-panel-heading">
                <h2 className="settings-panel-title">Library & Folders</h2>
                <p className="settings-panel-desc">
                  Indexed media directories, scanning and SQLite storage
                </p>
              </div>
            </div>

            <div className="settings-controls-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Watch folders automatically</span>
                  <span className="settings-row-sub">Detects new audio and video files as soon as they are added</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoWatch(!autoWatch)}
                  className={`settings-toggle-switch ${autoWatch ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={autoWatch}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Indexed media folders</span>
                  <span className="settings-row-sub">Standard user media directories indexed</span>
                </div>
                <button
                  type="button"
                  onClick={() => pickAndImportFolder()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: 'var(--accent-gradient)',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(255, 94, 98, 0.3)',
                  }}
                >
                  <FolderOpen className="w-3.5 h-3.5" />
                  <span>Add media folder</span>
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Rebuild database index</span>
                  <span className="settings-row-sub">Re-scans tags, album art and embedded video streams</span>
                </div>
                <button
                  type="button"
                  onClick={handleRescan}
                  disabled={isRescanning}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '999px',
                    background: 'var(--theme-btn-bg)',
                    border: '1px solid var(--theme-btn-border)',
                    color: 'var(--theme-text)',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRescanning ? 'animate-spin' : ''}`} />
                  <span>{isRescanning ? 'Scanning...' : 'Rescan library'}</span>
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Local SQLite storage</span>
                  <span className="settings-row-sub">Database location: AppData\Roaming\play-it\play_it.db</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-sub)' }}>
                  Active & Synced
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================== SYSTEM ==================== */}
        {activeCategory === 'system' && (
          <div className="settings-panel-content">
            <div className="settings-panel-header">
              <div className="settings-panel-icon-chip">
                <Monitor className="w-4 h-4" />
              </div>
              <div className="settings-panel-heading">
                <h2 className="settings-panel-title">System & Keys</h2>
                <p className="settings-panel-desc">
                  Windows integration, tray behavior and shortcuts
                </p>
              </div>
            </div>

            <div className="settings-controls-group">
              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Close to system tray</span>
                  <span className="settings-row-sub">Keep playing in the background when window is closed</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const next = !minimizeToTray;
                    setMinimizeToTray(next);
                    window.glassAPI?.saveSetting?.('minimizeToTray', next);
                  }}
                  className={`settings-toggle-switch ${minimizeToTray ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={minimizeToTray}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Hardware media keys</span>
                  <span className="settings-row-sub">Respond to Play/Pause, Next, Prev and Mute keyboard keys</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGlobalMediaKeys(!globalMediaKeys)}
                  className={`settings-toggle-switch ${globalMediaKeys ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={globalMediaKeys}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Start with Windows</span>
                  <span className="settings-row-sub">Launch minimized to system tray on login</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStartOnBoot(!startOnBoot)}
                  className={`settings-toggle-switch ${startOnBoot ? 'on' : 'off'}`}
                  role="switch"
                  aria-checked={startOnBoot}
                >
                  <div className="settings-toggle-knob" />
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-title">Offline architecture</span>
                  <span className="settings-row-sub">Zero telemetry, zero external network requests</span>
                </div>
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    fontWeight: 700,
                    color: '#16a34a',
                  }}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>100% Offline</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
