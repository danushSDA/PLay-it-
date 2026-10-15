import { create } from 'zustand';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  showToast: (
    message: string,
    options?: {
      type?: 'info' | 'error' | 'success' | 'warning';
      actionLabel?: string;
      onAction?: () => void;
      duration?: number;
    }
  ) => void;
  dismissToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, options) => {
    const id = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const duration = options?.duration ?? 4000;
    const newToast: ToastItem = {
      id,
      message,
      type: options?.type || 'info',
      actionLabel: options?.actionLabel,
      onAction: options?.onAction,
      duration,
    };

    set((state) => ({ toasts: [...state.toasts.slice(-4), newToast] }));

    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  dismissToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));
