import { useCallback, useMemo } from 'react'
import { newest, useSubcollection } from './useCollection'
import { saveSubDoc, updateSubDoc, removeSubDoc, logActivity } from '../firebase/firestore'
import { useAuthStore } from '../stores/authStore'
import type { Patient } from '../types/patient'
import {
  isOccupationalSession,
  type NewOccupationalEntry,
  type OccupationalEntry,
  type OccupationalEvaluation,
  type OccupationalSession,
} from '../types/occupational'

const entryLabel = (entry: { kind?: string }) => (entry.kind === 'sesion' ? 'Atención ocupacional' : 'Evaluación ocupacional')

/** Registros ocupacionales de un paciente (`patients/{id}/occupational`), en
 * vivo: evaluaciones de la más reciente a la más antigua, y las atenciones de
 * la hoja de evolución en orden cronológico. */
export function usePatientOccupational(patient: Patient | null | undefined) {
  const { data: entries, loading, error } = useSubcollection<OccupationalEntry>(
    'patients',
    patient?.id ?? '__none__',
    'occupational',
    newest('createdAt'),
  )

  const evaluations = useMemo(() => entries.filter((e): e is OccupationalEvaluation => !isOccupationalSession(e)), [entries])
  const sessions = useMemo(
    () =>
      entries
        .filter(isOccupationalSession)
        .sort((a: OccupationalSession, b: OccupationalSession) => {
          const ka = `${a.date} ${a.hora ?? ''}`
          const kb = `${b.date} ${b.hora ?? ''}`
          return ka < kb ? -1 : ka > kb ? 1 : 0
        }),
    [entries],
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
        message: `${entryLabel(input)} registrada`,
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
        message: `${entryLabel(entry)} eliminada`,
        submessage: patient?.name ?? null,
        refId: entry.patientId,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [patient],
  )

  return { evaluations, sessions, loading, error, create, update, remove }
}
