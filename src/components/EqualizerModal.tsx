import React from 'react';
import { X, Sliders, RotateCcw } from 'lucide-react';
import { usePlayerStore, EQ_FREQUENCIES, EQ_PRESETS } from '../store/usePlayerStore';

export const EqualizerModal: React.FC = () => {
  const {
    isEqualizerOpen,
    toggleEqualizerOpen,
    equalizer,
    setEqualizerBand,
    setEqualizerPreset,
    setEqualizerEnabled,
  } = usePlayerStore();

  if (!isEqualizerOpen) return null;

  const formatFreq = (freq: number) => (freq >= 1000 ? `${freq / 1000}k` : `${freq}`);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 950,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        background: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      }}
      onClick={toggleEqualizerOpen}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          padding: '24px',
          borderRadius: '28px',
          background: 'var(--theme-card-bg)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          border: '1px solid var(--theme-card-border)',
          boxShadow: 'var(--theme-card-shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid rgba(43, 22, 8, 0.08)',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--accent-tint)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-color)',
              }}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
                10-Band Equalizer
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
                Hardware audio filter with Web Audio API
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: 600, color: 'var(--theme-text)' }}>
              <span>{equalizer.enabled ? 'Active' : 'Bypassed'}</span>
              <input
                type="checkbox"
                checked={equalizer.enabled}
                onChange={(e) => setEqualizerEnabled(e.target.checked)}
                style={{ accentColor: 'var(--accent-color)', width: '16px', height: '16px' }}
              />
            </label>

            <button
              type="button"
              onClick={toggleEqualizerOpen}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-text)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Preset Selector */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-sub)' }}>
            Preset
          </span>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {Object.keys(EQ_PRESETS).map((p) => {
              const isSelected = equalizer.preset === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setEqualizerPreset(p)}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '999px',
                    background: isSelected ? 'var(--accent-gradient)' : 'var(--theme-btn-bg)',
                    border: isSelected ? 'none' : '1px solid var(--theme-btn-border)',
                    color: isSelected ? '#ffffff' : 'var(--theme-text)',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    cursor: 'pointer',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </div>

        {/* 10 Vertical Sliders */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '180px',
            padding: '12px 10px',
            borderRadius: '18px',
            background: 'rgba(255, 255, 255, 0.45)',
            border: '1px solid var(--theme-btn-border)',
          }}
        >
          {EQ_FREQUENCIES.map((freq, idx) => {
            const gain = equalizer.bands[idx] || 0;
            return (
              <div
                key={freq}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  height: '100%',
                  justifyContent: 'space-between',
                  width: '40px',
                }}
              >
                <span style={{ fontSize: '10px', fontWeight: 600, color: 'var(--theme-text-sub)' }}>
                  {gain > 0 ? `+${gain}` : gain}
                </span>

                <input
                  type="range"
                  min="-12"
                  max="12"
                  step="0.5"
                  value={gain}
                  disabled={!equalizer.enabled}
                  onChange={(e) => setEqualizerBand(idx, parseFloat(e.target.value))}
                  style={{
                    writingMode: 'vertical-lr',
                    direction: 'rtl',
                    height: '110px',
                    width: '6px',
                    accentColor: 'var(--accent-color)',
                    cursor: 'pointer',
                  }}
                />

                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--theme-text)' }}>
                  {formatFreq(freq)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
