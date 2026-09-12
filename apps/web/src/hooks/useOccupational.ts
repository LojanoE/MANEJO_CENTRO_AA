import { useCallback } from 'react'
import { newest, useSubcollection } from './useCollection'
import { saveSubDoc, updateSubDoc, removeSubDoc, logActivity } from '../firebase/firestore'
import { useAuthStore } from '../stores/authStore'
import type { Patient } from '../types/patient'
import type { NewOccupationalEntry, OccupationalEntry } from '../types/occupational'

/** Evaluaciones ocupacionales de un paciente (`patients/{id}/occupational`),
 * en vivo, de la más reciente a la más antigua. */
export function usePatientOccupational(patient: Patient | null | undefined) {
  const { data: entries, loading, error } = useSubcollection<OccupationalEntry>(
    'patients',
    patient?.id ?? '__none__',
    'occupational',
    newest('createdAt'),
  )

  const create = useCallback(
    async (input: NewOccupationalEntry) => {
      if (!patient) throw new Error('Paciente no encontrado.')
      const user = useAuthStore.getState().user
      const id = await saveSubDoc('patients', patient.id, 'occupational', {
        ...input,
        patientId: patient.id,
        authorId: user?.uid ?? null,
        authorName: user?.name ?? null,
      })
      await logActivity({
        type: 'new_record',
        message: 'Evaluación ocupacional registrada',
        submessage: patient.name,
        refId: patient.id,
        color: 'bg-sky-500',
        icon: '🧩',
      })
      return id
    },
    [patient],
  )

  const update = useCallback(async (entry: OccupationalEntry, patch: Partial<NewOccupationalEntry>) => {
    await updateSubDoc('patients', entry.patientId, 'occupational', entry.id, patch)
  }, [])

  const remove = useCallback(
    async (entry: OccupationalEntry) => {
      await removeSubDoc('patients', entry.patientId, 'occupational', entry.id)
      await logActivity({
        type: 'record_deleted',
        message: 'Evaluación ocupacional eliminada',
        submessage: patient?.name ?? null,
        refId: entry.patientId,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [patient],
  )

  return { entries, loading, error, create, update, remove }
}
