import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { spawn, execFile } from 'child_process';
import crypto from 'crypto';

// Resolve ffmpeg and ffprobe paths
let ffmpegPath: string = '';
let ffprobePath: string = '';

try {
  ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
} catch (e) {
  console.warn('[VideoService] Failed to load @ffmpeg-installer/ffmpeg:', e);
}

try {
  ffprobePath = require('@ffprobe-installer/ffprobe').path;
} catch (e) {
  console.warn('[VideoService] Failed to load @ffprobe-installer/ffprobe:', e);
}

export interface AudioTrackInfo {
  id: number;
  index: number;
  streamIndex: number;
  codec: string;
  language: string;
  title: string;
  channels: number;
  channelLayout: string;
  sampleRate: number;
  bitRate: number | null;
  isDefault: boolean;
}

export interface SubtitleTrackInfo {
  id: number;
  index: number;
  streamIndex: number;
  codec: string;
  language: string;
  title: string;
  isDefault: boolean;
  isExternal?: boolean;
  filePath?: string;
}

export interface VideoStreamInfo {
  codec: string;
  codecLongName: string;
  profile: string;
  width: number;
  height: number;
  fps: number;
  bitRate: number | null;
  pixelFormat: string;
  colorSpace: string;
  colorTransfer: string;
  colorPrimaries: string;
  isHdr: boolean;
  resolutionLabel: string; // '4K UHD' | '1440p' | '1080p' | '720p' | 'SD'
}

export interface MediaProbeResult {
  filePath: string;
  container: string;
  duration: number;
  fileSize: number;
  overallBitrate: number | null;
  video: VideoStreamInfo | null;
  audioTracks: AudioTrackInfo[];
  subtitleTracks: SubtitleTrackInfo[];
  suggestedTier: 'direct' | 'remux' | 'transcode';
  reason: string;
  isCorrupted: boolean;
  hasDrm: boolean;
  errorMessage?: string;
}

export interface PlaybackSession {
  filePath: string;
  tier: 'direct' | 'remux' | 'transcode';
  streamUrl: string;
  probe: MediaProbeResult;
  activeAudioTrackIndex: number;
  cachedFilePath?: string;
  isReady: boolean;
}

class VideoService {
  private cacheDir: string = '';
  private thumbsDir: string = '';
  private activeProcesses: Map<string, any> = new Map();
  private hwEncoder: string = 'libx264';
  private checkedHwEncoders: boolean = false;

  constructor() {
    this.initDirectories();
  }

  private initDirectories() {
    const userData = app ? app.getPath('userData') : process.cwd();
    this.cacheDir = path.join(userData, 'video_cache');
    this.thumbsDir = path.join(userData, 'thumbnails');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
    if (!fs.existsSync(this.thumbsDir)) {
      fs.mkdirSync(this.thumbsDir, { recursive: true });
    }
  }

  public getFfmpegPath(): string {
    return ffmpegPath;
  }

  public getFfprobePath(): string {
    return ffprobePath;
  }

  public getCacheDir(): string {
    return this.cacheDir;
  }

  /**
   * Detect best available H.264 encoder (NVENC > QSV > AMF > libx264)
   */
  public async detectHardwareEncoder(): Promise<string> {
    if (this.checkedHwEncoders) return this.hwEncoder;

    const candidates = ['h264_nvenc', 'h264_qsv', 'h264_amf', 'libx264'];
    for (const enc of candidates) {
      if (enc === 'libx264') {
        this.hwEncoder = 'libx264';
        break;
      }
      const supported = await new Promise<boolean>((resolve) => {
        const proc = spawn(ffmpegPath, ['-f', 'lavfi', '-i', 'color=c=black:s=256x256:d=0.1', '-c:v', enc, '-f', 'null', '-'], {
          windowsHide: true,
        });
        proc.on('close', (code) => resolve(code === 0));
        proc.on('error', () => resolve(false));
      });
      if (supported) {
        this.hwEncoder = enc;
        console.log(`[VideoService] Hardware accelerated video encoder found: ${enc}`);
        break;
      }
    }

    this.checkedHwEncoders = true;
    return this.hwEncoder;
  }

  /**
   * Run ffprobe on any media file and extract structured video, audio, and subtitle streams
   */
  public async probeMedia(filePath: string): Promise<MediaProbeResult> {
    if (!fs.existsSync(filePath)) {
      return {
        filePath,
        container: '',
        duration: 0,
        fileSize: 0,
        overallBitrate: null,
        video: null,
        audioTracks: [],
        subtitleTracks: [],
        suggestedTier: 'direct',
        reason: 'File not found on disk',
        isCorrupted: true,
        hasDrm: false,
        errorMessage: 'The selected file does not exist or has been moved.',
      };
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

    return new Promise((resolve) => {
      execFile(
        ffprobePath,
        ['-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', filePath],
        { maxBuffer: 10 * 1024 * 1024, windowsHide: true },
        async (error, stdout) => {
          if (error || !stdout) {
            console.warn('[VideoService] ffprobe failed for', filePath, error);
            return resolve({
              filePath,
              container: path.extname(filePath).replace('.', '').toLowerCase(),
              duration: 0,
              fileSize,
              overallBitrate: null,
              video: null,
              audioTracks: [],
              subtitleTracks: [],
              suggestedTier: 'transcode',
              reason: 'Probe failed - file may be corrupted',
              isCorrupted: true,
              hasDrm: false,
              errorMessage: 'Could not read video streams. The file might be corrupted or in an unsupported proprietary format.',
            });
          }

          try {
            const data = JSON.parse(stdout);
            const format = data.format || {};
            const streams: any[] = data.streams || [];

            // Check for DRM flags (Apple FairPlay, Microsoft PlayReady, Widevine, encv/enca)
            let hasDrm = false;
            const containerName = (format.format_name || '').toLowerCase();
            if (
              containerName.includes('drm') ||
              streams.some((s) => s.codec_tag_string === 'encv' || s.codec_tag_string === 'enca' || s.codec_name === 'drmi')
            ) {
              hasDrm = true;
            }

            // Extract Video Stream
            let video: VideoStreamInfo | null = null;
            const videoStream = streams.find((s) => s.codec_type === 'video');
            if (videoStream) {
              const width = parseInt(videoStream.width || '0', 10);
              const height = parseInt(videoStream.height || '0', 10);
              const codec = (videoStream.codec_name || '').toLowerCase();
              const codecLong = videoStream.codec_long_name || codec;
              const profile = videoStream.profile || '';
              const pixFmt = videoStream.pix_fmt || '';
              const colorSpace = videoStream.color_space || '';
              const colorTransfer = videoStream.color_transfer || '';
              const colorPrimaries = videoStream.color_primaries || '';

              // HDR10 detection (SMPTE 2084 PQ or ARIB STD-B67 HLG or BT.2020)
              const isHdr =
                colorTransfer.includes('smpte2084') ||
                colorTransfer.includes('arib-std-b67') ||
                colorPrimaries.includes('bt2020') ||
                pixFmt.includes('10');

              // FPS calculation
              let fps = 30;
              if (videoStream.r_frame_rate) {
                const parts = videoStream.r_frame_rate.split('/');
                if (parts.length === 2 && parseInt(parts[1], 10) > 0) {
                  fps = Math.round((parseInt(parts[0], 10) / parseInt(parts[1], 10)) * 100) / 100;
                }
              }

              // Resolution category
              let resolutionLabel = 'SD';
              if (width >= 3800 || height >= 2100) resolutionLabel = '4K UHD';
              else if (width >= 2500 || height >= 1400) resolutionLabel = '1440p';
              else if (width >= 1900 || height >= 1000) resolutionLabel = '1080p';
              else if (width >= 1200 || height >= 700) resolutionLabel = '720p';

              video = {
                codec,
                codecLongName: codecLong,
                profile,
                width,
                height,
                fps,
                bitRate: videoStream.bit_rate ? parseInt(videoStream.bit_rate, 10) : null,
                pixelFormat: pixFmt,
                colorSpace,
                colorTransfer,
                colorPrimaries,
                isHdr,
                resolutionLabel,
              };
            }

            // Extract Audio Streams
            const audioTracks: AudioTrackInfo[] = [];
            let aIdx = 0;
            streams.forEach((s) => {
              if (s.codec_type === 'audio') {
                const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
                const title = s.tags?.title || s.tags?.TITLE || `Track ${aIdx + 1} (${lang})`;
                audioTracks.push({
                  id: aIdx,
                  index: aIdx,
                  streamIndex: s.index,
                  codec: (s.codec_name || '').toLowerCase(),
                  language: lang,
                  title,
                  channels: s.channels || 2,
                  channelLayout: s.channel_layout || (s.channels === 6 ? '5.1' : s.channels === 1 ? 'mono' : 'stereo'),
                  sampleRate: parseInt(s.sample_rate || '44100', 10),
                  bitRate: s.bit_rate ? parseInt(s.bit_rate, 10) : null,
                  isDefault: !!s.disposition?.default,
                });
                aIdx++;
              }
            });

            // Extract Subtitle Streams
            const subtitleTracks: SubtitleTrackInfo[] = [];
            let sIdx = 0;
            streams.forEach((s) => {
              if (s.codec_type === 'subtitle') {
                const lang = s.tags?.language || s.tags?.LANGUAGE || 'und';
                const title = s.tags?.title || s.tags?.TITLE || `Subtitle ${sIdx + 1} (${lang})`;
                subtitleTracks.push({
                  id: sIdx,
                  index: sIdx,
                  streamIndex: s.index,
                  codec: (s.codec_name || '').toLowerCase(),
                  language: lang,
                  title,
                  isDefault: !!s.disposition?.default,
                  isExternal: false,
                });
                sIdx++;
              }
            });

            // Scan directory for external subtitle files
            const externalSubs = this.scanExternalSubtitles(filePath);
            subtitleTracks.push(...externalSubs);

            const duration = parseFloat(format.duration || '0');
            const overallBitrate = format.bit_rate ? parseInt(format.bit_rate, 10) : null;

            // Determine Smart 3-Tier Strategy
            const { tier, reason } = this.decidePlaybackTier(filePath, containerName, video, audioTracks);

            resolve({
              filePath,
              container: path.extname(filePath).replace('.', '').toLowerCase(),
              duration,
              fileSize,
              overallBitrate,
              video,
              audioTracks,
              subtitleTracks,
              suggestedTier: tier,
              reason,
              isCorrupted: !video && audioTracks.length === 0,
              hasDrm,
              errorMessage: hasDrm ? 'This media file is DRM protected and cannot be played without proprietary license keys.' : undefined,
            });
          } catch (err: any) {
            console.error('[VideoService] Parse error in probe output:', err);
            resolve({
              filePath,
              container: path.extname(filePath).replace('.', '').toLowerCase(),
              duration: 0,
              fileSize,
              overallBitrate: null,
              video: null,
              audioTracks: [],
              subtitleTracks: [],
              suggestedTier: 'transcode',
              reason: 'Error parsing media stream metadata',
              isCorrupted: true,
              hasDrm: false,
              errorMessage: 'Failed to read media streams: ' + err.message,
            });
          }
        }
      );
    });
  }

  /**
   * Decision engine for the 3-tier playback pipeline
   */
  private decidePlaybackTier(
    filePath: string,
    container: string,
    video: VideoStreamInfo | null,
    audioTracks: AudioTrackInfo[]
  ): { tier: 'direct' | 'remux' | 'transcode'; reason: string } {
    const ext = path.extname(filePath).toLowerCase();

    // Direct Play supported containers in Chromium
    const chromiumContainers = ['.mp4', '.m4v', '.webm', '.ogv'];
    // Direct Play supported video codecs in Chromium
    const chromiumVideoCodecs = ['h264', 'vp8', 'vp9', 'av1'];
    // Direct Play supported audio codecs in Chromium
    const chromiumAudioCodecs = ['aac', 'mp3', 'opus', 'vorbis', 'flac'];

    if (!video) {
      return { tier: 'direct', reason: 'Audio-only or unrecognized stream' };
    }

    const videoCodec = video.codec.toLowerCase();
    const isVideoChromium = chromiumVideoCodecs.includes(videoCodec);

    const primaryAudio = audioTracks[0];
    const isAudioChromium = !primaryAudio || chromiumAudioCodecs.includes(primaryAudio.codec.toLowerCase());

    const isContainerChromium = chromiumContainers.includes(ext);

    // Tier 1: Direct Play
    // Chromium natively plays MP4/WebM with H.264/VP9/AV1 and AAC/MP3/Opus/FLAC
    if (isContainerChromium && isVideoChromium && isAudioChromium && !video.isHdr) {
      return {
        tier: 'direct',
        reason: `Direct play: container (${ext}) and codecs (${videoCodec}/${primaryAudio?.codec || 'none'}) natively supported by Chromium.`,
      };
    }

    // Tier 2: Remux
    // Codecs are natively supported, but container is MKV, AVI, MOV, TS, etc.
    // Or audio track count requires remuxing container.
    // Fast copy packets without re-encoding!
    if (isVideoChromium && isAudioChromium && !video.isHdr) {
      return {
        tier: 'remux',
        reason: `Remux: codecs (${videoCodec}/${primaryAudio?.codec}) are supported, but container (${ext}) requires repackaging to MP4 with stream copy (-c copy).`,
      };
    }

    // Tier 3: Transcode
    // Codec is unsupported (HEVC, MPEG-2, MPEG-4 part 2, ProRes, WMV, VC-1)
    // or audio is unsupported (AC3, EAC3, DTS)
    // or HDR10 requires tone mapping to SDR.
    const reasons: string[] = [];
    if (!isVideoChromium) reasons.push(`unsupported video codec ${videoCodec.toUpperCase()}`);
    if (!isAudioChromium && primaryAudio) reasons.push(`unsupported audio codec ${primaryAudio.codec.toUpperCase()}`);
    if (video.isHdr) reasons.push('HDR10 tone-mapping to SDR needed');

    return {
      tier: 'transcode',
      reason: `Transcode: ${reasons.join(', ')}. Transcoding on the fly to H.264 / AAC.`,
    };
  }

  /**
   * Scan directory for subtitle files matching the video base name
   */
  public scanExternalSubtitles(videoPath: string): SubtitleTrackInfo[] {
    const list: SubtitleTrackInfo[] = [];
    try {
      const dir = path.dirname(videoPath);
      const baseName = path.basename(videoPath, path.extname(videoPath)).toLowerCase();
      const files = fs.readdirSync(dir);

      const subExts = ['.srt', '.vtt', '.ass', '.ssa'];
      let idx = 100;

      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (subExts.includes(ext)) {
          const lowerF = f.toLowerCase();
          if (lowerF.startsWith(baseName)) {
            const subPath = path.join(dir, f);
            // Deduce language from filename (e.g. movie.en.srt -> en)
            const parts = f.slice(baseName.length, -ext.length).replace(/^[._-]/, '');
            const lang = parts.length > 0 ? parts : 'External';
            list.push({
              id: idx,
              index: idx,
              streamIndex: -1,
              codec: ext.replace('.', ''),
              language: lang,
              title: `${f} (${lang})`,
              isDefault: false,
              isExternal: true,
              filePath: subPath,
            });
            idx++;
          }
        }
      }
    } catch (e) {
      console.warn('[VideoService] Error scanning external subtitles:', e);
    }
    return list;
  }

  /**
   * Generate high-quality video thumbnail using FFmpeg
   */
  public async generateThumbnail(filePath: string, duration = 0): Promise<string | null> {
    const hash = crypto.createHash('md5').update(filePath).digest('hex');
    const thumbFile = path.join(this.thumbsDir, `${hash}.jpg`);

    if (fs.existsSync(thumbFile)) {
      return thumbFile;
    }

    const seekTime = duration > 10 ? Math.min(10, Math.floor(duration * 0.15)) : Math.max(1, Math.floor(duration * 0.5));
    const timeStr = `${Math.floor(seekTime / 60)}:${(seekTime % 60).toString().padStart(2, '0')}`;

    return new Promise((resolve) => {
      execFile(
        ffmpegPath,
        [
          '-y',
          '-ss',
          timeStr,
          '-i',
          filePath,
          '-vframes',
          '1',
          '-vf',
          'scale=480:-1',
          '-q:v',
          '2',
          thumbFile,
        ],
        { windowsHide: true },
        (err) => {
          if (err || !fs.existsSync(thumbFile)) {
            // Fallback at frame 0
            execFile(
              ffmpegPath,
              ['-y', '-ss', '00:00:01', '-i', filePath, '-vframes', '1', '-vf', 'scale=480:-1', '-q:v', '3', thumbFile],
              { windowsHide: true },
              (err2) => {
                if (err2 || !fs.existsSync(thumbFile)) {
                  resolve(null);
                } else {
                  resolve(thumbFile);
                }
              }
            );
          } else {
            resolve(thumbFile);
          }
        }
      );
    });
  }

  /**
   * Extract embedded subtitle stream to WebVTT file in cache
   */
  public async extractSubtitlesToVtt(filePath: string, streamIndex: number): Promise<string | null> {
    const hash = crypto.createHash('md5').update(`${filePath}:${streamIndex}`).digest('hex');
    const vttFile = path.join(this.cacheDir, `sub_${hash}.vtt`);

    if (fs.existsSync(vttFile)) {
      return vttFile;
    }

    return new Promise((resolve) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', filePath, '-map', `0:${streamIndex}`, '-f', 'webvtt', vttFile],
        { windowsHide: true },
        (err) => {
          if (err || !fs.existsSync(vttFile)) {
            console.warn('[VideoService] Subtitle extraction failed:', err);
            resolve(null);
          } else {
            resolve(vttFile);
          }
        }
      );
    });
  }

  /**
   * Convert external subtitle (.srt, .ass) to clean WebVTT in cache
   */
  public async convertExternalSubToVtt(subFilePath: string): Promise<string | null> {
    const ext = path.extname(subFilePath).toLowerCase();
    if (ext === '.vtt') return subFilePath;

    const hash = crypto.createHash('md5').update(subFilePath).digest('hex');
    const vttFile = path.join(this.cacheDir, `ext_${hash}.vtt`);

    if (fs.existsSync(vttFile)) {
      return vttFile;
    }

    return new Promise((resolve) => {
      execFile(
        ffmpegPath,
        ['-y', '-i', subFilePath, '-f', 'webvtt', vttFile],
        { windowsHide: true },
        (err) => {
          if (err || !fs.existsSync(vttFile)) {
            console.warn('[VideoService] Subtitle conversion failed:', err);
            resolve(null);
          } else {
            resolve(vttFile);
          }
        }
      );
    });
  }

  /**
   * Tier 2 Remux: Repackage streams into faststart MP4 container with -c copy
   */
  public async remuxToMp4(
    filePath: string,
    audioTrackIndex: number = 0,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const hash = crypto.createHash('md5').update(`${filePath}:remux:a${audioTrackIndex}`).digest('hex');
    const outputFile = path.join(this.cacheDir, `remux_${hash}.mp4`);

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 1024) {
      return outputFile;
    }

    // Terminate any existing job for this file
    this.killActiveProcess(hash);

    const hwEnc = await this.detectHardwareEncoder();
    console.log(`[VideoService] Remuxing ${filePath} to ${outputFile} (audio track ${audioTrackIndex})`);

    const args = [
      '-y',
      '-i',
      filePath,
      '-map',
      '0:v:0',
      '-map',
      `0:a:${audioTrackIndex}`,
      '-c',
      'copy',
      '-movflags',
      '+faststart',
      outputFile,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { windowsHide: true });
      this.activeProcesses.set(hash, proc);

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        // Parse time or progress
        if (onProgress && text.includes('time=')) {
          onProgress(50);
        }
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(hash);
        if (code === 0 && fs.existsSync(outputFile)) {
          resolve(outputFile);
        } else {
          // If -c copy failed due to incompatible audio or timestamp issues, fallback to AAC audio transcode
          console.warn('[VideoService] Stream copy remux failed, retrying with copy video and AAC audio...');
          this.remuxWithAudioTranscode(filePath, audioTrackIndex, outputFile)
            .then(resolve)
            .catch(reject);
        }
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(hash);
        reject(err);
      });
    });
  }

  private async remuxWithAudioTranscode(filePath: string, audioTrackIndex: number, outputFile: string): Promise<string> {
    const args = [
      '-y',
      '-i',
      filePath,
      '-map',
      '0:v:0',
      '-map',
      `0:a:${audioTrackIndex}`,
      '-c:v',
      'copy',
      '-c:a',
      'aac',
      '-b:a',
      '192k',
      '-movflags',
      '+faststart',
      outputFile,
    ];

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { windowsHide: true });
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputFile)) {
          resolve(outputFile);
        } else {
          reject(new Error(`Remux with audio transcode exited with code ${code}`));
        }
      });
      proc.on('error', reject);
    });
  }

  /**
   * Tier 3 Transcode: Convert unsupported codecs / HDR to H.264/AAC MP4 with HW acceleration
   */
  public async transcodeToMp4(
    filePath: string,
    audioTrackIndex: number = 0,
    isHdr: boolean = false,
    startTime: number = 0,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    const hash = crypto.createHash('md5').update(`${filePath}:transcode:a${audioTrackIndex}:hdr${isHdr}:s${startTime}`).digest('hex');
    const outputFile = path.join(this.cacheDir, `transcode_${hash}.mp4`);

    if (fs.existsSync(outputFile) && fs.statSync(outputFile).size > 1024) {
      return outputFile;
    }

    this.killActiveProcess(hash);
    const encoder = await this.detectHardwareEncoder();
    console.log(`[VideoService] Transcoding ${filePath} using encoder ${encoder} (HDR tone map: ${isHdr})`);

    const args: string[] = ['-y'];

    if (startTime > 0) {
      args.push('-ss', startTime.toString());
    }

    args.push('-i', filePath);
    args.push('-map', '0:v:0', '-map', `0:a:${audioTrackIndex}`);

    // Video Encoder & Filter
    if (encoder === 'h264_nvenc') {
      args.push('-c:v', 'h264_nvenc', '-preset', 'p4', '-cq', '22');
    } else if (encoder === 'h264_qsv') {
      args.push('-c:v', 'h264_qsv', '-global_quality', '23');
    } else if (encoder === 'h264_amf') {
      args.push('-c:v', 'h264_amf', '-quality', 'balanced');
    } else {
      args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22');
    }

    // Tone map HDR10 to SDR if needed
    if (isHdr) {
      args.push('-vf', 'tonemap=hable,format=yuv420p');
    } else {
      args.push('-pix_fmt', 'yuv420p');
    }

    // Audio
    args.push('-c:a', 'aac', '-b:a', '192k', '-ac', '2');

    // Faststart
    args.push('-movflags', '+faststart', outputFile);

    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { windowsHide: true });
      this.activeProcesses.set(hash, proc);

      proc.stderr.on('data', (data) => {
        const text = data.toString();
        if (onProgress && text.includes('time=')) {
          onProgress(50);
        }
      });

      proc.on('close', (code) => {
        this.activeProcesses.delete(hash);
        if (code === 0 && fs.existsSync(outputFile)) {
          resolve(outputFile);
        } else {
          reject(new Error(`Transcode failed with exit code ${code}`));
        }
      });

      proc.on('error', (err) => {
        this.activeProcesses.delete(hash);
        reject(err);
      });
    });
  }

  private killActiveProcess(key: string) {
    if (this.activeProcesses.has(key)) {
      try {
        const p = this.activeProcesses.get(key);
        p.kill('SIGKILL');
      } catch {}
      this.activeProcesses.delete(key);
    }
  }

  /**
   * Cache Management: Calculate cache folder size
   */
  public async getCacheSize(): Promise<{ bytes: number; formatted: string; fileCount: number }> {
    let totalBytes = 0;
    let fileCount = 0;
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const f of files) {
        const full = path.join(this.cacheDir, f);
        const stat = fs.statSync(full);
        if (stat.isFile()) {
          totalBytes += stat.size;
          fileCount++;
        }
      }
    } catch (e) {
      console.warn('[VideoService] Could not calculate cache size:', e);
    }

    const mb = totalBytes / (1024 * 1024);
    const formatted = mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`;
    return { bytes: totalBytes, formatted, fileCount };
  }

  /**
   * Cache Management: Clear all video cache files
   */
  public async clearCache(): Promise<void> {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const f of files) {
        const full = path.join(this.cacheDir, f);
        try {
          fs.unlinkSync(full);
        } catch {}
      }
      console.log('[VideoService] Video cache cleared successfully.');
    } catch (e) {
      console.warn('[VideoService] Error clearing cache:', e);
    }
  }

  /**
   * Cache Management: Clean up old files when cache exceeds size limit
   */
  public async cleanCacheIfNeeded(maxBytes: number): Promise<void> {
    if (!maxBytes || maxBytes <= 0) return;
    try {
      const { bytes } = await this.getCacheSize();
      if (bytes <= maxBytes) return;

      const files = fs
        .readdirSync(this.cacheDir)
        .map((f) => {
          const full = path.join(this.cacheDir, f);
          const stat = fs.statSync(full);
          return { full, size: stat.size, mtime: stat.mtimeMs };
        })
        .sort((a, b) => a.mtime - b.mtime); // oldest first

      let currentBytes = bytes;
      for (const file of files) {
        if (currentBytes <= maxBytes * 0.8) break; // reduce to 80% of limit
        try {
          fs.unlinkSync(file.full);
          currentBytes -= file.size;
        } catch {}
      }
    } catch (e) {
      console.warn('[VideoService] Auto-clean cache failed:', e);
    }
  }
}

export const videoService = new VideoService();
