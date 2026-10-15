import { create } from 'zustand';

// ====================================================================
// APPLE-STYLE MOTION TOKENS (macOS Sonoma / iOS 18)
// ====================================================================

export const DEFAULT_SPRING_SOFT = {
  type: 'spring' as const,
  stiffness: 260,
  damping: 26,
  mass: 1,
};

export const DEFAULT_SPRING_SNAPPY = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
  mass: 0.9,
};

export const DEFAULT_SPRING_BOUNCY = {
  type: 'spring' as const,
  stiffness: 520,
  damping: 24,
  mass: 0.8,
};

export const EASE_APPLE = [0.22, 1, 0.36, 1] as const;
export const EASE_APPLE_CSS = 'cubic-bezier(0.22, 1, 0.36, 1)';

export const DURATIONS = {
  micro: 0.12, // 120ms
  standard: 0.22, // 220ms
  large: 0.38, // 380ms
};

export const DURATIONS_MS = {
  micro: 120,
  standard: 220,
  large: 380,
};

export type AnimationMode = 'full' | 'reduced' | 'off';

interface MotionState {
  springSoft: typeof DEFAULT_SPRING_SOFT;
  springSnappy: typeof DEFAULT_SPRING_SNAPPY;
  springBouncy: typeof DEFAULT_SPRING_BOUNCY;
  sheenKey: number;
  triggerSheen: () => void;
  setSpringSoft: (val: Partial<typeof DEFAULT_SPRING_SOFT>) => void;
  setSpringSnappy: (val: Partial<typeof DEFAULT_SPRING_SNAPPY>) => void;
  setSpringBouncy: (val: Partial<typeof DEFAULT_SPRING_BOUNCY>) => void;
  resetDefaults: () => void;
}

export const useMotionStore = create<MotionState>((set) => ({
  springSoft: { ...DEFAULT_SPRING_SOFT },
  springSnappy: { ...DEFAULT_SPRING_SNAPPY },
  springBouncy: { ...DEFAULT_SPRING_BOUNCY },
  sheenKey: 0,
  triggerSheen: () => set((s) => ({ sheenKey: s.sheenKey + 1 })),
  setSpringSoft: (val) => set((s) => ({ springSoft: { ...s.springSoft, ...val } })),
  setSpringSnappy: (val) => set((s) => ({ springSnappy: { ...s.springSnappy, ...val } })),
  setSpringBouncy: (val) => set((s) => ({ springBouncy: { ...s.springBouncy, ...val } })),
  resetDefaults: () =>
    set({
      springSoft: { ...DEFAULT_SPRING_SOFT },
      springSnappy: { ...DEFAULT_SPRING_SNAPPY },
      springBouncy: { ...DEFAULT_SPRING_BOUNCY },
    }),
}));

/**
 * Returns dynamic spring / transition considering user preference
 */
export function getTransition(
  kind: 'soft' | 'snappy' | 'bouncy' | 'fade',
  mode: AnimationMode = 'full'
) {
  if (mode === 'off') {
    return { duration: 0 };
  }
  if (mode === 'reduced' || kind === 'fade') {
    return { duration: DURATIONS.micro, ease: EASE_APPLE };
  }

  const state = useMotionStore.getState();
  switch (kind) {
    case 'snappy':
      return state.springSnappy;
    case 'bouncy':
      return state.springBouncy;
    case 'soft':
    default:
      return state.springSoft;
  }
}
