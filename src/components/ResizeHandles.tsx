import React from 'react';

type ResizeDirection =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

interface HandleDef {
  direction: ResizeDirection;
  className: string;
}

const HANDLES: HandleDef[] = [
  { direction: 'top', className: 'resize-handle resize-t' },
  { direction: 'bottom', className: 'resize-handle resize-b' },
  { direction: 'left', className: 'resize-handle resize-l' },
  { direction: 'right', className: 'resize-handle resize-r' },
  { direction: 'top-left', className: 'resize-handle resize-tl' },
  { direction: 'top-right', className: 'resize-handle resize-tr' },
  { direction: 'bottom-left', className: 'resize-handle resize-bl' },
  { direction: 'bottom-right', className: 'resize-handle resize-br' },
];

export const ResizeHandles: React.FC = () => {
  const handlePointerDown = (direction: ResizeDirection, e: React.PointerEvent) => {
    // Only respond to primary button (left click)
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const startMouseX = e.screenX;
    const startMouseY = e.screenY;

    if (!window.glassAPI?.getBounds || !window.glassAPI?.setBounds) return;

    window.glassAPI.getBounds().then((initialBounds) => {
      if (!initialBounds) return;

      const minWidth = 880;
      const minHeight = 580;

      const onPointerMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.screenX - startMouseX;
        const deltaY = moveEvent.screenY - startMouseY;

        let newWidth = initialBounds.width;
        let newHeight = initialBounds.height;
        let newX = initialBounds.x;
        let newY = initialBounds.y;

        // Horizontal sizing
        if (direction.includes('right')) {
          newWidth = Math.max(minWidth, initialBounds.width + deltaX);
        } else if (direction.includes('left')) {
          const rawWidth = initialBounds.width - deltaX;
          if (rawWidth >= minWidth) {
            newWidth = rawWidth;
            newX = initialBounds.x + deltaX;
          } else {
            newWidth = minWidth;
            newX = initialBounds.x + (initialBounds.width - minWidth);
          }
        }

        // Vertical sizing
        if (direction.includes('bottom')) {
          newHeight = Math.max(minHeight, initialBounds.height + deltaY);
        } else if (direction.includes('top')) {
          const rawHeight = initialBounds.height - deltaY;
          if (rawHeight >= minHeight) {
            newHeight = rawHeight;
            newY = initialBounds.y + deltaY;
          } else {
            newHeight = minHeight;
            newY = initialBounds.y + (initialBounds.height - minHeight);
          }
        }

        window.glassAPI.setBounds({
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newWidth),
          height: Math.round(newHeight),
        });
      };

      const onPointerUp = () => {
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerUp);
      };

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      window.addEventListener('pointercancel', onPointerUp);
    });
  };

  return (
    <>
      {HANDLES.map(({ direction, className }) => (
        <div
          key={direction}
          className={className}
          onPointerDown={(e) => handlePointerDown(direction, e)}
          aria-hidden="true"
        />
      ))}
    </>
  );
};
