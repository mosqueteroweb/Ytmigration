export type TaskStatus = 
  | 'pendiente'
  | 'en_curso'
  | 'completada'
  | 'incierta'
  | 'omitida'
  | 'fallida';

export interface YouTubeChannel {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  avatarUrl: string;
  subscriberCount?: number;
}

export interface SubscriptionItem {
  id: string; // Subscription ID in source
  channelId: string; // The channel subscribed to
  title: string;
  description: string;
  thumbnailUrl: string;
  status: TaskStatus;
  errorMessage?: string;
  targetSubscriptionId?: string;
}

export interface PlaylistItemVideo {
  id: string; // Source playlistItem id
  videoId: string;
  title: string;
  thumbnailUrl?: string;
  position: number;
  status: TaskStatus;
  errorMessage?: string;
  targetPlaylistItemId?: string;
}

export interface PlaylistItem {
  id: string; // Source playlist ID
  title: string;
  description: string;
  privacyStatus: 'private' | 'public' | 'unlisted';
  itemCount: number;
  thumbnailUrl?: string;
  targetPlaylistId?: string;
  status: TaskStatus;
  errorMessage?: string;
  videos?: PlaylistItemVideo[];
}

export interface MigrationSession {
  id: string;
  createdAt: number;
  updatedAt: number;
  sourceChannel: YouTubeChannel;
  targetChannel: YouTubeChannel;
  totalSubscriptions: number;
  migratedSubscriptions: number;
  totalPlaylists: number;
  migratedPlaylists: number;
  totalVideos: number;
  migratedVideos: number;
  estimatedQuotaUsed: number;
  status: 'configurando' | 'analizando' | 'listo' | 'migrando' | 'pausado' | 'completado';
}

export interface QuotaEstimate {
  subscriptionWrites: number;
  playlistWrites: number;
  videoWrites: number;
  readQueries: number;
  totalEstimatedUnits: number;
  daysRequiredAt10k: number;
}
