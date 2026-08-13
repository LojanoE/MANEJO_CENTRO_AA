import { SignJWT, importPKCS8 } from 'jose'
import { DRIVE_SA_JSON } from '../config/drive'

const TOKEN_URL = 'https://oauth2.googleapis.com/token'

interface TokenCache {
  token: string
  exp: number
}

let tokenCache: TokenCache | null = null

export interface ServiceAccount {
  client_email: string
  private_key: string
  project_id?: string
}

export function getServiceAccount(): ServiceAccount {
  if (!DRIVE_SA_JSON) {
    throw new Error(
      'DRIVE_SA_JSON no configurado. Agrega el JSON del Service Account como secreto VITE_DRIVE_SA_JSON en GitHub o en apps/web/.env',
    )
  }
  try {
    const sa = JSON.parse(DRIVE_SA_JSON) as ServiceAccount
    if (!sa.client_email || !sa.private_key) {
      throw new Error('JSON de Service Account incompleto')
    }
    return sa
  } catch {
    throw new Error('DRIVE_SA_JSON no es un JSON válido')
  }
}

export async function getServiceAccountToken(scope: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (tokenCache && tokenCache.exp > now + 60) {
    return tokenCache.token
  }
  const sa = getServiceAccount()
  const key = await importPKCS8(sa.private_key.replace(/\\n/g, '\n'), 'RS256')
  const jwt = await new SignJWT({
    iss: sa.client_email,
    sub: sa.client_email,
    scope,
    aud: TOKEN_URL,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=${encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer')}&assertion=${encodeURIComponent(jwt)}`,
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Error al obtener token de Service Account: ${res.status} ${text}`)
  }
  const data = await res.json()
  tokenCache = { token: data.access_token, exp: now + (data.expires_in || 3600) }
  return data.access_token
}
