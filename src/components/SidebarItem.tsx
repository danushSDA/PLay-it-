import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassPill } from './GlassPill';
import { useMotionStore, getTransition, EASE_APPLE } from '../motion';
import { useSettingsStore } from '../store/useSettingsStore';

interface SidebarItemProps {
  id: string;
  label: string;
  icon: (props: { isSelected: boolean; reducedMotion?: boolean }) => React.ReactNode;
  isActive: boolean;
  isCollapsed: boolean;
  index: number;
  hoveredIndex: number | null;
  onHover: (index: number | null) => void;
  onClick: () => void;
}

export const SidebarItem: React.FC<SidebarItemProps> = ({
  id,
  label,
  icon,
  isActive,
  isCollapsed,
  index,
  hoveredIndex,
  onHover,
  onClick,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const animationPreference = useSettingsStore((s) => s.animationPreference) || 'full';
  const reducedMotion = animationPreference === 'reduced' || animationPreference === 'off';
  const { springSoft, springSnappy, springBouncy } = useMotionStore();

  // Neighbor falloff logic
  const isDirectlyHovered = hoveredIndex === index;
  const isNeighbor = hoveredIndex !== null && Math.abs(hoveredIndex - index) === 1;

  // Scale and translate targets
  let targetScale = 1;
  let targetTranslateX = 0;

  if (!reducedMotion) {
    if (isPressed) {
      targetScale = 0.97;
    } else if (isDirectlyHovered) {
      targetScale = 1.02;
      targetTranslateX = isCollapsed ? 0 : 3;
    } else if (isNeighbor) {
      targetScale = 1.01;
      targetTranslateX = isCollapsed ? 0 : 1;
    }
  }

  const activeTransition = getTransition(
    isPressed ? 'snappy' : isDirectlyHovered ? 'soft' : 'bouncy',
    animationPreference
  );

  return (
    <motion.button
      type="button"
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      data-id={id}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
      onMouseEnter={() => {
        onHover(index);
        if (isCollapsed) {
          setShowTooltip(true);
        }
      }}
      onMouseLeave={() => {
        onHover(null);
        setIsPressed(false);
        setShowTooltip(false);
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      animate={{
        scale: targetScale,
        x: targetTranslateX,
      }}
      transition={activeTransition}
      className={`sidebar-nav-item ${isActive ? 'is-active' : ''} ${isCollapsed ? 'collapsed' : ''}`}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: isCollapsed ? 'center' : 'flex-start',
        gap: isCollapsed ? '0' : '12px',
        height: '42px',
        padding: isCollapsed ? '0' : '0 14px',
        borderRadius: isCollapsed ? '22px' : '14px',
        cursor: 'pointer',
        background: 'transparent',
        border: 'none',
        outline: 'none',
        width: '100%',
        willChange: 'transform',
      }}
    >
      {/* 1. Selection pill (shared layoutId glides continuously) */}
      {isActive && <GlassPill isCollapsed={isCollapsed} />}

      {/* 2. Soft glass hover backdrop highlight (opacity 0 to 0.5) */}
      <motion.div
        className="sidebar-item-hover-glow"
        initial={false}
        animate={{
          opacity: isDirectlyHovered && !isActive ? 0.45 : 0,
        }}
        transition={{ duration: 0.18, ease: EASE_APPLE }}
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: isCollapsed ? '22px' : '14px',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.25)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* 3. Icon (lifts 1px on hover, plays micro-animation on select) */}
      <motion.div
        className="sidebar-icon-wrapper"
        animate={{
          y: isDirectlyHovered && !reducedMotion ? -1 : 0,
          opacity: isActive ? 1 : 0.72,
          color: isActive ? 'var(--theme-text, #ffffff)' : 'var(--theme-text-sub, rgba(255, 255, 255, 0.75))',
        }}
        transition={{ duration: 0.18, ease: EASE_APPLE }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          flexShrink: 0,
          zIndex: 1,
        }}
      >
        {icon({ isSelected: isActive, reducedMotion })}
      </motion.div>

      {/* 4. Text Label (fades & slides left 6px when collapsing, staggers when expanding) */}
      {!isCollapsed && (
        <motion.span
          className="sidebar-item-label"
          initial={{ opacity: 0, x: -6 }}
          animate={{
            opacity: isActive ? 1 : 0.72,
            x: 0,
            color: isActive ? 'var(--theme-text, #ffffff)' : 'var(--theme-text-sub, rgba(255, 255, 255, 0.75))',
            fontWeight: isActive ? 550 : 400,
          }}
          exit={{ opacity: 0, x: -6 }}
          transition={{ duration: 0.18, ease: EASE_APPLE }}
          style={{
            fontSize: '15px',
            letterSpacing: '0.1px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            zIndex: 1,
          }}
        >
          {label}
        </motion.span>
      )}

      {/* 5. Tooltip in collapsed icon rail mode (delayed 250ms, springSnappy) */}
      <AnimatePresence>
        {isCollapsed && showTooltip && (
          <motion.div
            className="sidebar-rail-tooltip"
            initial={{ opacity: 0, scale: 0.92, x: 8 }}
            animate={{ opacity: 1, scale: 1, x: 12 }}
            exit={{ opacity: 0, scale: 0.94, x: 8 }}
            transition={{
              ...springSnappy,
              delay: 0.25,
            }}
            style={{
              position: 'absolute',
              left: '100%',
              top: '50%',
              translateY: '-50%',
              padding: '6px 12px',
              borderRadius: '10px',
              background: 'rgba(20, 16, 50, 0.88)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255, 255, 255, 0.35)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
              color: '#ffffff',
              fontSize: '13px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              pointerEvents: 'none',
              zIndex: 100,
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
};
