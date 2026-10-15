import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useMotionStore,
  DEFAULT_SPRING_SOFT,
  DEFAULT_SPRING_SNAPPY,
  DEFAULT_SPRING_BOUNCY,
} from '../motion';
import { useSettingsStore } from '../store/useSettingsStore';

export const MotionDevPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const {
    springSoft,
    springSnappy,
    springBouncy,
    setSpringSoft,
    setSpringSnappy,
    setSpringBouncy,
    resetDefaults,
    triggerSheen,
  } = useMotionStore();

  const { animationPreference, setAnimationPreference } = useSettingsStore();

  // Global Ctrl+Shift+M shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Floating pill badge on dev mode or shortcut hint */}
      <AnimatePresence>
        {isOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.94, opacity: 0, y: 12 }}
              transition={DEFAULT_SPRING_SNAPPY}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '460px',
                maxHeight: '90vh',
                overflowY: 'auto',
                background: 'rgba(24, 18, 48, 0.96)',
                backdropFilter: 'blur(24px) saturate(200%)',
                WebkitBackdropFilter: 'blur(24px) saturate(200%)',
                border: '1px solid rgba(255, 255, 255, 0.35)',
                borderRadius: '24px',
                padding: '24px',
                boxShadow:
                  'inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 24px 60px rgba(0, 0, 0, 0.6)',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
                fontFamily: "'Outfit', system-ui, sans-serif",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
                  paddingBottom: '12px',
                }}
              >
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 600 }}>
                    Apple Motion Inspector
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'rgba(255, 255, 255, 0.65)',
                      marginTop: '2px',
                    }}
                  >
                    macOS Sonoma / iOS 18 Spring Physics (Ctrl+Shift+M)
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Replay Actions */}
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '8px',
                  }}
                >
                  Live Replay Actions
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      triggerSheen();
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.18)',
                      border: '1px solid rgba(255, 255, 255, 0.3)',
                      color: '#fff',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    ✨ Sweep Glass Sheen
                  </button>
                </div>
              </div>

              {/* Interface Animations Mode */}
              <div>
                <div
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '8px',
                  }}
                >
                  Interface Animations Mode
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['full', 'reduced', 'off'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setAnimationPreference(mode)}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: animationPreference === mode ? 600 : 400,
                        textTransform: 'capitalize',
                        background:
                          animationPreference === mode
                            ? 'var(--accent-cyan, #38bdf8)'
                            : 'rgba(255, 255, 255, 0.12)',
                        border:
                          animationPreference === mode
                            ? '1px solid #fff'
                            : '1px solid rgba(255, 255, 255, 0.2)',
                        color: animationPreference === mode ? '#000' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Spring Config 1: springSoft */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>springSoft (Hover, Expansion, Views)</span>
                  <span style={{ color: '#38bdf8' }}>
                    {springSoft.stiffness} / {springSoft.damping} / {springSoft.mass}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Stiffness</span>
                    <input
                      type="range"
                      min="100"
                      max="600"
                      value={springSoft.stiffness}
                      onChange={(e) => setSpringSoft({ stiffness: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSoft.stiffness}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Damping</span>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={springSoft.damping}
                      onChange={(e) => setSpringSoft({ damping: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSoft.damping}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Mass</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={springSoft.mass}
                      onChange={(e) => setSpringSoft({ mass: parseFloat(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSoft.mass}</span>
                  </div>
                </div>
              </div>

              {/* Spring Config 2: springSnappy */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>springSnappy (Pill Glide, Press, Tooltip)</span>
                  <span style={{ color: '#ff7b00' }}>
                    {springSnappy.stiffness} / {springSnappy.damping} / {springSnappy.mass}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Stiffness</span>
                    <input
                      type="range"
                      min="200"
                      max="800"
                      value={springSnappy.stiffness}
                      onChange={(e) => setSpringSnappy({ stiffness: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSnappy.stiffness}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Damping</span>
                    <input
                      type="range"
                      min="15"
                      max="60"
                      value={springSnappy.damping}
                      onChange={(e) => setSpringSnappy({ damping: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSnappy.damping}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Mass</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={springSnappy.mass}
                      onChange={(e) => setSpringSnappy({ mass: parseFloat(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springSnappy.mass}</span>
                  </div>
                </div>
              </div>

              {/* Spring Config 3: springBouncy */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.06)',
                  padding: '12px',
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                }}
              >
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    marginBottom: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>springBouncy (Release Overshoot, Icons)</span>
                  <span style={{ color: '#ff4d6d' }}>
                    {springBouncy.stiffness} / {springBouncy.damping} / {springBouncy.mass}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Stiffness</span>
                    <input
                      type="range"
                      min="200"
                      max="900"
                      value={springBouncy.stiffness}
                      onChange={(e) => setSpringBouncy({ stiffness: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springBouncy.stiffness}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Damping</span>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={springBouncy.damping}
                      onChange={(e) => setSpringBouncy({ damping: parseInt(e.target.value, 10) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springBouncy.damping}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <span style={{ width: '60px' }}>Mass</span>
                    <input
                      type="range"
                      min="0.5"
                      max="2"
                      step="0.1"
                      value={springBouncy.mass}
                      onChange={(e) => setSpringBouncy({ mass: parseFloat(e.target.value) })}
                      style={{ flex: 1 }}
                    />
                    <span style={{ width: '32px', textAlign: 'right' }}>{springBouncy.mass}</span>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={resetDefaults}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.15)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Reset to Apple Defaults
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
