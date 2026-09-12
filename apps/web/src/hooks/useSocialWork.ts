import { useCallback, useMemo } from 'react'
import { newest, useSubcollection } from './useCollection'
import { saveSubDoc, updateSubDoc, removeSubDoc, logActivity } from '../firebase/firestore'
import { useAuthStore } from '../stores/authStore'
import type { Patient } from '../types/patient'
import type { NewSocialWorkEntry, SocialWorkEntry, SocialWorkKind } from '../types/socialWork'

export const SOCIAL_KIND_LABELS: Record<SocialWorkKind, string> = {
  ficha: 'Ficha socioeconómica',
  seguimiento: 'Ficha de seguimiento social',
}

/** Registros de trabajo social de un paciente (`patients/{id}/socialWork`),
 * en vivo, del más reciente al más antiguo. */
export function usePatientSocialWork(patient: Patient | null | undefined) {
  const { data: entries, loading, error } = useSubcollection<SocialWorkEntry>(
    'patients',
    patient?.id ?? '__none__',
    'socialWork',
    newest('createdAt'),
  )

  const fichas = useMemo(() => entries.filter((e) => e.kind === 'ficha'), [entries])
  const seguimientos = useMemo(() => entries.filter((e) => e.kind === 'seguimiento'), [entries])

  const create = useCallback(
    async (input: NewSocialWorkEntry) => {
      if (!patient) throw new Error('Paciente no encontrado.')
      const user = useAuthStore.getState().user
      const id = await saveSubDoc('patients', patient.id, 'socialWork', {
        ...input,
        patientId: patient.id,
        authorId: user?.uid ?? null,
        authorName: user?.name ?? null,
      })
      await logActivity({
        type: 'new_record',
        message: `Trabajo social: ${SOCIAL_KIND_LABELS[input.kind]}`,
        submessage: patient.name,
        refId: patient.id,
        color: 'bg-amber-500',
        icon: '🏠',
      })
      return id
    },
    [patient],
  )

  const update = useCallback(async (entry: SocialWorkEntry, patch: Partial<NewSocialWorkEntry>) => {
    await updateSubDoc('patients', entry.patientId, 'socialWork', entry.id, patch)
  }, [])

  const remove = useCallback(
    async (entry: SocialWorkEntry) => {
      await removeSubDoc('patients', entry.patientId, 'socialWork', entry.id)
      await logActivity({
        type: 'record_deleted',
        message: `Trabajo social: ${SOCIAL_KIND_LABELS[entry.kind]} eliminado`,
        submessage: patient?.name ?? null,
        refId: entry.patientId,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [patient],
  )

  return { entries, fichas, seguimientos, loading, error, create, update, remove }
}
