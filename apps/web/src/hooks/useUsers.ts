import { useCallback, useEffect, useRef, useState } from 'react'
import {
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { useCollection } from './useCollection'
import { updateDocHelper, logActivity } from '../firebase/firestore'
import { db } from '../firebase/config'
import { createAuthUser, deleteAuthUser, resetAuthUserPassword } from '../firebase/auth'
import type { UserProfile, Role } from '../types/user'

interface CreateUserArgs {
  username: string
  name: string
  email?: string | null
  password: string
  role: Role
  status?: 'Activo' | 'Inactivo'
}

interface UpdateUserArgs {
  name?: string
  email?: string | null
  role?: Role
  status?: 'Activo' | 'Inactivo'
}

function sanitizeUsername(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/[._-]{2,}/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('username', '==', username))
  const snap = await getDocs(q)
  return !snap.empty
}

function generateUsernameFromEmail(email: string, existing: Set<string>): string {
  const localPart = email.split('@')[0] ?? email
  let base = sanitizeUsername(localPart)
  if (!base) base = 'usuario'
  let candidate = base
  let i = 1
  while (existing.has(candidate)) {
    candidate = `${base}${i}`
    i++
  }
  return candidate
}

export function useUsers() {
  const { data: rawUsers, loading, error } = useCollection<UserProfile>('users')
  const users = rawUsers.map((u) => ({ ...u, uid: u.uid ?? u.id }))
  const ensuredRef = useRef(false)
  const [ensureError, setEnsureError] = useState<string | null>(null)

  // One-time migration: assign usernames to legacy users that don't have one.
  useEffect(() => {
    if (ensuredRef.current || rawUsers.length === 0) return
    const missing = rawUsers.filter((u) => !u.username)
    if (missing.length === 0) {
      ensuredRef.current = true
      return
    }

    const existing = new Set(rawUsers.map((u) => u.username).filter(Boolean) as string[])

    Promise.all(
      missing.map(async (u) => {
        const candidate = generateUsernameFromEmail(u.email ?? u.id, existing)
        existing.add(candidate)
        await updateDoc(doc(db, 'users', u.id), {
          username: candidate,
          updatedAt: serverTimestamp(),
        })
      }),
    )
      .then(() => {
        ensuredRef.current = true
      })
      .catch((err) => {
        console.error('[useUsers] ensure usernames failed', err)
        setEnsureError(err instanceof Error ? err.message : 'Error al migrar usuarios antiguos')
      })
  }, [rawUsers])

  const create = useCallback(async (args: CreateUserArgs) => {
    const username = sanitizeUsername(args.username)
    if (!username) {
      throw new Error('El nombre de usuario no es válido. Usa solo letras, números, puntos, guiones y guiones bajos.')
    }
    if (await isUsernameTaken(username)) {
      throw new Error('Ya existe un usuario con ese nombre. Elige otro.')
    }

    const uid = await createAuthUser(username, args.password)
    try {
      await setDoc(doc(db, 'users', uid), {
        uid,
        username,
        name: args.name,
        email: args.email ?? '',
        role: args.role,
        status: args.status ?? 'Activo',
        lastLogin: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    } catch (err) {
      // El perfil de Firestore no se pudo crear: revertimos la cuenta de Auth
      // para no dejar un usuario "fantasma" que existe pero no puede operar.
      try {
        await deleteAuthUser(uid)
      } catch (rollbackErr) {
        console.error('[useUsers] rollback de Auth falló tras error de Firestore', rollbackErr)
      }
      throw err
    }
    await logActivity({
      type: 'new_user',
      message: 'Usuario creado desde la plataforma',
      submessage: `${args.name} · @${username}`,
      refId: uid,
      color: 'bg-violet-500',
      icon: '🔐',
    })
  }, [])

  const update = useCallback(async (uid: string, args: UpdateUserArgs) => {
    await updateDocHelper('users', uid, { ...args, updatedAt: serverTimestamp() })
    await logActivity({
      type: 'user_updated',
      message: 'Usuario actualizado',
      submessage: `${args.name ?? uid}`,
      refId: uid,
      color: 'bg-blue-500',
      icon: '✏️',
    })
  }, [])

  const resetPassword = useCallback(async (uid: string, newPassword: string) => {
    await resetAuthUserPassword(uid, newPassword)
    await updateDocHelper('users', uid, { updatedAt: serverTimestamp() })
    await logActivity({
      type: 'user_updated',
      message: 'Contraseña restablecida por administrador',
      submessage: uid,
      refId: uid,
      color: 'bg-blue-500',
      icon: '🔑',
    })
  }, [])

  const remove = useCallback(async (u: UserProfile) => {
    // Borramos primero la cuenta de Auth: si falla, no queda nada a medias.
    // Si el borrado de Firestore falla después, solo queda un doc huérfano
    // (inofensivo: sin cuenta de Auth el usuario ya no puede iniciar sesión).
    await deleteAuthUser(u.uid)
    await deleteDoc(doc(db, 'users', u.uid))
    await logActivity({
      type: 'user_deleted',
      message: 'Usuario eliminado',
      submessage: `${u.name} · @${u.username}`,
      refId: u.uid,
      color: 'bg-red-500',
      icon: '🗑️',
    })
  }, [])

  const setRole = useCallback(async (uid: string, role: Role) => {
    await updateDocHelper('users', uid, { role, updatedAt: serverTimestamp() })
    await logActivity({
      type: 'new_user',
      message: `Rol actualizado: ${role}`,
      submessage: uid,
      refId: uid,
      color: 'bg-violet-500',
      icon: '🔐',
    })
  }, [])

  const toggleStatus = useCallback(async (u: UserProfile) => {
    const newStatus = u.status === 'Activo' ? 'Inactivo' : 'Activo'
    await updateDoc(doc(db, 'users', u.uid), { status: newStatus, updatedAt: serverTimestamp() })
    await logActivity({
      type: 'new_user',
      message: `Usuario ${newStatus === 'Activo' ? 'activado' : 'desactivado'}`,
      submessage: u.name,
      refId: u.uid,
      color: newStatus === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400',
      icon: newStatus === 'Activo' ? '✅' : '🚫',
    })
  }, [])

  const updateProfile = useCallback(async (uid: string, patch: Partial<UserProfile>) => {
    await updateDocHelper('users', uid, patch)
  }, [])

  return {
    users,
    loading,
    error: error ?? ensureError,
    create,
    update,
    resetPassword,
    remove,
    setRole,
    toggleStatus,
    updateProfile,
  }
}
