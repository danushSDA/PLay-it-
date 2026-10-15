import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

export interface DBTrack {
  id: number;
  file_path: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  year: number | null;
  duration: number;
  bitrate: number | null;
  sample_rate: number | null;
  cover_art: string | null;
  date_added: number;
  last_played: number | null;
  play_count: number;
  is_favorite: number;
}

export interface DBVideo {
  id: number;
  file_path: string;
  title: string;
  duration: number;
  width: number | null;
  height: number | null;
  thumbnail: string | null;
  date_added: number;
  last_played: number | null;
  last_position: number;
  play_count: number;
  is_favorite: number;
}

export interface DBPlaylist {
  id: number;
  name: string;
  created_at: number;
  updated_at: number;
  track_count?: number;
}

class DatabaseService {
  private db: sqlite3.Database | null = null;

  public async init(): Promise<void> {
    const userDataPath = app ? app.getPath('userData') : process.cwd();
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const dbPath = path.join(userDataPath, 'play_it.db');
    console.log('[Database] Opening SQLite database at:', dbPath);

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(dbPath, (err) => {
        if (err) {
          console.error('[Database] Connection failed:', err);
          return reject(err);
        }
        this.runMigrations()
          .then(resolve)
          .catch(reject);
      });
    });
  }

  private run(sql: string, params: any[] = []): Promise<{ lastID: number; changes: number }> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      this.db.run(sql, params, function (err) {
        if (err) reject(err);
        else resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) return reject(new Error('Database not initialized'));
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  }

  private async runMigrations(): Promise<void> {
    // Tracks table
    await this.run(`
      CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        artist TEXT NOT NULL,
        album TEXT NOT NULL,
        genre TEXT DEFAULT '',
        year INTEGER,
        duration REAL NOT NULL DEFAULT 0,
        bitrate INTEGER,
        sample_rate INTEGER,
        cover_art TEXT,
        date_added INTEGER NOT NULL,
        last_played INTEGER,
        play_count INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0
      )
    `);

    // Videos table
    await this.run(`
      CREATE TABLE IF NOT EXISTS videos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        title TEXT NOT NULL,
        duration REAL NOT NULL DEFAULT 0,
        width INTEGER,
        height INTEGER,
        thumbnail TEXT,
        date_added INTEGER NOT NULL,
        last_played INTEGER,
        last_position REAL DEFAULT 0,
        play_count INTEGER DEFAULT 0,
        is_favorite INTEGER DEFAULT 0
      )
    `);

    // Playlists table
    await this.run(`
      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Playlist tracks join table
    await this.run(`
      CREATE TABLE IF NOT EXISTS playlist_tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        playlist_id INTEGER NOT NULL,
        track_id INTEGER NOT NULL,
        sort_order INTEGER NOT NULL,
        FOREIGN KEY(playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY(track_id) REFERENCES tracks(id) ON DELETE CASCADE,
        UNIQUE(playlist_id, track_id)
      )
    `);

    // Settings key-value table
    await this.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    console.log('[Database] Migrations applied successfully.');
  }

  // --- Track Methods ---
  public async getAllTracks(): Promise<DBTrack[]> {
    return this.all<DBTrack>('SELECT * FROM tracks ORDER BY date_added DESC');
  }

  public async insertOrUpdateTrack(track: Omit<DBTrack, 'id'>): Promise<number> {
    const existing = await this.get<DBTrack>('SELECT id FROM tracks WHERE file_path = ?', [track.file_path]);
    if (existing) {
      await this.run(
        `UPDATE tracks SET 
          title = ?, artist = ?, album = ?, genre = ?, year = ?, 
          duration = ?, bitrate = ?, sample_rate = ?, cover_art = COALESCE(?, cover_art)
         WHERE id = ?`,
        [
          track.title,
          track.artist,
          track.album,
          track.genre,
          track.year,
          track.duration,
          track.bitrate,
          track.sample_rate,
          track.cover_art,
          existing.id,
        ]
      );
      return existing.id;
    } else {
      const res = await this.run(
        `INSERT INTO tracks (
          file_path, title, artist, album, genre, year, 
          duration, bitrate, sample_rate, cover_art, date_added, last_played, play_count, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          track.file_path,
          track.title,
          track.artist,
          track.album,
          track.genre,
          track.year,
          track.duration,
          track.bitrate,
          track.sample_rate,
          track.cover_art,
          track.date_added,
          track.last_played,
          track.play_count,
          track.is_favorite,
        ]
      );
      return res.lastID;
    }
  }

  public async toggleTrackFavorite(id: number): Promise<boolean> {
    const track = await this.get<DBTrack>('SELECT is_favorite FROM tracks WHERE id = ?', [id]);
    if (!track) return false;
    const newVal = track.is_favorite ? 0 : 1;
    await this.run('UPDATE tracks SET is_favorite = ? WHERE id = ?', [newVal, id]);
    return newVal === 1;
  }

  public async recordTrackPlay(id: number): Promise<void> {
    await this.run(
      'UPDATE tracks SET play_count = play_count + 1, last_played = ? WHERE id = ?',
      [Date.now(), id]
    );
  }

  public async removeTrack(id: number): Promise<void> {
    await this.run('DELETE FROM playlist_tracks WHERE track_id = ?', [id]);
    await this.run('DELETE FROM tracks WHERE id = ?', [id]);
  }

  // --- Video Methods ---
  public async getAllVideos(): Promise<DBVideo[]> {
    return this.all<DBVideo>('SELECT * FROM videos ORDER BY date_added DESC');
  }

  public async insertOrUpdateVideo(video: Omit<DBVideo, 'id'>): Promise<number> {
    const existing = await this.get<DBVideo>('SELECT id FROM videos WHERE file_path = ?', [video.file_path]);
    if (existing) {
      await this.run(
        `UPDATE videos SET title = ?, duration = ?, width = ?, height = ?, thumbnail = COALESCE(?, thumbnail) WHERE id = ?`,
        [video.title, video.duration, video.width, video.height, video.thumbnail, existing.id]
      );
      return existing.id;
    } else {
      const res = await this.run(
        `INSERT INTO videos (
          file_path, title, duration, width, height, thumbnail, date_added, last_played, last_position, play_count, is_favorite
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          video.file_path,
          video.title,
          video.duration,
          video.width,
          video.height,
          video.thumbnail,
          video.date_added,
          video.last_played,
          video.last_position,
          video.play_count,
          video.is_favorite,
        ]
      );
      return res.lastID;
    }
  }

  public async updateVideoPosition(id: number, position: number): Promise<void> {
    await this.run(
      'UPDATE videos SET last_position = ?, last_played = ?, play_count = play_count + 1 WHERE id = ?',
      [position, Date.now(), id]
    );
  }

  public async toggleVideoFavorite(id: number): Promise<boolean> {
    const video = await this.get<DBVideo>('SELECT is_favorite FROM videos WHERE id = ?', [id]);
    if (!video) return false;
    const newVal = video.is_favorite ? 0 : 1;
    await this.run('UPDATE videos SET is_favorite = ? WHERE id = ?', [newVal, id]);
    return newVal === 1;
  }

  public async removeVideo(id: number): Promise<void> {
    await this.run('DELETE FROM videos WHERE id = ?', [id]);
  }

  // --- Playlist Methods ---
  public async getPlaylists(): Promise<DBPlaylist[]> {
    return this.all<DBPlaylist>(`
      SELECT p.*, COUNT(pt.track_id) as track_count 
      FROM playlists p 
      LEFT JOIN playlist_tracks pt ON p.id = pt.playlist_id 
      GROUP BY p.id 
      ORDER BY p.name ASC
    `);
  }

  public async createPlaylist(name: string): Promise<DBPlaylist> {
    const now = Date.now();
    const res = await this.run('INSERT INTO playlists (name, created_at, updated_at) VALUES (?, ?, ?)', [name, now, now]);
    return { id: res.lastID, name, created_at: now, updated_at: now, track_count: 0 };
  }

  public async renamePlaylist(id: number, name: string): Promise<void> {
    await this.run('UPDATE playlists SET name = ?, updated_at = ? WHERE id = ?', [name, Date.now(), id]);
  }

  public async deletePlaylist(id: number): Promise<void> {
    await this.run('DELETE FROM playlist_tracks WHERE playlist_id = ?', [id]);
    await this.run('DELETE FROM playlists WHERE id = ?', [id]);
  }

  public async addTrackToPlaylist(playlistId: number, trackId: number): Promise<void> {
    const maxOrder = await this.get<{ maxOrder: number }>(
      'SELECT MAX(sort_order) as maxOrder FROM playlist_tracks WHERE playlist_id = ?',
      [playlistId]
    );
    const order = (maxOrder?.maxOrder ?? -1) + 1;
    await this.run(
      'INSERT OR IGNORE INTO playlist_tracks (playlist_id, track_id, sort_order) VALUES (?, ?, ?)',
      [playlistId, trackId, order]
    );
    await this.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), playlistId]);
  }

  public async removeTrackFromPlaylist(playlistId: number, trackId: number): Promise<void> {
    await this.run('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_id = ?', [playlistId, trackId]);
    await this.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [Date.now(), playlistId]);
  }

  public async getPlaylistTracks(playlistId: number): Promise<DBTrack[]> {
    return this.all<DBTrack>(`
      SELECT t.* 
      FROM tracks t 
      INNER JOIN playlist_tracks pt ON t.id = pt.track_id 
      WHERE pt.playlist_id = ? 
      ORDER BY pt.sort_order ASC
    `, [playlistId]);
  }

  // --- Settings Methods ---
  public async getSettings(): Promise<Record<string, any>> {
    const rows = await this.all<{ key: string; value: string }>('SELECT key, value FROM settings');
    const settings: Record<string, any> = {};
    for (const row of rows) {
      try {
        settings[row.key] = JSON.parse(row.value);
      } catch {
        settings[row.key] = row.value;
      }
    }
    return settings;
  }

  public async saveSetting(key: string, value: any): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.run('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, serialized]);
  }
}

export const dbService = new DatabaseService();
