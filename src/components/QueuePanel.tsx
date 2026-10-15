import React from 'react';
import { X, Trash2, Music, Play } from 'lucide-react';
import { usePlayerStore } from '../store/usePlayerStore';

export const QueuePanel: React.FC = () => {
  const {
    isQueueOpen,
    toggleQueueOpen,
    queue,
    queueIndex,
    currentTrack,
    playTrack,
    removeFromQueue,
    clearQueue,
  } = usePlayerStore();

  if (!isQueueOpen) return null;

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const totalDuration = queue.reduce((acc, t) => acc + (t.duration || 0), 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 900,
        display: 'flex',
        justifyContent: 'flex-end',
        background: 'rgba(0, 0, 0, 0.25)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      }}
      onClick={toggleQueueOpen}
    >
      <div
        style={{
          width: '340px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px',
          background: 'var(--theme-card-bg)',
          backdropFilter: 'blur(28px) saturate(190%)',
          WebkitBackdropFilter: 'blur(28px) saturate(190%)',
          borderLeft: '1px solid var(--theme-card-border)',
          boxShadow: '-8px 0 32px rgba(120, 60, 10, 0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '16px',
            borderBottom: '1px solid rgba(43, 22, 8, 0.08)',
            marginBottom: '16px',
          }}
        >
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text)', margin: 0 }}>
              Play Queue
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--theme-text-sub)', margin: '2px 0 0' }}>
              {queue.length} tracks · {formatDuration(totalDuration)}
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {queue.length > 0 && (
              <button
                type="button"
                onClick={clearQueue}
                style={{
                  padding: '6px',
                  borderRadius: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--theme-text-sub)',
                  cursor: 'pointer',
                }}
                title="Clear queue"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={toggleQueueOpen}
              style={{
                padding: '6px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: 'var(--theme-text)',
                cursor: 'pointer',
              }}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Queue Items */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            scrollbarWidth: 'none',
          }}
        >
          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--theme-text-sub)' }}>
              <Music className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p style={{ fontSize: '14px', fontWeight: 600 }}>Queue is empty</p>
              <p style={{ fontSize: '12px' }}>Songs you play will appear here.</p>
            </div>
          ) : (
            queue.map((track, idx) => {
              const isCurrent = currentTrack ? currentTrack.id === track.id : idx === queueIndex;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '12px',
                    background: isCurrent ? 'var(--accent-tint)' : 'transparent',
                    border: isCurrent ? '1px solid var(--accent-color)' : '1px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #FF9A1F, #FF5E62)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#ffffff',
                      flexShrink: 0,
                    }}
                  >
                    {isCurrent ? <Play className="w-3.5 h-3.5 fill-current" /> : <Music className="w-3.5 h-3.5" />}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'var(--theme-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {track.title}
                    </div>
                    <div
                      style={{
                        fontSize: '11px',
                        color: 'var(--theme-text-sub)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {track.artist}
                    </div>
                  </div>

                  <span style={{ fontSize: '11px', color: 'var(--theme-text-sub)', fontVariantNumeric: 'tabular-nums' }}>
                    {formatDuration(track.duration)}
                  </span>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromQueue(idx);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--theme-text-sub)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
