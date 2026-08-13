import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  getIdTokenResult,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db, firebaseConfig } from '../firebase/config'
import { getServiceAccountToken } from './serviceAccount'
import type { UserProfile, Role } from '../types/user'

interface IdentityToolkitError {
  error?: {
    message?: string
  }
}

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  EMAIL_EXISTS: 'Ya existe una cuenta con ese correo electrónico.',
  INVALID_EMAIL: 'El correo electrónico no es válido.',
  WEAK_PASSWORD: 'La contraseña es demasiado débil (mínimo 6 caracteres).',
  INVALID_PASSWORD: 'La contraseña no cumple con los requisitos.',
  TOO_MANY_ATTEMPTS_TRY_LATER: 'Demasiados intentos. Intenta más tarde.',
  OPERATION_NOT_ALLOWED: 'El registro por correo/contraseña no está habilitado en Firebase Console.',
}

const INTERNAL_EMAIL_DOMAIN = 'centro-aa.internal'

export function toInternalEmail(username: string): string {
  return `${username}@${INTERNAL_EMAIL_DOMAIN}`
}

export function isUsernameIdentifier(identifier: string): boolean {
  return !identifier.includes('@')
}

function resolveLoginEmail(identifier: string): string {
  return isUsernameIdentifier(identifier) ? toInternalEmail(identifier) : identifier
}

function translateAuthError(err: unknown): string {
  const message = (err as IdentityToolkitError)?.error?.message
  if (typeof message === 'string' && message in AUTH_ERROR_MESSAGES) {
    return AUTH_ERROR_MESSAGES[message]
  }
  if (message) return message
  return 'Error al crear el usuario en Firebase Authentication.'
}

/**
 * Create a Firebase Auth user via the Identity Toolkit REST API.
 * This keeps the current admin session intact (unlike createUserWithEmailAndPassword).
 */
export async function createAuthUser(username: string, password: string): Promise<string> {
  const apiKey = firebaseConfig.apiKey
  if (!apiKey) {
    throw new Error('Falta la API key de Firebase. Revisa apps/web/.env.')
  }

  const email = toInternalEmail(username)
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  )

  const data = await res.json()
  if (!res.ok) {
    const msg = translateAuthError({ error: data.error })
    if (msg.includes('correo electrónico')) {
      throw new Error('Ya existe un usuario con ese nombre de usuario.')
    }
    throw new Error(msg)
  }
  return data.localId as string
}

/**
 * Delete a Firebase Auth user via the Identity Toolkit REST API using a Service Account token.
 * This allows an admin to delete other users without being logged in as them.
 */
export async function deleteAuthUser(uid: string): Promise<void> {
  const apiKey = firebaseConfig.apiKey
  const projectId = firebaseConfig.projectId
  if (!apiKey || !projectId) {
    throw new Error('Faltan API key o Project ID de Firebase.')
  }

  const token = await getServiceAccountToken('https://www.googleapis.com/auth/identitytoolkit')
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:batchDelete?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ localIds: [uid] }),
    },
  )

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[auth] delete failed', data)
    throw new Error(translateAuthError({ error: data.error }) || 'Error al eliminar usuario de Firebase Authentication.')
  }
}

/** Sign in and persist the local profile in Firestore.
 *  Accepts either a username or a legacy email address.
 */
export async function signIn(identifier: string, password: string): Promise<UserProfile> {
  const email = resolveLoginEmail(identifier)
  const cred = await signInWithEmailAndPassword(auth, email, password)
  const profile = await fetchUserProfile(cred.user)
  await setDoc(
    doc(db, 'users', cred.user.uid),
    { lastLogin: serverTimestamp() },
    { merge: true },
  )
  return profile
}

export async function signOut(): Promise<void> {
  await fbSignOut(auth)
}

/**
 * Reset a user's password via the Identity Toolkit REST API using a Service Account token.
 * This allows an admin to reset passwords without sending an email.
 */
export async function resetAuthUserPassword(uid: string, newPassword: string): Promise<void> {
  const apiKey = firebaseConfig.apiKey
  const projectId = firebaseConfig.projectId
  if (!apiKey || !projectId) {
    throw new Error('Faltan API key o Project ID de Firebase.')
  }
  if (newPassword.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.')
  }

  const token = await getServiceAccountToken('https://www.googleapis.com/auth/identitytoolkit')
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:update?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ localId: uid, password: newPassword }),
    },
  )

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    console.error('[auth] reset password failed', data)
    throw new Error(translateAuthError({ error: data.error }) || 'Error al cambiar la contraseña.')
  }
}

/** Returns the role from custom claims (set via setUserRole Cloud Function). */
export async function getRoleFromClaims(user: User): Promise<Role | null> {
  await user.getIdToken(true) // force refresh
  const token = await getIdTokenResult(user)
  return (token.claims.role as Role) ?? null
}

export async function fetchUserProfile(user: User): Promise<UserProfile> {
  const snap = await getDoc(doc(db, 'users', user.uid))
  if (!snap.exists()) {
    throw new Error('Perfil de usuario no encontrado en Firestore')
  }
  return { uid: user.uid, ...(snap.data() as Omit<UserProfile, 'uid'>) }
}

export function subscribeAuthState(
  cb: (user: User | null, profile: UserProfile | null) => void,
): () => void {
  return onAuthStateChanged(auth, async (user) => {
    if (!user) {
      cb(null, null)
      return
    }
    try {
      const profile = await fetchUserProfile(user)
      cb(user, profile)
    } catch (err) {
      console.error('[auth] profile fetch error', err)
      cb(user, null)
    }
  })
}