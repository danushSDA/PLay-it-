import React from 'react';
import { motion } from 'framer-motion';
import { useMotionStore, getTransition } from '../motion';
import { useSettingsStore } from '../store/useSettingsStore';

interface GlassPillProps {
  isCollapsed?: boolean;
}

export const GlassPill: React.FC<GlassPillProps> = ({ isCollapsed = false }) => {
  const { springSnappy } = useMotionStore();
  const animationPreference = useSettingsStore((s) => s.animationPreference) || 'full';
  const transition = getTransition('snappy', animationPreference);

  return (
    <motion.div
      layoutId="sidebar-pill"
      className="sidebar-glass-pill"
      transition={{
        ...transition,
        layout: transition,
      }}
      initial={false}
      style={{
        position: 'absolute',
        inset: isCollapsed ? '0 auto 0 auto' : 0,
        width: isCollapsed ? '44px' : '100%',
        height: '42px',
        left: isCollapsed ? 'calc(50% - 22px)' : 0,
        borderRadius: isCollapsed ? '22px' : '14px',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      {/* Specular inner top gloss highlight */}
      <div className="glass-pill-inner-highlight" />
    </motion.div>
  );
};
