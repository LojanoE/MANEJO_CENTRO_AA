import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import type { Professional, ProfessionalInput } from '../types/professional'

export function useProfessionals() {
  const { data: professionals, loading, error } = useCollection<Professional>('professionals')

  const create = useCallback(async (input: ProfessionalInput) => {
    const id = await saveDoc('professionals', input)
    await logActivity({
      type: 'new_user',
      message: `Nuevo profesional: ${input.name}`,
      submessage: `${input.role} · ${input.specialty ?? ''}`,
      refId: id,
      color: 'bg-blue-500',
      icon: '🩺',
    })
    return id
  }, [])

  const update = useCallback(async (id: string, patch: Partial<ProfessionalInput>) => {
    await updateDocHelper('professionals', id, patch)
  }, [])

  const remove = useCallback(async (p: Professional) => {
    await removeDoc('professionals', p.id)
    await logActivity({
      type: 'new_user',
      message: `Profesional eliminado: ${p.name}`,
      submessage: p.role,
      refId: p.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { professionals, loading, error, create, update, remove }
}
