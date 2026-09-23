import { getStoredToken } from '../auth/gis';
import {
  createSubscription,
  createPlaylist,
  fetchPlaylistVideos,
  addVideoToPlaylist,
  YouTubeApiError
} from '../api/youtube';
import { db } from '../storage/db';
import type { SubscriptionItem, PlaylistItem } from '../types';

export interface MigrationProgress {
  currentOperation: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  skippedItems: number;
  isPaused: boolean;
  error?: string;
}

export class MigrationEngine {
  private isPaused = false;
  private onProgressCallback?: (progress: MigrationProgress) => void;

  constructor(onProgress?: (progress: MigrationProgress) => void) {
    this.onProgressCallback = onProgress;
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private report(
    currentOperation: string,
    total: number,
    completed: number,
    failed: number,
    skipped: number,
    error?: string
  ) {
    this.onProgressCallback?.({
      currentOperation,
      totalItems: total,
      completedItems: completed,
      failedItems: failed,
      skippedItems: skipped,
      isPaused: this.isPaused,
      error
    });
  }

  public async runMigration(
    selectedSubscriptions: SubscriptionItem[],
    selectedPlaylists: PlaylistItem[]
  ): Promise<void> {
    this.isPaused = false;

    // Calcular total de elementos estimados
    const totalVideos = selectedPlaylists.reduce((acc, p) => acc + p.itemCount, 0);
    const totalItems = selectedSubscriptions.length + selectedPlaylists.length + totalVideos;

    let completed = 0;
    let failed = 0;
    let skipped = 0;

    const getTargetToken = () => {
      const token = getStoredToken('target');
      if (!token) {
        throw new Error('La autorización de la cuenta de destino ha caducado. Por favor, renueva la conexión.');
      }
      return token.accessToken;
    };

    const getSourceToken = () => {
      const token = getStoredToken('source');
      if (!token) {
        throw new Error('La autorización de la cuenta de origen ha caducado. Por favor, renueva la conexión.');
      }
      return token.accessToken;
    };

    // 1. Migrar Suscripciones
    for (const sub of selectedSubscriptions) {
      if (this.isPaused) {
        this.report('Migración en pausa', totalItems, completed, failed, skipped);
        return;
      }

      if (sub.status === 'completada') {
        skipped++;
        this.report(`Suscripción omitida (ya completada): ${sub.title}`, totalItems, completed, failed, skipped);
        continue;
      }

      this.report(`Suscribiendo a: ${sub.title}...`, totalItems, completed, failed, skipped);

      try {
        const targetToken = getTargetToken();
        const newSubId = await createSubscription(targetToken, sub.channelId);

        sub.status = 'completada';
        sub.targetSubscriptionId = newSubId;
        await db.subscriptions.put(sub);
        completed++;

        // Delay de cortesía para respetar límites de tasa de YouTube (800ms)
        await this.delay(800);
      } catch (err: unknown) {
        if (err instanceof YouTubeApiError && err.status === 401) {
          this.pause();
          this.report('Sesión expirada. Por favor renueva el token de destino.', totalItems, completed, failed, skipped, err.message);
          throw err;
        }

        if (err instanceof YouTubeApiError && err.reason === 'subscriptionRateLimitExceeded') {
          this.pause();
          sub.status = 'fallida';
          sub.errorMessage = 'Límite diario de suscripciones de YouTube alcanzado';
          await db.subscriptions.put(sub);
          this.report('Límite de suscripciones de YouTube alcanzado para hoy', totalItems, completed, failed, skipped, sub.errorMessage);
          throw err;
        }

        failed++;
        sub.status = 'fallida';
        sub.errorMessage = err instanceof Error ? err.message : 'Error desconocido';
        await db.subscriptions.put(sub);
      }
    }

    // 2. Migrar Listas de Reproducción y sus vídeos
    for (const playlist of selectedPlaylists) {
      if (this.isPaused) {
        this.report('Migración en pausa', totalItems, completed, failed, skipped);
        return;
      }

      let targetPlaylistId = playlist.targetPlaylistId;

      // Crear lista en destino si no se ha creado todavía
      if (!targetPlaylistId) {
        this.report(`Creando lista: ${playlist.title}...`, totalItems, completed, failed, skipped);
        try {
          const targetToken = getTargetToken();
          targetPlaylistId = await createPlaylist(
            targetToken,
            playlist.title,
            playlist.description,
            playlist.privacyStatus
          );

          playlist.targetPlaylistId = targetPlaylistId;
          playlist.status = 'en_curso';
          await db.playlists.put(playlist);
          completed++;
          await this.delay(800);
        } catch (err: unknown) {
          failed++;
          playlist.status = 'fallida';
          playlist.errorMessage = err instanceof Error ? err.message : 'Error al crear la lista';
          await db.playlists.put(playlist);
          continue;
        }
      }

      // Obtener vídeos de la lista origen
      this.report(`Obteniendo vídeos de la lista: ${playlist.title}...`, totalItems, completed, failed, skipped);
      let videos = [];
      try {
        const sourceToken = getSourceToken();
        videos = await fetchPlaylistVideos(sourceToken, playlist.id);
      } catch (err: unknown) {
        console.error(`Error al listar vídeos de la lista ${playlist.title}:`, err);
        continue;
      }

      // Copiar cada vídeo a la nueva lista
      for (const video of videos) {
        if (this.isPaused) {
          this.report('Migración en pausa', totalItems, completed, failed, skipped);
          return;
        }

        this.report(`Añadiendo vídeo: ${video.title} a ${playlist.title}...`, totalItems, completed, failed, skipped);

        try {
          const targetToken = getTargetToken();
          await addVideoToPlaylist(targetToken, targetPlaylistId, video.videoId);
          completed++;
          await this.delay(800);
        } catch (err: unknown) {
          // Si el vídeo fue borrado o es privado, se omite limpiamente
          if (err instanceof YouTubeApiError && (err.status === 404 || err.reason === 'videoNotFound')) {
            skipped++;
            video.status = 'omitida';
            video.errorMessage = 'Vídeo no disponible o eliminado';
          } else {
            failed++;
            video.status = 'fallida';
            video.errorMessage = err instanceof Error ? err.message : 'Error al añadir vídeo';
          }
        }
      }

      playlist.status = 'completada';
      await db.playlists.put(playlist);
    }

    this.report('¡Migración finalizada con éxito!', totalItems, completed, failed, skipped);
  }
}
