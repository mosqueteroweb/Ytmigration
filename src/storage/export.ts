import { db } from './db';
import type { MigrationSession, SubscriptionItem, PlaylistItem } from '../types';

export interface ExportData {
  version: 1;
  exportedAt: string;
  session: MigrationSession | undefined;
  subscriptions: SubscriptionItem[];
  playlists: PlaylistItem[];
}

export async function exportMigrationData(): Promise<string> {
  const currentSession = await db.sessions.toCollection().last();
  const subscriptions = await db.subscriptions.toArray();
  const playlists = await db.playlists.toArray();

  const data: ExportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    session: currentSession,
    subscriptions,
    playlists
  };

  return JSON.stringify(data, null, 2);
}

export async function importMigrationData(jsonStr: string): Promise<boolean> {
  try {
    const data = JSON.parse(jsonStr) as ExportData;
    if (data.version !== 1 || !data.session) {
      throw new Error('Formato de archivo inválido o sesión ausente');
    }

    await db.transaction('rw', db.sessions, db.subscriptions, db.playlists, async () => {
      await db.sessions.put(data.session!);
      if (data.subscriptions && data.subscriptions.length > 0) {
        await db.subscriptions.bulkPut(data.subscriptions);
      }
      if (data.playlists && data.playlists.length > 0) {
        await db.playlists.bulkPut(data.playlists);
      }
    });

    return true;
  } catch (err) {
    console.error('Error al importar datos de migración:', err);
    return false;
  }
}
