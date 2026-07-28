import { useCallback } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useCollection } from './useCollection'
import { updateDocHelper, logActivity } from '../firebase/firestore'
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

  const create = useCallback(async (_args: CreateUserArgs) => {
    throw new Error(
      'En modo piloto (Spark) los usuarios deben crearse manualmente en Firebase Console → Authentication, y luego asignar el rol en Firestore → users/{uid}.',
    )
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