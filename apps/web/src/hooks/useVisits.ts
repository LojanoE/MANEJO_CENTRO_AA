import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { usePatients } from './usePatients'
import { useAuthStore } from '../stores/authStore'
import { resolvePatientName as resolvePatientNameFrom } from '../utils/patientName'
import type { Visit, VisitInput, NewVisit, VisitStatus } from '../types/visit'

export function useVisits() {
  const { data: visits, loading, error } = useCollection<Visit>('visits')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => resolvePatientNameFrom(patients, patientId),
    [patients],
  )

  const create = useCallback(
    async (input: VisitInput) => {
      const patientName = resolvePatientName(input.patientId)
      const user = useAuthStore.getState().user
      const data: NewVisit = {
        ...input,
        patientName,
        doctorName: user?.name ?? null,
        doctorId: user?.uid ?? null,
      }
      const id = await saveDoc('visits', data)
      await logActivity({
        type: 'visit_pending',
        message: `Solicitud de visita${input.status === 'Pendiente' ? ' pendiente' : ''}`,
        submessage: `${patientName} — ${input.visitor} · ${input.date} ${input.time}`,
        refId: id,
        color: 'bg-amber-500',
        icon: '📅',
      })
      return id
    },
    [resolvePatientName],
  )

  const update = useCallback(async (id: string, patch: Partial<VisitInput>) => {
    await updateDocHelper('visits', id, patch)
  }, [])

  const setStatus = useCallback(
    async (v: Visit, status: VisitStatus) => {
      await updateDocHelper('visits', v.id, { status })
      const colorMap: Record<VisitStatus, string> = {
        Aprobado: 'bg-emerald-500',
        Pendiente: 'bg-amber-500',
        Denegado: 'bg-red-400',
        'Requiere autorización': 'bg-blue-500',
      }
      const typeMap: Record<VisitStatus, 'visit_approved' | 'visit_denied' | 'visit_pending'> = {
        Aprobado: 'visit_approved',
        Denegado: 'visit_denied',
        Pendiente: 'visit_pending',
        'Requiere autorización': 'visit_pending',
      }
      await logActivity({
        type: typeMap[status],
        message: `Visita ${status.toLowerCase()}`,
        submessage: `${v.patientName} — ${v.visitor}`,
        refId: v.id,
        color: colorMap[status],
        icon: status === 'Aprobado' ? '✅' : status === 'Denegado' ? '🚫' : '📅',
      })
    },
    [],
  )

  const remove = useCallback(async (v: Visit) => {
    await removeDoc('visits', v.id)
    await logActivity({
      type: 'visit_denied',
      message: `Visita eliminada`,
      submessage: `${v.patientName} — ${v.visitor}`,
      refId: v.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { visits, patients, loading, error, create, update, setStatus, remove }
}

export const VISIT_STATUSES: VisitStatus[] = ['Pendiente', 'Aprobado', 'Denegado', 'Requiere autorización']
export const VISIT_TYPES: Visit['type'][] = ['Familiar', 'Externo']