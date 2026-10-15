import React from 'react';
import { motion } from 'framer-motion';
import { DEFAULT_SPRING_BOUNCY, EASE_APPLE } from '../motion';

interface IconProps {
  isSelected: boolean;
  reducedMotion?: boolean;
}

export const MusicIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <motion.g
        animate={
          isSelected && !reducedMotion
            ? { y: [-2.5, 0] }
            : { y: 0 }
        }
        transition={{ duration: 0.28, ease: EASE_APPLE }}
      >
        <path d="M9 18V5l11-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="17" cy="16" r="3" />
      </motion.g>
    </svg>
  );
};

export const VideosIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <rect x="3" y="5" width="18" height="14" rx="3" />
      <motion.path
        d="M10 9l5 3-5 3z"
        style={{ transformOrigin: '12px 12px' }}
        animate={
          isSelected && !reducedMotion
            ? { scale: [0.85, 1] }
            : { scale: 1 }
        }
        transition={DEFAULT_SPRING_BOUNCY}
      />
    </svg>
  );
};

export const AlbumsIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <motion.svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible', transformOrigin: '12px 12px' }}
      animate={
        isSelected && !reducedMotion
          ? { rotate: [0, 90] }
          : { rotate: 0 }
      }
      transition={{ duration: 0.32, ease: EASE_APPLE }}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 3v3M12 18v3" opacity="0.6" />
    </motion.svg>
  );
};

export const ArtistsIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <motion.circle
        cx="12"
        cy="8"
        r="4"
        animate={
          isSelected && !reducedMotion
            ? { pathLength: [0, 1], opacity: [0.4, 1] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={{ duration: 0.3, ease: EASE_APPLE }}
      />
      <motion.path
        d="M4 21c1-4 4-6 8-6s7 2 8 6"
        animate={
          isSelected && !reducedMotion
            ? { pathLength: [0, 1], opacity: [0.4, 1] }
            : { pathLength: 1, opacity: 1 }
        }
        transition={{ duration: 0.35, ease: EASE_APPLE, delay: 0.05 }}
      />
    </svg>
  );
};

export const PlaylistsIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <motion.path
        d="M4 6h16"
        animate={
          isSelected && !reducedMotion
            ? { pathLength: [0.2, 1] }
            : { pathLength: 1 }
        }
        transition={{ duration: 0.22, ease: EASE_APPLE }}
      />
      <motion.path
        d="M4 12h16"
        animate={
          isSelected && !reducedMotion
            ? { pathLength: [0.2, 1] }
            : { pathLength: 1 }
        }
        transition={{ duration: 0.26, ease: EASE_APPLE, delay: 0.04 }}
      />
      <motion.path
        d="M4 18h9"
        animate={
          isSelected && !reducedMotion
            ? { pathLength: [0.2, 1] }
            : { pathLength: 1 }
        }
        transition={{ duration: 0.3, ease: EASE_APPLE, delay: 0.08 }}
      />
    </svg>
  );
};

export const FavoritesIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      <motion.path
        d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"
        style={{ transformOrigin: '12px 12px' }}
        fill={isSelected ? 'currentColor' : 'none'}
        animate={
          isSelected && !reducedMotion
            ? { scale: [1, 1.25, 1] }
            : { scale: 1 }
        }
        transition={DEFAULT_SPRING_BOUNCY}
      />
    </svg>
  );
};

export const SettingsIcon: React.FC<IconProps> = ({ isSelected, reducedMotion }) => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ overflow: 'visible' }}
    >
      {/* Three slider tracks with knobs that slide */}
      <line x1="4" y1="6" x2="20" y2="6" opacity="0.6" />
      <motion.circle
        cy="6"
        r="2.5"
        fill="currentColor"
        animate={
          isSelected && !reducedMotion
            ? { cx: [8, 14] }
            : { cx: isSelected ? 14 : 8 }
        }
        transition={{ duration: 0.3, ease: EASE_APPLE }}
      />

      <line x1="4" y1="12" x2="20" y2="12" opacity="0.6" />
      <motion.circle
        cy="12"
        r="2.5"
        fill="currentColor"
        animate={
          isSelected && !reducedMotion
            ? { cx: [16, 10] }
            : { cx: isSelected ? 10 : 16 }
        }
        transition={{ duration: 0.3, ease: EASE_APPLE, delay: 0.04 }}
      />

      <line x1="4" y1="18" x2="20" y2="18" opacity="0.6" />
      <motion.circle
        cy="18"
        r="2.5"
        fill="currentColor"
        animate={
          isSelected && !reducedMotion
            ? { cx: [9, 15] }
            : { cx: isSelected ? 15 : 9 }
        }
        transition={{ duration: 0.3, ease: EASE_APPLE, delay: 0.08 }}
      />
    </svg>
  );
};

export const FoldersIcon: React.FC<IconProps> = () => {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
};
