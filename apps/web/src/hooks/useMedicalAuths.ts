import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { usePatients } from './usePatients'
import { useAuthStore } from '../stores/authStore'
import { resolvePatientName as resolvePatientNameFrom } from '../utils/patientName'
import type { MedicalAuth, MedicalAuthInput, NewMedicalAuth, AuthStatus } from '../types/medicalAuth'

export function useMedicalAuths() {
  const { data: auths, loading, error } = useCollection<MedicalAuth>('medicalAuths')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => resolvePatientNameFrom(patients, patientId),
    [patients],
  )

  const create = useCallback(
    async (input: MedicalAuthInput) => {
      const patientName = resolvePatientName(input.patientId)
      const user = useAuthStore.getState().user
      const data: NewMedicalAuth = {
        ...input,
        patientName,
        doctorName: user?.name ?? null,
        doctorId: user?.uid ?? null,
      }
      const id = await saveDoc('medicalAuths', data)
      await logActivity({
        type: 'auth_issued',
        message: `Autorización emitida: ${input.type}`,
        submessage: `${patientName} — ${input.status} · ${user?.name ?? ''}`,
        refId: id,
        color: 'bg-violet-500',
        icon: '🩺',
      })
      return id
    },
    [resolvePatientName],
  )

  const update = useCallback(async (id: string, patch: Partial<MedicalAuthInput>) => {
    await updateDocHelper('medicalAuths', id, patch)
  }, [])

  const setStatus = useCallback(
    async (a: MedicalAuth, status: AuthStatus) => {
      await updateDocHelper('medicalAuths', a.id, { status })
      const colorMap: Record<AuthStatus, string> = {
        Aprobado: 'bg-emerald-500',
        Pendiente: 'bg-amber-500',
        Denegado: 'bg-red-400',
        'En revisión': 'bg-blue-500',
      }
      await logActivity({
        type: 'auth_issued',
        message: `Autorización ${status.toLowerCase()}`,
        submessage: `${a.patientName} — ${a.type}`,
        refId: a.id,
        color: colorMap[status],
        icon: '🩺',
      })
    },
    [],
  )

  const remove = useCallback(async (a: MedicalAuth) => {
    await removeDoc('medicalAuths', a.id)
    await logActivity({
      type: 'auth_issued',
      message: `Autorización eliminada`,
      submessage: `${a.patientName} — ${a.type}`,
      refId: a.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { auths, patients, loading, error, create, update, setStatus, remove }
}

export const AUTH_STATUSES: AuthStatus[] = ['Pendiente', 'En revisión', 'Aprobado', 'Denegado']