import React, { useEffect, useRef } from 'react';
import { usePlayerStore } from '../store/usePlayerStore';
import { useSettingsStore } from '../store/useSettingsStore';

interface VisualizerProps {
  width?: number;
  height?: number;
  mode?: 'bars' | 'wave';
}

export const Visualizer: React.FC<VisualizerProps> = ({ width = 120, height = 36, mode = 'bars' }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analyserNode = usePlayerStore((s) => s.analyserNode);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const accentColor = useSettingsStore((s) => s.accentColor);
  const dominantColor = useSettingsStore((s) => s.dominantColor);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);

      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
      } else {
        // Subtle ambient idle pulse when paused
        const time = Date.now() / 1000;
        for (let i = 0; i < dataArray.length; i++) {
          dataArray[i] = Math.sin(time * 2 + i * 0.4) * 8 + 8;
        }
      }

      ctx.clearRect(0, 0, width, height);

      const color = dominantColor || accentColor || '#38bdf8';
      const numBars = 16;
      const barWidth = Math.max(2, (width / numBars) - 2);

      for (let i = 0; i < numBars; i++) {
        // Sample frequency buckets logarithmically
        const sampleIdx = Math.floor(Math.pow(i / numBars, 1.5) * (bufferLength / 3));
        const val = dataArray[sampleIdx] || 0;
        const barHeight = Math.max(3, (val / 255) * height);
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        const gradient = ctx.createLinearGradient(0, height, 0, y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0.9)');

        ctx.fillStyle = gradient;
        ctx.shadowColor = color;
        ctx.shadowBlur = isPlaying ? 8 : 2;

        // Rounded bar top
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [2, 2, 0, 0]);
        ctx.fill();
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [analyserNode, isPlaying, width, height, accentColor, dominantColor]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className="rounded-lg opacity-85 hover:opacity-100 transition-opacity"
      title="Real-time Audio Visualizer"
    />
  );
};
