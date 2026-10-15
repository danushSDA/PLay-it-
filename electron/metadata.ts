import * as mm from 'music-metadata';
import path from 'path';
import fs from 'fs';

export interface ParsedAudioMetadata {
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number;
  bitrate: number | null;
  sampleRate: number | null;
  coverArt: string | null;
}

export async function parseAudioFile(filePath: string): Promise<ParsedAudioMetadata> {
  const fallbackTitle = path.basename(filePath, path.extname(filePath));

  try {
    const metadata = await mm.parseFile(filePath, { duration: true, skipCovers: false });
    
    let coverArt: string | null = null;
    if (metadata.common.picture && metadata.common.picture.length > 0) {
      const pic = metadata.common.picture[0];
      const base64Data = Buffer.from(pic.data).toString('base64');
      const mime = pic.format || 'image/jpeg';
      coverArt = `data:${mime};base64,${base64Data}`;
    }

    return {
      title: metadata.common.title?.trim() || fallbackTitle,
      artist: metadata.common.artist?.trim() || metadata.common.albumartist?.trim() || 'Unknown Artist',
      album: metadata.common.album?.trim() || 'Unknown Album',
      genre: metadata.common.genre?.join(', ') || '',
      year: metadata.common.year || null,
      duration: metadata.format.duration || 0,
      bitrate: metadata.format.bitrate || null,
      sampleRate: metadata.format.sampleRate || null,
      coverArt,
    };
  } catch (error) {
    console.warn(`[Metadata] Failed to parse tags for ${filePath}, using fallback:`, error);
    return {
      title: fallbackTitle,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      genre: '',
      year: null,
      duration: 0,
      bitrate: null,
      sampleRate: null,
      coverArt: null,
    };
  }
}

export function scanDirectoryRecursively(dirPath: string, extensions: string[]): string[] {
  let results: string[] = [];
  try {
    const list = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const dirent of list) {
      const fullPath = path.join(dirPath, dirent.name);
      if (dirent.isDirectory()) {
        results = results.concat(scanDirectoryRecursively(fullPath, extensions));
      } else if (dirent.isFile()) {
        const ext = path.extname(dirent.name).toLowerCase();
        if (extensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error(`[Scanner] Error reading directory ${dirPath}:`, err);
  }
  return results;
}
