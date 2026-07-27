import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { uploadDriveFile } from '../firebase/drive'
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

  const uploadPhoto = useCallback(async (id: string, file: File) => {
    const res = await uploadDriveFile(
      `fotos_profesionales/${id}`,
      `profile-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`,
      file,
    )
    await updateDocHelper('professionals', id, { photoDriveId: res.fileId, photoUrl: res.webViewLink })
    return res
  }, [])

  return { professionals, loading, error, create, update, remove, uploadPhoto }
}