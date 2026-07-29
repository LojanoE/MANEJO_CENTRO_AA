import { useCallback } from 'react'
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useCollection } from './useCollection'
import { updateDocHelper, logActivity } from '../firebase/firestore'
import { db } from '../firebase/config'
import { createAuthUser } from '../firebase/auth'
import type { UserProfile, Role } from '../types/user'

interface CreateUserArgs {
  name: string
  email: string
  password: string
  role: Role
  status?: 'Activo' | 'Inactivo'
}

export function useUsers() {
  const { data: rawUsers, loading, error } = useCollection<UserProfile>('users')
  const users = rawUsers.map((u) => ({ ...u, uid: u.uid ?? u.id }))

  const create = useCallback(async (args: CreateUserArgs) => {
    const uid = await createAuthUser(args.email, args.password)
    await setDoc(doc(db, 'users', uid), {
      uid,
      name: args.name,
      email: args.email,
      role: args.role,
      status: args.status ?? 'Activo',
      lastLogin: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    await logActivity({
      type: 'new_user',
      message: 'Usuario creado desde la plataforma',
      submessage: `${args.name} · ${args.email}`,
      refId: uid,
      color: 'bg-violet-500',
      icon: '🔐',
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

  return { users, loading, error, create, setRole, toggleStatus, updateProfile }
}