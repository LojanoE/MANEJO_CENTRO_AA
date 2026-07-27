import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { defineSecret } from 'firebase-functions/params'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import { uploadToDrive, listDriveFiles, getFilePreview, deleteDriveFile, testDriveAccess } from './drive'

initializeApp()
const db = getFirestore()

const driveSaSecret = defineSecret('DRIVE_SA')

/** Creates the first admin user — only works when no users exist (bootstrap). */
export const bootstrapAdmin = onCall(async (req) => {
  const existing = await db.collection('users').limit(1).get()
  if (!existing.empty) {
    throw new HttpsError('failed-precondition', 'Ya existe al menos un usuario. Use el flujo normal de invitation.')
  }
  const { name, email, password } = req.data ?? {}
  if (!name || !email || !password || password.length < 6) {
    throw new HttpsError('invalid-argument', 'name, email y password (>=6 chars) son obligatorios')
  }
  const created = await getAuth().createUser({ email, password, displayName: name })
  await getAuth().setCustomUserClaims(created.uid, { role: 'admin' })
  await db.collection('users').doc(created.uid).set({
    name,
    email,
    role: 'admin',
    status: 'Activo',
    lastLogin: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { uid: created.uid }
})

/** Creates a user (admin / medico / administrativo) — admin only */
export const createUser = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const callerSnap = await db.collection('users').doc(req.auth.uid).get()
  if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores')
  }
  const { name, email, password, role, status } = req.data ?? {}
  if (!name || !email || !password || !['admin', 'medico', 'administrativo'].includes(role)) {
    throw new HttpsError('invalid-argument', 'Parámetros inválidos')
  }
  const created = await getAuth().createUser({ email, password, displayName: name })
  await getAuth().setCustomUserClaims(created.uid, { role })
  await db.collection('users').doc(created.uid).set({
    name,
    email,
    role,
    status: status || 'Activo',
    lastLogin: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
  return { uid: created.uid }
})

/** Sets a custom role claim on a user — admin only */
export const setUserRole = onCall(async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const { uid: callerUid } = req.auth
  const callerSnap = await db.collection('users').doc(callerUid).get()
  if (!callerSnap.exists || callerSnap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores')
  }

  const { uid, role } = req.data ?? {}
  if (!uid || !['admin', 'medico', 'administrativo'].includes(role)) {
    throw new HttpsError('invalid-argument', 'uid y role inválidos')
  }

  await getAuth().setCustomUserClaims(uid, { role })
  await db.collection('users').doc(uid).update({ role, updatedAt: FieldValue.serverTimestamp() })
  return { ok: true }
})

/** Upload a file to the shared Drive folder — authenticated staff only */
export const uploadDriveFile = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const { folderSubpath, fileName, mimeType, base64 } = req.data ?? {}
  if (!folderSubpath || !fileName || !mimeType || !base64) {
    throw new HttpsError('invalid-argument', 'Faltan parámetros')
  }
  const buffer = Buffer.from(base64, 'base64')
  const result = await uploadToDrive(folderSubpath, fileName, mimeType, buffer)
  return result
})

/** Lists files inside a Drive subfolder */
export const listDriveFolder = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const { folderSubpath } = req.data ?? {}
  if (!folderSubpath) throw new HttpsError('invalid-argument', 'folderSubpath requerido')
  return { files: await listDriveFiles(folderSubpath) }
})

/** Returns a thumbnail/preview link for a stored file — authenticated staff only. */
export const getDrivePreview = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const { fileId, size } = req.data ?? {}
  if (!fileId) throw new HttpsError('invalid-argument', 'fileId requerido')
  return await getFilePreview(fileId, typeof size === 'number' ? size : 500)
})

/** Deletes a Drive file by id — admin only. */
export const removeDriveFile = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const snap = await db.collection('users').doc(req.auth.uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores pueden eliminar archivos')
  }
  const { fileId } = req.data ?? {}
  if (!fileId) throw new HttpsError('invalid-argument', 'fileId requerido')
  await deleteDriveFile(fileId)
  return { ok: true }
})

/** Tests whether the Service Account can access the configured Drive folder. Admin only. */
export const testDriveConnection = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const snap = await db.collection('users').doc(req.auth.uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores')
  }
  return await testDriveAccess()
})

/** Lists backup files in the backup folder. Admin only. */
export const listBackups = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const snap = await db.collection('users').doc(req.auth.uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores')
  }
  return { files: await listDriveFiles('backups/firestore') }
})

/** Manual backup trigger — admin only (useful before schema changes). */
export const triggerBackup = onCall({ secrets: [driveSaSecret] }, async (req) => {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Debe iniciar sesión')
  const snap = await db.collection('users').doc(req.auth.uid).get()
  if (!snap.exists || snap.data()?.role !== 'admin') {
    throw new HttpsError('permission-denied', 'Solo administradores')
  }
  await runBackup()
  return { ok: true, date: new Date().toISOString().slice(0, 10) }
})

async function runBackup() {
  const collections = ['users', 'patients', 'professionals', 'payments', 'visits', 'medicalAuths', 'medicalRecords', 'tasks', 'settings', 'activityLog']
  const snapshot: Record<string, unknown> = {}
  for (const name of collections) {
    const snap = await db.collection(name).get()
    snapshot[name] = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }
  const dateStr = new Date().toISOString().slice(0, 10)
  const buffer = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8')
  await uploadToDrive(`backups/firestore/${dateStr}`, 'firestore-export.json', 'application/json', buffer)
  console.log(`Backup ${dateStr} uploaded`)
}

/** Daily backup of selected collections to Drive as JSON */
export const dailyBackup = onSchedule(
  { schedule: '0 3 * * *', timeZone: 'America/Guayaquil', secrets: [driveSaSecret] },
  async () => {
    await runBackup()
  },
)