import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLibraryStore } from '../store/useLibraryStore';
import { X, Sparkles, ShieldCheck, WifiOff } from 'lucide-react';
import { DEFAULT_SPRING_SOFT } from '../motion';

export const AboutModal: React.FC = () => {
  const { isAboutOpen, setAboutOpen } = useLibraryStore();

  if (!isAboutOpen) return null;

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
        onClick={() => setAboutOpen(false)}
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
            maxWidth: '440px',
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
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setAboutOpen(false)}
            aria-label="Close About"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              padding: '6px',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              color: 'var(--theme-text-sub)',
              cursor: 'pointer',
            }}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '16px',
                background: 'var(--accent-gradient)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                boxShadow: '0 6px 18px rgba(255, 94, 98, 0.35)',
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 4.5l14 7.5-14 7.5z" />
              </svg>
            </div>
            <div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, margin: 0, color: 'var(--theme-text)' }}>
                Play It
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 600, margin: '2px 0 0' }}>
                Version 1.0.0 (Production Release)
              </p>
            </div>
          </div>

          {/* Description */}
          <p style={{ fontSize: '13px', color: 'var(--theme-text)', lineHeight: 1.5, margin: 0 }}>
            Offline liquid glass desktop media player with Apple-grade fluid spring animations, HSL-tailored citrus accents, and offline SQLite storage.
          </p>

          {/* Features pills */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid var(--theme-btn-border)',
              }}
            >
              <WifiOff className="w-4 h-4 text-amber-500 shrink-0" />
              <span style={{ fontWeight: 600, color: 'var(--theme-text)' }}>100% Offline</span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.5)',
                border: '1px solid var(--theme-btn-border)',
              }}
            >
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <span style={{ fontWeight: 600, color: 'var(--theme-text)' }}>Zero Telemetry</span>
            </div>
          </div>

          <div
            style={{
              paddingTop: '12px',
              borderTop: '1px solid rgba(43, 22, 8, 0.08)',
              fontSize: '11px',
              color: 'var(--theme-text-sub)',
              textAlign: 'center',
            }}
          >
            Built with Electron 33 · React 19 · Web Audio API · SQLite
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
