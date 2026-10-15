# Play It 🎵 🎬

**Play It** is a native, 100% offline desktop media player for Windows featuring an ultra-luxurious **Liquid Glass** (Windows 11 Acrylic / Mica) interface. It plays local MP3 audio and MP4 video with zero network dependencies, zero telemetry, and zero accounts.

---

## ✨ Core Features

### 🎧 Music (MP3)
- **Comprehensive Import**: File picker, recursive folder scanner, and drag & drop.
- **ID3 Tag & Art Parsing**: Automatically extracts title, artist, album, genre, year, duration, bitrate, and embedded album artwork via `music-metadata`. Generates vibrant procedural gradient covers when tags or art are missing.
- **Library Views**: All Songs, Albums, Artists, Playlists, Favorites, and Recently Played.
- **Playback Suite**: Play/pause, next/prev, seek bar with hover indicator, volume, mute, shuffle, repeat (off / all / one), playback rate speed selector (0.75x to 2x).
- **Play Queue**: Slide-in glass drawer with track reordering (up/down), track removal, clear queue, and instant track jumping.
- **Search & Sort**: Real-time filtering across title, artist, and album. Sort ascending or descending by Title, Artist, Album, Duration, or Date Added.
- **Playlists**: Create, rename, delete custom playlists, and add/remove tracks via right-click context menu.
- **Session Persistence**: Remembers volume, repeat, shuffle, last track, and equalizer configurations between launches via local SQLite.

### 🎥 Video (MP4)
- **Cinema Video Player**: Full-screen and windowed glass cinema mode with custom floating controls.
- **Hover Seek Preview**: Seek bar displays timestamp preview on hover.
- **Auto Thumbnail Generation**: Automatically generates local video preview thumbnails.
- **Smart Resume**: Automatically tracks video playback position and offers instant resume.
- **Native HTML5 Streaming**: Custom `media-stream://` protocol supporting HTTP 206 Partial Content Range requests for instant seeking in large files.
- **Picture-in-Picture & Fullscreen**: One-click native PiP and fullscreen modes.
- **Codec Error Handling**: Friendly, actionable error messages for unsupported codecs.

### 💎 Liquid Glass Design System
- **Real Windows Acrylic / Mica**: Transparent frameless window utilizing Windows 11 `backgroundMaterial: 'acrylic'` with graceful backdrop-filter fallback.
- **Refraction & Specular Highlights**: SVG `feTurbulence` + `feDisplacementMap` liquid filters, linear border gradients, and organic rounded corners (20px to 32px).
- **Dynamic Color Tinting**: Real-time dominant color extraction from playing album artwork tints the glass panels and background ambient glowing blobs.
- **Mini Player Mode**: Compact always-on-top glass widget for unobtrusive desktop listening.
- **Dark & Light Glass Themes**: Choose between tinted dark glass or crystal light glass.
- **Accessibility**: "Reduce Transparency" toggle for high-contrast reading.

### 🎛️ Audio Extras & System Integration
- **Real-Time Visualizer**: Web Audio `AnalyserNode` rendering neon spectrum bars with dynamic glow.
- **10-Band Equalizer**: 10 frequency bands (32Hz - 16kHz) with presets (Rock, Pop, Bass Boost, Vocal, Jazz, Electronic, Acoustic, Flat, Custom).
- **Sleep Timer**: Timed automatic playback pause (15m, 30m, 45m, 60m).
- **System Tray**: Tray icon with play/pause, next, prev, restore, and quit.
- **Media Keys & MediaSession**: Integrates with Windows Media Overlay and hardware media keys.
- **Single-Instance Lock**: Prevents multiple copies; opens media files passed from Windows Explorer.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| **Space** | Play / Pause |
| **Arrow Left** | Seek Backward (-5s) |
| **Arrow Right** | Seek Forward (+5s) |
| **Arrow Up** | Volume Up (+10%) |
| **Arrow Down** | Volume Down (-10%) |
| **M** | Toggle Mute |
| **F** | Toggle Fullscreen (Video) |
| **Esc** | Exit Fullscreen / Close Video Modal |

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ or v22+)
- Windows 10 or Windows 11

### Running in Development
```bash
# Install dependencies
npm install

# Start Vite dev server & Electron window concurrently
npm run dev
```

### Production Build
```bash
# Build production bundle and package Windows installer + portable exe
npm run build
```

The resulting binaries will be placed in the `release/` directory:
- **NSIS Installer**: `release/Play It Setup 1.0.0.exe`
- **Portable Executable**: `release/Play It 1.0.0.exe`
- **Unpacked Folder**: `release/win-unpacked/Play It.exe`

---

## 📋 Verification & Test Checklist

- [x] **Offline Verification**: Disconnect from Wi-Fi/Ethernet. Launch the app. Confirm zero network calls, all icons, fonts, and controls load seamlessly.
- [x] **Import MP3**: Click "+ Add media", drag-and-drop `.mp3` files, or use folder picker. Check tag extraction and embedded artwork.
- [x] **Playback**: Play, pause, seek, volume, mute, shuffle, repeat (off/all/one), and playback speed.
- [x] **Audio Visualizer & EQ**: Toggle 10-band equalizer presets (Bass Boost, Rock, Pop) and observe real-time spectrum visualizer.
- [x] **Import MP4**: Click "+ Add media -> MP4" or drag `.mp4` video. Check local thumbnail generation and cinema playback with seek preview.
- [x] **Video Resume**: Play video past 5 seconds, exit, and re-open to verify resume banner.
- [x] **Playlists**: Create new playlist, add songs from context menu, verify tracks and playlist deletion.
- [x] **Mini Player**: Click Mini Player button in title bar. Verify always-on-top glass widget and restore button.
- [x] **System Tray**: Minimize app and use tray controls (Play/Pause, Next, Prev, Open, Quit).
- [x] **Windows MediaSession**: Verify Windows overlay displays current song title, artist, and artwork.

---

## 🔒 Security & Privacy
- `nodeIntegration: false`
- `contextIsolation: true`
- Validated IPC channels through secure contextBridge API
- 100% offline with zero remote telemetry
