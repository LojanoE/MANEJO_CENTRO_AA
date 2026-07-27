import { getFunctions, httpsCallable } from 'firebase/functions'
import { app } from './config'

const fns = getFunctions(app)

interface UploadArgs { folderSubpath: string; fileName: string; mimeType: string; base64: string }
interface UploadReturn { fileId: string; webViewLink: string }
interface PreviewArgs { fileId: string; size?: number }
interface PreviewReturn { thumbnailLink?: string; webViewLink?: string; mimeType?: string }
interface ListArgs { folderSubpath: string }
interface ListReturn { files: Array<{ id: string; name: string; mimeType?: string; webViewLink?: string; thumbnailLink?: string; modifiedTime?: string }> }
interface TestReturn { ok: boolean; rootId: string; rootName?: string; saEmail?: string }

export async function uploadDriveFileCall(folderSubpath: string, fileName: string, file: File): Promise<UploadReturn> {
  const base64 = await fileToBase64(file)
  const call = httpsCallable<UploadArgs, UploadReturn>(fns, 'uploadDriveFile')
  return (await call({ folderSubpath, fileName, mimeType: file.type, base64 })).data
}

export async function listDriveFilesCall(folderSubpath: string): Promise<ListReturn> {
  const call = httpsCallable<ListArgs, ListReturn>(fns, 'listDriveFolder')
  return (await call({ folderSubpath })).data
}

export async function getDrivePreviewCall(fileId: string, size = 500): Promise<PreviewReturn> {
  const call = httpsCallable<PreviewArgs, PreviewReturn>(fns, 'getDrivePreview')
  return (await call({ fileId, size })).data
}

export async function deleteDriveFileCall(fileId: string): Promise<void> {
  const call = httpsCallable<{ fileId: string }, { ok: boolean }>(fns, 'removeDriveFile')
  await call({ fileId })
}

export async function testDriveConnectionCall(): Promise<TestReturn> {
  const call = httpsCallable<void, TestReturn>(fns, 'testDriveConnection')
  return (await call()).data
}

export async function listBackupsCall(): Promise<ListReturn> {
  const call = httpsCallable<void, ListReturn>(fns, 'listBackups')
  return (await call()).data
}

export async function triggerBackupCall(): Promise<{ ok: boolean; date: string }> {
  const call = httpsCallable<void, { ok: boolean; date: string }>(fns, 'triggerBackup')
  return (await call()).data
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result as string
      resolve(r.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}