import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  getIdTokenResult,
  type User,
} from 'firebase/auth'
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../firebase/config'
import type { UserProfile, Role } from '../types/user'

/** Sign in and persist the local profile in Firestore. */
export async function signIn(email: string, password: string): Promise<UserProfile> {
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