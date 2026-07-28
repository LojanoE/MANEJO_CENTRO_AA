import {
  uploadDriveFile,
  listDriveFiles,
  getDrivePreview,
  deleteDriveFile,
  testDriveConnection,
  exportBackupToDrive,
} from './drive'

export { uploadDriveFile }

export async function uploadDriveFileCall(
  folderSubpath: string,
  fileName: string,
  file: File,
): Promise<{ fileId: string; webViewLink: string }> {
  return await uploadDriveFile(folderSubpath, fileName, file)
}

export async function listDriveFilesCall(folderSubpath: string): Promise<{
  files: Array<{
    id: string
    name: string
    mimeType?: string
    modifiedTime?: string
    webViewLink?: string
    thumbnailLink?: string
  }>
}> {
  return { files: await listDriveFiles(folderSubpath) }
}

export async function getDrivePreviewCall(
  fileId: string,
  size = 500,
): Promise<{ thumbnailLink?: string; webViewLink?: string; mimeType?: string }> {
  return await getDrivePreview(fileId, size)
}

export async function deleteDriveFileCall(fileId: string): Promise<void> {
  await deleteDriveFile(fileId)
}

export async function testDriveConnectionCall(): Promise<{
  ok: boolean
  rootId: string
  rootName?: string
  saEmail?: string
}> {
  return await testDriveConnection()
}

export async function listBackupsCall(): Promise<{
  files: Array<{
    id: string
    name: string
    mimeType?: string
    modifiedTime?: string
    webViewLink?: string
    thumbnailLink?: string
  }>
}> {
  return { files: await listDriveFiles('backups/firestore') }
}

export async function triggerBackupCall(): Promise<{ ok: boolean; date: string }> {
  return await exportBackupToDrive()
}
