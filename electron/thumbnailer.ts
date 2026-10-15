import path from 'path';
import fs from 'fs';
import { videoService } from './videoService';

export interface VideoInfo {
  filePath: string;
  title: string;
  size: number;
  duration?: number;
  width?: number | null;
  height?: number | null;
  thumbnail?: string | null;
  codec?: string;
  isHdr?: boolean;
}

export function parseBasicVideoInfo(filePath: string): VideoInfo {
  const stats = fs.statSync(filePath);
  const title = path.basename(filePath, path.extname(filePath));
  return {
    filePath,
    title,
    size: stats.size,
  };
}

export async function parseVideoDetails(filePath: string): Promise<VideoInfo> {
  const basic = parseBasicVideoInfo(filePath);
  try {
    const probe = await videoService.probeMedia(filePath);
    const thumbPath = await videoService.generateThumbnail(filePath, probe.duration);
    let thumbnailData: string | null = null;
    if (thumbPath && fs.existsSync(thumbPath)) {
      const buffer = fs.readFileSync(thumbPath);
      thumbnailData = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    }

    return {
      ...basic,
      duration: probe.duration,
      width: probe.video?.width || null,
      height: probe.video?.height || null,
      thumbnail: thumbnailData,
      codec: probe.video?.codec,
      isHdr: probe.video?.isHdr,
    };
  } catch (e) {
    console.warn('[Thumbnailer] Error extracting video details:', e);
    return basic;
  }
}
