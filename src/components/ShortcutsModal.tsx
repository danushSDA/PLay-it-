import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore } from '../store/useLibraryStore';
import { X, Keyboard } from 'lucide-react';
import { DEFAULT_SPRING_SOFT } from '../motion';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause playback' },
  { key: '← / →', desc: 'Seek 5 seconds (Shift + ← / → for 15s)' },
  { key: '↑ / ↓', desc: 'Adjust volume by 5%' },
  { key: 'M', desc: 'Mute / Unmute audio' },
  { key: 'N / P', desc: 'Next / Previous track' },
  { key: 'S', desc: 'Toggle shuffle order' },
  { key: 'R', desc: 'Cycle repeat mode (Off → All → One)' },
  { key: 'F', desc: 'Toggle Fullscreen mode' },
  { key: 'Ctrl + K', desc: 'Focus live library search' },
  { key: 'Ctrl + B', desc: 'Collapse / Expand Sidebar' },
  { key: 'Ctrl + ,', desc: 'Open Settings' },
  { key: 'Esc', desc: 'Close menus / Exit fullscreen / Clear search' },
  { key: ', / .', desc: 'Frame step backward / forward (Video)' },
  { key: 'I', desc: 'Toggle Media Info inspector (Video)' },
  { key: 'C', desc: 'Toggle Subtitles (Video)' },
];

export const ShortcutsModal: React.FC = () => {
  const { isShortcutsOpen, setShortcutsOpen } = useLibraryStore();

  if (!isShortcutsOpen) return null;

  return (
    <AnimatePresence>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px',
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
        }}
        onClick={() => setShortcutsOpen(false)}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 8 }}
          transition={DEFAULT_SPRING_SOFT}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'relative',
            width: '100%',
            maxWidth: '500px',
            padding: '24px',
            borderRadius: '28px',
            background: 'var(--theme-card-bg)',
            backdropFilter: 'blur(28px) saturate(190%)',
            WebkitBackdropFilter: 'blur(28px) saturate(190%)',
            border: '1px solid var(--theme-card-border)',
            boxShadow: 'var(--theme-card-shadow)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            color: 'var(--theme-text)',
            maxHeight: '85vh',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(43, 22, 8, 0.08)',
              paddingBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <Keyboard className="w-5 h-5" />
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--theme-text)' }}>
                  Keyboard Shortcuts
                </h2>
                <p style={{ fontSize: '11px', color: 'var(--theme-text-sub)', margin: '1px 0 0' }}>
                  Fast control at your fingertips
                </p>
              </div>
            </div>
            <button
              onClick={() => setShortcutsOpen(false)}
              aria-label="Close Shortcuts"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-text-sub)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div
            style={{
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              paddingRight: '4px',
              scrollbarWidth: 'none',
            }}
          >
            {SHORTCUTS.map((s) => (
              <div
                key={s.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.45)',
                  border: '1px solid var(--theme-btn-border)',
                }}
              >
                <span style={{ fontSize: '12px', color: 'var(--theme-text)', fontWeight: 500 }}>
                  {s.desc}
                </span>
                <kbd
                  style={{
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'var(--theme-btn-bg)',
                    border: '1px solid var(--theme-btn-border)',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--theme-text)',
                    fontFamily: 'inherit',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  {s.key}
                </kbd>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
