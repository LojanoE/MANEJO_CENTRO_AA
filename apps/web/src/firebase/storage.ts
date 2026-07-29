import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage'
import { collection, getDocs } from 'firebase/firestore'
import { storage, db } from './config'

export interface UploadReturn {
  path: string
  url: string
}

/**
 * Upload a file to Firebase Storage under a given path.
 * Returns the storage path and a public download URL.
 */
export async function uploadStorageFile(
  folderPath: string,
  fileName: string,
  file: File,
): Promise<UploadReturn> {
  const fullPath = `${folderPath}/${fileName}`.replace(/\/+/g, '/')
  const storageRef = ref(storage, fullPath)
  await uploadBytes(storageRef, file)
  const url = await getDownloadURL(storageRef)
  return { path: fullPath, url }
}

/**
 * Get a fresh download URL for a storage path.
 */
export async function getStorageUrl(path: string): Promise<string> {
  const storageRef = ref(storage, path)
  return getDownloadURL(storageRef)
}

/**
 * Delete a file from Firebase Storage.
 */
export async function deleteStorageFile(path: string): Promise<void> {
  const storageRef = ref(storage, path)
  await deleteObject(storageRef)
}

/**
 * List files under a storage path (one level deep).
 */
export async function listStorageFiles(
  folderPath: string,
): Promise<Array<{ name: string; path: string; url: string }>> {
  const folderRef = ref(storage, folderPath)
  const res = await listAll(folderRef)
  const items = await Promise.all(
    res.items.map(async (item) => ({
      name: item.name,
      path: item.fullPath,
      url: await getDownloadURL(item),
    })),
  )
  return items
}

/**
 * Quick smoke test: try to list the root of the bucket.
 */
export async function testStorageConnection(): Promise<{ ok: boolean }> {
  const rootRef = ref(storage, 'backups')
  await listAll(rootRef)
  return { ok: true }
}

/**
 * Export all Firestore collections to a JSON file in Storage.
 */
export async function exportBackupToStorage(): Promise<{ ok: boolean; date: string }> {
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
  await uploadStorageFile(`backups/firestore/${dateStr}`, 'firestore-export.json', file)
  return { ok: true, date: dateStr }
}
