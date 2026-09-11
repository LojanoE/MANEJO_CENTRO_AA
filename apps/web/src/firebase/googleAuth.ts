import { GOOGLE_OAUTH_CLIENT_ID } from '../config/drive'

/**
 * Token OAuth de la cuenta REAL del usuario, obtenido con Google Identity
 * Services (GSI) directo en el navegador. Se usa para las escrituras en Drive
 * (backups), porque las cuentas de servicio tienen cuota de almacenamiento 0.
 *
 * Flujo: la primera vez se abre el popup de Google (elegir cuenta + consentir
 * el scope); el token dura ~1 hora y se cachea en memoria.
 */

interface TokenClientConfig {
  client_id: string
  scope: string
  callback: (resp: { access_token?: string; expires_in?: number; error?: string }) => void
}

interface TokenClient {
  requestAccessToken(overrides?: { prompt?: string }): void
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient(config: TokenClientConfig): TokenClient
        }
      }
    }
  }
}

let gsiPromise: Promise<void> | null = null

function loadGsi(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve()
  gsiPromise ??= new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'))
    document.head.appendChild(s)
  })
  return gsiPromise
}

let cached: { token: string; scope: string; expiresAt: number } | null = null

/** Access token del usuario para `scope`. Debe llamarse desde un gesto del
 * usuario (click) la primera vez, porque abre el popup de Google. */
export async function getGoogleUserAccessToken(scope: string): Promise<string> {
  if (!GOOGLE_OAUTH_CLIENT_ID) {
    throw new Error(
      'Falta configurar VITE_GOOGLE_CLIENT_ID (OAuth Client ID de tipo web en Google Cloud).',
    )
  }
  if (cached && cached.scope === scope && cached.expiresAt > Date.now() + 60_000) {
    return cached.token
  }
  await loadGsi()
  const oauth2 = window.google?.accounts?.oauth2
  if (!oauth2) throw new Error('Google Identity Services no está disponible.')

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_OAUTH_CLIENT_ID,
      scope,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(`Google no autorizó el acceso a Drive: ${resp.error ?? 'sin token'}`))
          return
        }
        cached = {
          token: resp.access_token,
          scope,
          expiresAt: Date.now() + (resp.expires_in ?? 3600) * 1000,
        }
        resolve(resp.access_token)
      },
    })
    client.requestAccessToken({ prompt: '' })
  })
}
