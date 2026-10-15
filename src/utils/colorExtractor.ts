export async function extractDominantColor(imageSrc: string): Promise<string | null> {
  return new Promise((resolve) => {
    if (!imageSrc) return resolve(null);

    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);

        const sampleSize = 32;
        canvas.width = sampleSize;
        canvas.height = sampleSize;
        ctx.drawImage(img, 0, 0, sampleSize, sampleSize);

        const imageData = ctx.getImageData(0, 0, sampleSize, sampleSize);
        const data = imageData.data;

        let bestColor = { r: 56, g: 189, b: 248 }; // fallback sky blue
        let maxScore = -1;

        for (let i = 0; i < data.length; i += 16) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue; // Skip transparent

          // Calculate saturation and brightness
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const brightness = (r + g + b) / 3;

          // Prefer colors with medium brightness and good saturation
          if (brightness > 25 && brightness < 235 && delta > 25) {
            const saturation = max === 0 ? 0 : delta / max;
            const score = saturation * 1.5 + (1 - Math.abs(brightness - 130) / 130);
            if (score > maxScore) {
              maxScore = score;
              bestColor = { r, g, b };
            }
          }
        }

        resolve(`rgb(${bestColor.r}, ${bestColor.g}, ${bestColor.b})`);
      } catch (err) {
        console.warn('[ColorExtractor] Extraction failed:', err);
        resolve(null);
      }
    };

    img.onerror = () => resolve(null);
    img.src = imageSrc;
  });
}

// Deterministic gradient cover generator for tracks without album art
export function generateGradientCover(title: string, artist: string): string {
  const combined = (title + artist).toLowerCase();
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = (hash << 5) - hash + combined.charCodeAt(i);
    hash |= 0;
  }

  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45 + Math.abs((hash >> 3) % 90)) % 360;

  return `linear-gradient(135deg, hsl(${hue1}, 75%, 45%) 0%, hsl(${hue2}, 85%, 25%) 100%)`;
}
