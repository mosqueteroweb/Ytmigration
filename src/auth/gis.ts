// Gestión en memoria de tokens de autenticación OAuth 2.0 mediante Google Identity Services (GIS)

export interface AuthTokenState {
  accessToken: string;
  expiresAt: number;
  scope: string;
}

// Almacén ESTRICTAMENTE VOLÁTIL en memoria (NUNCA en localStorage/IndexedDB)
const inMemoryTokens: {
  source?: AuthTokenState;
  target?: AuthTokenState;
} = {};

export function getStoredToken(type: 'source' | 'target'): AuthTokenState | undefined {
  const token = inMemoryTokens[type];
  if (!token) return undefined;
  
  // Si expira en menos de 60 segundos, considerarlo expirado
  if (Date.now() >= token.expiresAt - 60000) {
    delete inMemoryTokens[type];
    return undefined;
  }
  return token;
}

export function clearTokens(): void {
  delete inMemoryTokens.source;
  delete inMemoryTokens.target;
}

export function isGISLoaded(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as { google?: { accounts?: { oauth2?: unknown } } }).google?.accounts?.oauth2;
}

export async function waitForGIS(timeoutMs = 5000): Promise<boolean> {
  if (isGISLoaded()) return true;

  const start = Date.now();
  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (isGISLoaded()) {
        clearInterval(interval);
        resolve(true);
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(interval);
        resolve(false);
      }
    }, 100);
  });
}

export interface RequestTokenOptions {
  clientId: string;
  scope: string;
  type: 'source' | 'target';
  accountHint?: string;
}

export async function requestGoogleToken({
  clientId,
  scope,
  type,
  accountHint
}: RequestTokenOptions): Promise<AuthTokenState> {
  const isLoaded = await waitForGIS();
  if (!isLoaded) {
    throw new Error('El SDK de Google Identity Services no ha cargado. Verifica tu conexión a internet o bloqueadores de contenido.');
  }

  return new Promise((resolve, reject) => {
    try {
      const google = (window as unknown as {
        google: {
          accounts: {
            oauth2: {
              initTokenClient: (config: {
                client_id: string;
                scope: string;
                callback: (response: { access_token?: string; error?: string; error_description?: string; expires_in?: number }) => void;
                error_callback?: (error: unknown) => void;
                hint?: string;
                prompt?: string;
              }) => {
                requestAccessToken: (overrides?: { prompt?: string; hint?: string }) => void;
              };
            };
          };
        };
      }).google;

      const client = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope,
        prompt: 'select_account', // Obligar a mostrar el selector de cuentas para no confundir origen y destino
        hint: accountHint,
        callback: (response) => {
          if (response.error) {
            reject(new Error(`Error de autenticación Google: ${response.error_description || response.error}`));
            return;
          }

          if (!response.access_token) {
            reject(new Error('No se recibió un token de acceso'));
            return;
          }

          const expiresIn = response.expires_in || 3599;
          const tokenState: AuthTokenState = {
            accessToken: response.access_token,
            expiresAt: Date.now() + expiresIn * 1000,
            scope
          };

          inMemoryTokens[type] = tokenState;
          resolve(tokenState);
        },
        error_callback: (err) => {
          reject(new Error(`Fallo en el cliente OAuth: ${JSON.stringify(err)}`));
        }
      });

      // Abrir ventana emergente de Google
      client.requestAccessToken({ prompt: 'select_account' });
    } catch (err) {
      reject(err);
    }
  });
}
