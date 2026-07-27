import { google } from 'googleapis'
import { getFirestore } from 'firebase-admin/firestore'

/**
 * Google Drive integration using a Service Account.
 * - The Service Account JSON is read from the Functions Secret `DRIVE_SA`
 *   (set with `firebase functions:secrets:set DRIVE_SA`).
 * - The root folder ID is read from Firestore settings/main/driveFolderId,
 *   falling back to env var DRIVE_ROOT_FOLDER_ID.
 * - The Drive folder must be shared with the SA email.
 */

let _driveClient: ReturnType<typeof google.drive> | null = null

function getDriveClient() {
  if (_driveClient) return _driveClient
  const saRaw = process.env.DRIVE_SA
  if (!saRaw) throw new Error('DRIVE_SA secret not configured')
  const sa = JSON.parse(saRaw)
  const auth = new google.auth.JWT({
    email: sa.client_email,
    key: sa.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  _driveClient = google.drive({ version: 'v3', auth })
  return _driveClient
}

async function getRootFolderId(): Promise<string> {
  // Prefer Firestore settings/main if set
  try {
    const snap = await getFirestore().collection('settings').doc('main').get()
    const cfgId = snap.data()?.driveFolderId
    if (typeof cfgId === 'string' && cfgId.trim().length > 0) return cfgId.trim()
  } catch {
    // ignore — fall through
  }
  const envId = process.env.DRIVE_ROOT_FOLDER_ID
  if (!envId) throw new Error('No Drive root folder ID configured. Set it in Settings ▸ Drive or env DRIVE_ROOT_FOLDER_ID.')
  return envId
}

async function ensureFolder(path: string): Promise<string> {
  const parts = path.split('/').filter(Boolean)
  let parentId = ''
  for (const part of parts) {
    const drive = getDriveClient()
    const list = await drive.files.list({
      q: `name='${escapeQuery(part)}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${escapeQuery(parentId)}' in parents`,
      fields: 'files(id)',
      spaces: 'drive',
    })
    if (list.data.files && list.data.files.length > 0) {
      parentId = list.data.files[0].id!
    } else {
      const created = await drive.files.create({
        requestBody: {
          name: part,
          mimeType: 'application/vnd.google-apps.folder',
          parents: parentId ? [parentId] : [],
        },
        fields: 'id',
      })
      parentId = created.data.id!
    }
  }
  return parentId
}

export async function uploadToDrive(
  folderSubpath: string,
  fileName: string,
  mimeType: string,
  buffer: Buffer,
): Promise<{ fileId: string; webViewLink: string }> {
  const drive = getDriveClient()
  const parentId = await ensureFolder(folderSubpath)
  const created = await drive.files.create({
    requestBody: { name: fileName, parents: parentId ? [parentId] : [] },
    media: { mimeType, body: require('stream').Readable.from(buffer) },
    fields: 'id, webViewLink',
  })
  return {
    fileId: created.data.id!,
    webViewLink: created.data.webViewLink ?? '',
  }
}

export async function listDriveFiles(folderSubpath: string) {
  const drive = getDriveClient()
  const parentId = await ensureFolder(folderSubpath)
  const list = await drive.files.list({
    q: `'${escapeQuery(parentId)}' in parents and trashed=false`,
    fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink, thumbnailLink)',
    spaces: 'drive',
  })
  return list.data.files ?? []
}

/** Returns a short-lived thumbnail link for an image fileId (used in <img src>). */
export async function getFilePreview(fileId: string, size = 500): Promise<{ thumbnailLink?: string; webViewLink?: string; mimeType?: string }> {
  const drive = getDriveClient()
  const meta = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, webViewLink, thumbnailLink',
  })
  // Drive returns a thumbnailLink that's valid for a short time (a few hours).
  // Append size param for higher resolution when available.
  const thumb = meta.data.thumbnailLink
  const sizedThumb = thumb ? thumb.replace(/=s\d+$/, `=s${size}`) : undefined
  return {
    thumbnailLink: sizedThumb,
    webViewLink: meta.data.webViewLink ?? undefined,
    mimeType: meta.data.mimeType ?? undefined,
  }
}

/** Deletes a file by id. */
export async function deleteDriveFile(fileId: string): Promise<void> {
  const drive = getDriveClient()
  await drive.files.delete({ fileId })
}

/** Tests whether the Service Account can access the configured root folder. */
export async function testDriveAccess(): Promise<{ ok: boolean; rootId: string; rootName?: string; saEmail?: string }> {
  const rootId = await getRootFolderId()
  const drive = getDriveClient()
  const meta = await drive.files.get({ fileId: rootId, fields: 'id, name' })
  const saRaw = process.env.DRIVE_SA
  let saEmail: string | undefined
  try {
    saEmail = saRaw ? JSON.parse(saRaw).client_email : undefined
  } catch {
    saEmail = undefined
  }
  return { ok: true, rootId, rootName: meta.data.name ?? undefined, saEmail }
}

/** Escape single quotes for Drive query strings. */
function escapeQuery(s: string): string {
  return s.replace(/'/g, "\\'")
}