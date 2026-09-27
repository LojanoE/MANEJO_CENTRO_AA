import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc } from '../firebase/firestore'
import { usePatients } from './usePatients'
import { useAuthStore } from '../stores/authStore'
import type { NewWorkLogEntry, WorkLogEntry, WorkLogInput } from '../types/workLog'

/**
 * Bitácora de actividades fuera de consulta (`workLogs`), en vivo. No pasa por
 * `logActivity`/`activityLog`: la bitácora ya es en sí el registro, y llenaría
 * el panel de actividad reciente del Dashboard con ruido ajeno al sistema.
 */
export function useWorkLog() {
  const { data: entries, loading, error } = useCollection<WorkLogEntry>('workLogs')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => {
      if (!patientId) return null
      return patients.find((p) => p.id === patientId)?.name ?? null
    },
    [patients],
  )

  const create = useCallback(
    async (input: WorkLogInput) => {
      const user = useAuthStore.getState().user
      const data: NewWorkLogEntry = {
        ...input,
        authorId: user?.uid ?? null,
        authorName: user?.name ?? null,
        patientName: resolvePatientName(input.patientId),
      }
      return saveDoc('workLogs', data)
    },
    [resolvePatientName],
  )

  const update = useCallback(
    async (entry: WorkLogEntry, patch: Partial<WorkLogInput>) => {
      const data: Partial<NewWorkLogEntry> = { ...patch }
      if ('patientId' in patch) data.patientName = resolvePatientName(patch.patientId)
      await updateDocHelper('workLogs', entry.id, data)
    },
    [resolvePatientName],
  )

  const remove = useCallback(async (entry: WorkLogEntry) => {
    await removeDoc('workLogs', entry.id)
  }, [])

  return { entries, loading, error, create, update, remove }
}
