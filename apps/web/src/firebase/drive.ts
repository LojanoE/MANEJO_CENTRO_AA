import { collection, getDocs } from 'firebase/firestore'
import { db } from './config'
import { DRIVE_ROOT_FOLDER_ID } from '../config/drive'
import { getServiceAccountToken, getServiceAccount } from './serviceAccount'

const DRIVE_API = 'https://www.googleapis.com/drive/v3'
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files'

async function driveFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = await getServiceAccountToken('https://www.googleapis.com/auth/drive')
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  // Si el body es un Blob/File y no se indicó Content-Type, fetch seguirá usando el type del blob.
  return fetch(input, { ...init, headers })
}

function escapeQuery(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

async function findFolder(parentId: string, name: string): Promise<string | null> {
  const q =
    `name='${escapeQuery(name)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and ` +
    `'${escapeQuery(parentId)}' in parents`
  const res = await driveFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name)&spaces=drive`,
  )
  if (!res.ok) throw new Error('Error al buscar carpeta en Drive')
  const data = (await res.json()) as { files?: Array<{ id?: string; name?: string }> }
  return data.files?.[0]?.id ?? null
}

async function createFolder(parentId: string, name: string): Promise<string> {
  const res = await driveFetch(`${DRIVE_API}/files?fields=id`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: parentId ? [parentId] : [],
    }),
  })
  if (!res.ok) throw new Error('Error al crear carpeta en Drive')
  const data = (await res.json()) as { id: string }
  return data.id
}

async function ensureFolderPath(path: string): Promise<string> {
  const parts = path.split('/').filter(Boolean)
  let parentId = DRIVE_ROOT_FOLDER_ID
  if (!parentId) throw new Error('DRIVE_ROOT_FOLDER_ID no configurado')
  for (const part of parts) {
    const existing = await findFolder(parentId, part)
    parentId = existing ?? (await createFolder(parentId, part))
  }
  return parentId
}

export interface UploadReturn {
  fileId: string
  webViewLink: string
}

export async function uploadDriveFile(
  folderSubpath: string,
  fileName: string,
  file: File,
): Promise<UploadReturn> {
  const parentId = await ensureFolderPath(folderSubpath)
  const metadata = { name: fileName, parents: [parentId] }

  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', file, fileName)

  const res = await driveFetch(`${UPLOAD_API}?uploadType=multipart&fields=id,webViewLink`, {
    method: 'POST',
    body: form,
  })
  if (!res.ok) {
    const text = await res.text()
    console.error('[drive] upload failed', { status: res.status, body: text })
    throw new Error(`Error al subir archivo a Drive (${res.status}): ${text || 'revisa permisos de la cuenta de servicio y que Drive API esté habilitada'}`)
  }
  const data = (await res.json()) as { id: string; webViewLink: string }
  return { fileId: data.id, webViewLink: data.webViewLink }
}

export interface DriveFile {
  id: string
  name: string
  mimeType?: string
  modifiedTime?: string
  webViewLink?: string
  iconLink?: string
  thumbnailLink?: string
}

export async function listDriveFiles(folderSubpath: string): Promise<DriveFile[]> {
  const parentId = await ensureFolderPath(folderSubpath)
  const q = `'${escapeQuery(parentId)}' in parents and trashed=false`
  const res = await driveFetch(
    `${DRIVE_API}/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink,thumbnailLink)&spaces=drive&orderBy=${encodeURIComponent('modifiedTime desc')}`,
  )
  if (!res.ok) throw new Error('Error al listar archivos de Drive')
  const data = (await res.json()) as { files?: DriveFile[] }
  return data.files ?? []
}

export async function getDrivePreview(
  fileId: string,
  size = 500,
): Promise<{ thumbnailLink?: string; webViewLink?: string; mimeType?: string }> {
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,webViewLink,thumbnailLink`,
  )
  if (!res.ok) throw new Error('Error al obtener preview de Drive')
  const data = (await res.json()) as {
    thumbnailLink?: string
    webViewLink?: string
    mimeType?: string
  }
  const thumb = data.thumbnailLink
  return {
    thumbnailLink: thumb ? thumb.replace(/=s\d+$/, `=s${size}`) : undefined,
    webViewLink: data.webViewLink,
    mimeType: data.mimeType,
  }
}

export async function deleteDriveFile(fileId: string): Promise<void> {
  const res = await driveFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar archivo de Drive')
}

export async function testDriveConnection(): Promise<{
  ok: boolean
  rootId: string
  rootName?: string
  saEmail?: string
}> {
  const sa = getServiceAccount()
  const res = await driveFetch(
    `${DRIVE_API}/files/${encodeURIComponent(DRIVE_ROOT_FOLDER_ID)}?fields=id,name`,
  )
  if (!res.ok) throw new Error('No se pudo acceder a la carpeta raíz de Drive')
  const data = (await res.json()) as { id: string; name?: string }
  return { ok: true, rootId: data.id, rootName: data.name, saEmail: sa.client_email }
}

export async function exportBackupToDrive(): Promise<{ ok: boolean; date: string }> {
  const collections = [
    'users',
    'patients',
    'professionals',
    'payments',
    'visits',
    'medicalAuths',
    'medicalRecords',
    'tasks',
    'settings',
    'activityLog',
  ]
  const snapshot: Record<string, unknown> = {}
  for (const name of collections) {
    const snap = await getDocs(collection(db, name))
    snapshot[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  const dateStr = new Date().toISOString().slice(0, 10)
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' })
  const file = new File([blob], 'firestore-export.json', { type: 'application/json' })
  await uploadDriveFile(`backups/firestore/${dateStr}`, 'firestore-export.json', file)
  return { ok: true, date: dateStr }
}

/** @deprecated En modo piloto no hay Functions; esta utilidad lanza un error claro. */
export async function callFunction<TArgs, TRes>(_name: string, _args: TArgs): Promise<TRes> {
  throw new Error(
    'Cloud Functions no disponibles en modo piloto (Spark). Operación no soportada sin backend.',
  )
}
