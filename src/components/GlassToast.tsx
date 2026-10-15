import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToastStore } from '../store/useToastStore';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { DEFAULT_SPRING_SOFT } from '../motion';

export const GlassToast: React.FC = () => {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '104px',
        right: '24px',
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 16, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={DEFAULT_SPRING_SOFT}
              style={{
                pointerEvents: 'auto',
                minWidth: '280px',
                maxWidth: '420px',
                padding: '10px 14px',
                borderRadius: '16px',
                background: isError
                  ? 'rgba(40, 10, 15, 0.88)'
                  : isSuccess
                  ? 'rgba(15, 35, 20, 0.88)'
                  : 'rgba(28, 20, 48, 0.88)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: `1px solid ${
                  isError
                    ? 'rgba(255, 99, 132, 0.45)'
                    : isSuccess
                    ? 'rgba(110, 231, 183, 0.45)'
                    : isWarning
                    ? 'rgba(253, 224, 71, 0.45)'
                    : 'rgba(255, 255, 255, 0.35)'
                }`,
                boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div style={{ flexShrink: 0 }}>
                {isError ? (
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                ) : isSuccess ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                ) : (
                  <Info className="w-4 h-4 text-sky-400" />
                )}
              </div>

              <div style={{ flex: 1, fontSize: '13px', fontWeight: 500, lineHeight: 1.35 }}>
                {toast.message}
              </div>

              {toast.actionLabel && toast.onAction && (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    dismissToast(toast.id);
                  }}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    flexShrink: 0,
                  }}
                >
                  {toast.actionLabel}
                </button>
              )}

              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255,255,255,0.6)',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
