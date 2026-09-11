import { useCallback, useMemo } from 'react'
import { useSubcollection } from './useCollection'
import { saveSubDoc, updateSubDoc, removeSubDoc, logActivity } from '../firebase/firestore'
import { useAuthStore } from '../stores/authStore'
import type { Patient } from '../types/patient'
import type {
  NewPsychEntry,
  PsychEntry,
  PsychEntryKind,
  PsychEvaluation,
  PsychSession,
  PsychTestResult,
} from '../types/psychology'

export const PSYCH_KIND_LABELS: Record<PsychEntryKind, string> = {
  evaluacion: 'Historia clínica psicológica',
  sesion: 'Sesión psicológica',
  test: 'Test psicológico',
}

/** Orden cronológico por fecha y hora. */
export function comparePsychAsc(a: Pick<PsychEntry, 'date' | 'hora'>, b: Pick<PsychEntry, 'date' | 'hora'>): number {
  const ka = `${a.date} ${a.hora ?? ''}`
  const kb = `${b.date} ${b.hora ?? ''}`
  return ka < kb ? -1 : ka > kb ? 1 : 0
}

/** Registros de psicología de un paciente (`patients/{id}/psychology`), en vivo. */
export function usePatientPsychology(patient: Patient | null | undefined) {
  const { data, loading, error } = useSubcollection<PsychEntry>('patients', patient?.id ?? '__none__', 'psychology')

  const entries = useMemo(() => [...data].sort(comparePsychAsc), [data])
  const evaluations = useMemo(() => entries.filter((e): e is PsychEvaluation => e.kind === 'evaluacion'), [entries])
  const sessions = useMemo(() => entries.filter((e): e is PsychSession => e.kind === 'sesion'), [entries])
  const tests = useMemo(() => entries.filter((e): e is PsychTestResult => e.kind === 'test'), [entries])

  const create = useCallback(
    async (input: NewPsychEntry) => {
      if (!patient) throw new Error('Paciente no encontrado.')
      const user = useAuthStore.getState().user
      const id = await saveSubDoc('patients', patient.id, 'psychology', {
        ...input,
        patientId: patient.id,
        authorId: user?.uid ?? null,
        authorName: user?.name ?? null,
      })
      await logActivity({
        type: 'new_record',
        message: `Psicología: ${PSYCH_KIND_LABELS[input.kind]}`,
        submessage: patient.name,
        refId: patient.id,
        color: 'bg-fuchsia-500',
        icon: '🧠',
      })
      return id
    },
    [patient],
  )

  const update = useCallback(async (entry: PsychEntry, patch: Partial<NewPsychEntry>) => {
    await updateSubDoc('patients', entry.patientId, 'psychology', entry.id, patch)
  }, [])

  const remove = useCallback(
    async (entry: PsychEntry) => {
      await removeSubDoc('patients', entry.patientId, 'psychology', entry.id)
      await logActivity({
        type: 'record_deleted',
        message: `Psicología: ${PSYCH_KIND_LABELS[entry.kind]} eliminado`,
        submessage: patient?.name ?? null,
        refId: entry.patientId,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [patient],
  )

  return { entries, evaluations, sessions, tests, loading, error, create, update, remove }
}
