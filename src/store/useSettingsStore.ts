import { create } from 'zustand';
import { AppSettings } from '../types';

interface SettingsState extends AppSettings {
  dominantColor: string | null;
  setAccentColor: (color: string) => void;
  setBlurStrength: (blur: number) => void;
  setGlassOpacity: (opacity: number) => void;
  setEnableVisualizer: (enable: boolean) => void;
  setReduceTransparency: (reduce: boolean) => void;
  setThemeMode: (mode: 'dark' | 'light') => void;
  setTheme: (theme: 'deepsea' | 'citrus' | 'night' | 'pastel') => void;
  setUseWindowsAcrylic: (use: boolean) => void;
  setAnimationPreference: (pref: 'full' | 'reduced' | 'off') => void;
  setDominantColor: (color: string | null) => void;
  setAmbientLight: (settings: Partial<AppSettings['ambientLight']>) => void;
  loadSettings: () => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  accentColor: '#38d9ff', // Deep Sea Oceanic Teal accent
  blurStrength: 32,
  glassOpacity: 0.42,
  enableVisualizer: true,
  reduceTransparency: false,
  themeMode: 'dark',
  theme: 'deepsea', // Default theme is Deep Sea
  useWindowsAcrylic: false,
  animationPreference: 'full',
  dominantColor: null,
  sleepTimerMinutes: null,
  ambientLight: {
    enabled: true,
    preset: 'cinematic',
    blur: 64,
    opacity: 0.85,
    dynamicSampling: true,
    wideMediumScreen: true,
    saturation: 1.6,
  },

  setAccentColor: (accentColor) => {
    set({ accentColor });
    window.glassAPI?.saveSetting?.('accentColor', accentColor);
  },

  setBlurStrength: (blurStrength) => {
    set({ blurStrength });
    window.glassAPI?.saveSetting?.('blurStrength', blurStrength);
  },

  setGlassOpacity: (glassOpacity) => {
    set({ glassOpacity });
    window.glassAPI?.saveSetting?.('glassOpacity', glassOpacity);
  },

  setEnableVisualizer: (enableVisualizer) => {
    set({ enableVisualizer });
    window.glassAPI?.saveSetting?.('enableVisualizer', enableVisualizer);
  },

  setReduceTransparency: (reduceTransparency) => {
    set({ reduceTransparency });
    window.glassAPI?.saveSetting?.('reduceTransparency', reduceTransparency);
  },

  setThemeMode: (themeMode) => {
    set({ themeMode });
    window.glassAPI?.saveSetting?.('themeMode', themeMode);
  },

  setTheme: (theme) => {
    set({ theme });
    window.glassAPI?.saveSetting?.('theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  },

  setUseWindowsAcrylic: (useWindowsAcrylic) => {
    set({ useWindowsAcrylic });
    window.glassAPI?.setAcrylicMode?.(useWindowsAcrylic);
  },

  setAnimationPreference: (animationPreference) => {
    set({ animationPreference });
    window.glassAPI?.saveSetting?.('animationPreference', animationPreference);
  },

  setDominantColor: (dominantColor) => set({ dominantColor }),

  setAmbientLight: (partial) => {
    const current = get().ambientLight || {
      enabled: true,
      preset: 'cinematic',
      blur: 64,
      opacity: 0.85,
      dynamicSampling: true,
      wideMediumScreen: true,
      saturation: 1.6,
    };
    const updated = { ...current, ...partial };
    set({ ambientLight: updated });
    window.glassAPI?.saveSetting?.('ambientLight', updated);
  },

  loadSettings: async () => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', get().theme);
    }
    if (!window.glassAPI?.getSettings) return;
    try {
      const saved = await window.glassAPI.getSettings();
      if (saved) {
        const theme = (saved.theme as 'deepsea' | 'citrus' | 'night' | 'pastel') || get().theme;
        set({
          accentColor: saved.accentColor || get().accentColor,
          blurStrength: typeof saved.blurStrength === 'number' ? saved.blurStrength : get().blurStrength,
          glassOpacity: typeof saved.glassOpacity === 'number' ? saved.glassOpacity : get().glassOpacity,
          enableVisualizer: typeof saved.enableVisualizer === 'boolean' ? saved.enableVisualizer : get().enableVisualizer,
          reduceTransparency: typeof saved.reduceTransparency === 'boolean' ? saved.reduceTransparency : get().reduceTransparency,
          themeMode: saved.themeMode || get().themeMode,
          theme,
          useWindowsAcrylic: typeof saved.useWindowsAcrylic === 'boolean' ? saved.useWindowsAcrylic : false,
          animationPreference: saved.animationPreference || 'full',
          ambientLight: saved.ambientLight ? { ...get().ambientLight, ...saved.ambientLight } : get().ambientLight,
        });
        if (typeof document !== 'undefined') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      }
    } catch (e) {
      console.warn('[SettingsStore] Failed to load settings:', e);
    }
  },
}));
