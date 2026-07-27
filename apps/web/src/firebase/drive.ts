import { getFunctions, httpsCallable, type HttpsCallableResult } from 'firebase/functions'
import { app } from './config'

const fns = getFunctions(app)

interface UploadArgs {
  folderSubpath: string
  fileName: string
  mimeType: string
  base64: string
}
interface UploadReturn { fileId: string; webViewLink: string }

/** Upload a file to Google Drive through the Cloud Function proxy. */
export async function uploadDriveFile(
  folderSubpath: string,
  fileName: string,
  file: File,
): Promise<UploadReturn> {
  const base64 = await fileToBase64(file)
  const call = httpsCallable<UploadArgs, UploadReturn>(fns, 'uploadDriveFile')
  const res = await call({ folderSubpath, fileName, mimeType: file.type, base64 })
  return res.data
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/** Helper to invoke any callable function */
export async function callFunction<TArgs, TRes>(name: string, args: TArgs): Promise<TRes> {
  const fn = httpsCallable<TArgs, TRes>(getFunctions(app), name)
  const res: HttpsCallableResult<TRes> = await fn(args)
  return res.data
}