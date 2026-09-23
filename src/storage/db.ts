import Dexie, { type Table } from 'dexie';
import type { MigrationSession, SubscriptionItem, PlaylistItem, PlaylistItemVideo } from '../types';

export interface LogEntry {
  id?: number;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'success';
  category: 'auth' | 'quota' | 'subscription' | 'playlist' | 'video';
  message: string;
  details?: Record<string, unknown> | string;
}

export interface AppSetting {
  key: string;
  value: string;
}

export class YTMigrationDatabase extends Dexie {
  sessions!: Table<MigrationSession, string>;
  subscriptions!: Table<SubscriptionItem, string>;
  playlists!: Table<PlaylistItem, string>;
  playlistVideos!: Table<PlaylistItemVideo & { playlistId: string }, string>;
  logs!: Table<LogEntry, number>;
  settings!: Table<AppSetting, string>;

  constructor() {
    super('YTMigrationDB');
    this.version(1).stores({
      sessions: 'id, status, createdAt, updatedAt',
      subscriptions: 'id, channelId, title, status',
      playlists: 'id, title, status',
      playlistVideos: 'id, playlistId, videoId, position, status',
      logs: '++id, timestamp, level, category',
      settings: 'key'
    });
  }
}

export const db = new YTMigrationDatabase();

// Helpers para ajustes locales seguros (ej. Google Client ID)
export async function getSetting(key: string, defaultValue = ''): Promise<string> {
  const item = await db.settings.get(key);
  return item ? item.value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.settings.put({ key, value });
}

export async function clearAllLocalData(): Promise<void> {
  await db.sessions.clear();
  await db.subscriptions.clear();
  await db.playlists.clear();
  await db.playlistVideos.clear();
  await db.logs.clear();
}
