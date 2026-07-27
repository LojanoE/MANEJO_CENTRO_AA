import { useCallback } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useCollection } from './useCollection'
import { updateDocHelper, logActivity } from '../firebase/firestore'
import { callFunction } from '../firebase/drive'
import { db } from '../firebase/config'
import type { UserProfile, Role } from '../types/user'

interface CreateUserArgs {
  name: string
  email: string
  password: string
  role: Role
  status?: 'Activo' | 'Inactivo'
}

export function useUsers() {
  const { data: users, loading, error } = useCollection<UserProfile>('users')

  const create = useCallback(async (args: CreateUserArgs) => {
    const uid = await callFunction<CreateUserArgs, { uid: string }>('createUser', args)
    await logActivity({
      type: 'new_user',
      message: `Nuevo usuario: ${args.name}`,
      submessage: `${args.role} · ${args.email}`,
      refId: uid.uid,
      color: 'bg-violet-500',
      icon: '🔐',
    })
    return uid.uid
  }, [])

  const setRole = useCallback(async (uid: string, role: Role) => {
    await callFunction('setUserRole', { uid, role })
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