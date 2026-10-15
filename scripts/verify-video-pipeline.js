const path = require('path');
const fs = require('fs');
const cp = require('child_process');

const ffmpeg = require('@ffmpeg-installer/ffmpeg').path;
const ffprobe = require('@ffprobe-installer/ffprobe').path;

async function run() {
  console.log('--- 1. Testing FFmpeg and FFprobe Binaries ---');
  console.log('FFmpeg path:', ffmpeg, fs.existsSync(ffmpeg) ? '✓ Found' : '✗ Missing');
  console.log('FFprobe path:', ffprobe, fs.existsSync(ffprobe) ? '✓ Found' : '✗ Missing');

  const sampleDir = path.join(__dirname, '../temp_video_test');
  if (!fs.existsSync(sampleDir)) fs.mkdirSync(sampleDir, { recursive: true });

  const mp4Path = path.join(sampleDir, 'test_sample.mp4');
  const mkvPath = path.join(sampleDir, 'test_sample.mkv');
  const srtPath = path.join(sampleDir, 'test_sample.srt');

  console.log('\n--- 2. Creating Sample Test Media ---');
  // Generate a 2-second MP4 test video with AAC audio
  cp.execFileSync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=2:size=640x360:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    mp4Path
  ], { stdio: 'pipe' });
  console.log('Created MP4:', mp4Path, fs.statSync(mp4Path).size, 'bytes');

  // Generate an MKV container with H.264 video and AC3 audio
  cp.execFileSync(ffmpeg, [
    '-y',
    '-f', 'lavfi', '-i', 'testsrc=duration=2:size=640x360:rate=30',
    '-f', 'lavfi', '-i', 'sine=frequency=880:duration=2',
    '-c:v', 'libx264',
    '-c:a', 'ac3',
    mkvPath
  ], { stdio: 'pipe' });
  console.log('Created MKV:', mkvPath, fs.statSync(mkvPath).size, 'bytes');

  // Create an SRT subtitle file
  const srtContent = `1
00:00:00,200 --> 00:00:01,800
Hello from PLay It Liquid Glass Cinema Player!
`;
  fs.writeFileSync(srtPath, srtContent, 'utf-8');
  console.log('Created SRT:', srtPath);

  console.log('\n--- 3. Testing Media Probe via ffprobe ---');
  const probeOut = cp.execFileSync(ffprobe, [
    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', mp4Path
  ], { encoding: 'utf-8' });
  const probeData = JSON.parse(probeOut);
  console.log('Streams found in MP4:', probeData.streams.map(s => `${s.codec_type}: ${s.codec_name}`));

  const probeOutMkv = cp.execFileSync(ffprobe, [
    '-v', 'quiet', '-print_format', 'json', '-show_format', '-show_streams', mkvPath
  ], { encoding: 'utf-8' });
  const probeDataMkv = JSON.parse(probeOutMkv);
  console.log('Streams found in MKV:', probeDataMkv.streams.map(s => `${s.codec_type}: ${s.codec_name}`));

  console.log('\n--- 4. Testing Remuxing MKV to FastStart MP4 ---');
  const remuxOut = path.join(sampleDir, 'remuxed.mp4');
  cp.execFileSync(ffmpeg, [
    '-y',
    '-i', mkvPath,
    '-map', '0:v:0',
    '-map', '0:a:0',
    '-c:v', 'copy',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    remuxOut
  ], { stdio: 'pipe' });
  console.log('Remuxed file size:', fs.statSync(remuxOut).size, 'bytes');

  console.log('\n--- 5. Testing Subtitle Conversion to WebVTT ---');
  const vttOut = path.join(sampleDir, 'test_sample.vtt');
  cp.execFileSync(ffmpeg, ['-y', '-i', srtPath, '-f', 'webvtt', vttOut], { stdio: 'pipe' });
  console.log('Converted WebVTT:\n' + fs.readFileSync(vttOut, 'utf-8').trim());

  console.log('\n--- 6. Testing Video Thumbnail Generation ---');
  const thumbOut = path.join(sampleDir, 'thumb.jpg');
  cp.execFileSync(ffmpeg, [
    '-y',
    '-ss', '00:00:01',
    '-i', mp4Path,
    '-vframes', '1',
    '-vf', 'scale=480:-1',
    '-q:v', '2',
    thumbOut
  ], { stdio: 'pipe' });
  console.log('Thumbnail generated:', fs.existsSync(thumbOut) ? '✓ Success' : '✗ Failed', fs.statSync(thumbOut).size, 'bytes');

  console.log('\n--- 7. Cleanup Test Media ---');
  fs.rmSync(sampleDir, { recursive: true, force: true });
  console.log('Test directory cleaned up.');
  console.log('\n======================================================');
  console.log('✓ ALL VIDEO ENGINES AND TEST WORKFLOWS COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
}

run().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
