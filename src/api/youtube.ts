import type { YouTubeChannel, SubscriptionItem, PlaylistItem, PlaylistItemVideo } from '../types';

const API_BASE = 'https://www.googleapis.com/youtube/v3';

export class YouTubeApiError extends Error {
  status: number;
  reason?: string;
  details?: unknown;

  constructor(message: string, status: number, reason?: string, details?: unknown) {
    super(message);
    this.name = 'YouTubeApiError';
    this.status = status;
    this.reason = reason;
    this.details = details;
  }
}

async function apiFetch<T>(endpoint: string, token: string, options: RequestInit = {}): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    let errorJson: { error?: { message?: string; errors?: Array<{ reason?: string; message?: string }> } } = {};
    try {
      errorJson = await response.json();
    } catch {
      // Ignorar fallo de parseo
    }

    const firstError = errorJson.error?.errors?.[0];
    const reason = firstError?.reason;
    const message = firstError?.message || errorJson.error?.message || `Error HTTP ${response.status} en YouTube API`;

    throw new YouTubeApiError(message, response.status, reason, errorJson);
  }

  return response.json() as Promise<T>;
}

// 1. Obtener canal del usuario autenticado (mine=true)
export async function fetchCurrentChannel(token: string): Promise<YouTubeChannel> {
  interface ChannelsResponse {
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        customUrl?: string;
        thumbnails?: {
          default?: { url: string };
          medium?: { url: string };
        };
      };
      statistics?: {
        subscriberCount?: string;
      };
    }>;
  }

  const data = await apiFetch<ChannelsResponse>(
    '/channels?part=snippet,statistics&mine=true',
    token
  );

  if (!data.items || data.items.length === 0) {
    throw new YouTubeApiError('No se encontró ningún canal asociado a esta cuenta de Google', 404, 'channelNotFound');
  }

  const item = data.items[0];
  return {
    id: item.id,
    title: item.snippet.title,
    description: item.snippet.description,
    customUrl: item.snippet.customUrl,
    avatarUrl: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || '',
    subscriberCount: item.statistics?.subscriberCount ? parseInt(item.statistics.subscriberCount, 10) : undefined
  };
}

// 2. Obtener todas las suscripciones del canal de origen (con paginación)
export async function fetchAllSubscriptions(
  token: string,
  onProgress?: (count: number) => void
): Promise<SubscriptionItem[]> {
  const subscriptions: SubscriptionItem[] = [];
  let pageToken: string | undefined = undefined;

  interface SubscriptionsResponse {
    nextPageToken?: string;
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        resourceId: {
          channelId: string;
        };
        thumbnails?: {
          default?: { url: string };
        };
      };
    }>;
  }

  do {
    const url = `/subscriptions?part=snippet&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data: SubscriptionsResponse = await apiFetch<SubscriptionsResponse>(url, token);

    if (data.items) {
      for (const item of data.items) {
        subscriptions.push({
          id: item.id,
          channelId: item.snippet.resourceId.channelId,
          title: item.snippet.title,
          description: item.snippet.description,
          thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
          status: 'pendiente'
        });
      }
      onProgress?.(subscriptions.length);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return subscriptions;
}

// 3. Crear suscripción en el canal de destino
export async function createSubscription(targetToken: string, channelId: string): Promise<string> {
  interface SubscriptionInsertResponse {
    id: string;
  }

  const response = await apiFetch<SubscriptionInsertResponse>(
    '/subscriptions?part=snippet',
    targetToken,
    {
      method: 'POST',
      body: JSON.stringify({
        snippet: {
          resourceId: {
            kind: 'youtube#channel',
            channelId
          }
        }
      })
    }
  );

  return response.id;
}

// 4. Obtener todas las listas creadas por el usuario (mine=true)
export async function fetchAllPlaylists(
  token: string,
  onProgress?: (count: number) => void
): Promise<PlaylistItem[]> {
  const playlists: PlaylistItem[] = [];
  let pageToken: string | undefined = undefined;

  interface PlaylistsResponse {
    nextPageToken?: string;
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        description: string;
        thumbnails?: {
          default?: { url: string };
        };
      };
      status?: {
        privacyStatus: 'private' | 'public' | 'unlisted';
      };
      contentDetails?: {
        itemCount: number;
      };
    }>;
  }

  do {
    const url = `/playlists?part=snippet,status,contentDetails&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data: PlaylistsResponse = await apiFetch<PlaylistsResponse>(url, token);

    if (data.items) {
      for (const item of data.items) {
        playlists.push({
          id: item.id,
          title: item.snippet.title,
          description: item.snippet.description,
          privacyStatus: item.status?.privacyStatus || 'private',
          itemCount: item.contentDetails?.itemCount || 0,
          thumbnailUrl: item.snippet.thumbnails?.default?.url || '',
          status: 'pendiente'
        });
      }
      onProgress?.(playlists.length);
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return playlists;
}

// 5. Obtener todos los vídeos de una lista
export async function fetchPlaylistVideos(
  token: string,
  playlistId: string
): Promise<PlaylistItemVideo[]> {
  const videos: PlaylistItemVideo[] = [];
  let pageToken: string | undefined = undefined;
  let position = 0;

  interface PlaylistItemsResponse {
    nextPageToken?: string;
    items?: Array<{
      id: string;
      snippet: {
        title: string;
        resourceId?: {
          videoId?: string;
        };
        thumbnails?: {
          default?: { url: string };
        };
      };
    }>;
  }

  do {
    const url = `/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const data: PlaylistItemsResponse = await apiFetch<PlaylistItemsResponse>(url, token);

    if (data.items) {
      for (const item of data.items) {
        const videoId = item.snippet.resourceId?.videoId;
        if (videoId) {
          videos.push({
            id: item.id,
            videoId,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails?.default?.url,
            position: position++,
            status: 'pendiente'
          });
        }
      }
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return videos;
}

// 6. Crear una lista en destino
export async function createPlaylist(
  targetToken: string,
  title: string,
  description: string,
  privacyStatus: 'private' | 'public' | 'unlisted'
): Promise<string> {
  interface PlaylistInsertResponse {
    id: string;
  }

  const response = await apiFetch<PlaylistInsertResponse>(
    '/playlists?part=snippet,status',
    targetToken,
    {
      method: 'POST',
      body: JSON.stringify({
        snippet: {
          title,
          description
        },
        status: {
          privacyStatus
        }
      })
    }
  );

  return response.id;
}

// 7. Insertar un vídeo en una lista
export async function addVideoToPlaylist(
  targetToken: string,
  playlistId: string,
  videoId: string,
  position?: number
): Promise<string> {
  interface PlaylistItemInsertResponse {
    id: string;
  }

  const bodySnippet: Record<string, unknown> = {
    playlistId,
    resourceId: {
      kind: 'youtube#video',
      videoId
    }
  };

  if (typeof position === 'number') {
    bodySnippet.position = position;
  }

  const response = await apiFetch<PlaylistItemInsertResponse>(
    '/playlistItems?part=snippet',
    targetToken,
    {
      method: 'POST',
      body: JSON.stringify({
        snippet: bodySnippet
      })
    }
  );

  return response.id;
}
