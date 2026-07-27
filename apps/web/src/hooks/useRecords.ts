import { useCallback } from 'react'
import { useCollection, useSubcollection, newest } from './useCollection'
import {
  saveDoc,
  saveSubDoc,
  updateDocHelper,
  updateSubDoc,
  removeSubDoc,
  logActivity,
} from '../firebase/firestore'
import { usePatients } from './usePatients'
import { useAuthStore } from '../stores/authStore'
import type { MedicalRecord, RecordEntry, RecordEntryInput, NewRecordEntry } from '../types/medicalRecord'

const todayISO = () => new Date().toISOString().slice(0, 10)

export function useRecords() {
  const { data: records, loading, error } = useCollection<MedicalRecord>('medicalRecords')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => {
      if (!patientId) return '—'
      return patients.find((p) => p.id === patientId)?.name ?? 'Paciente eliminado'
    },
    [patients],
  )

  /** Find an existing record for a patient. */
  const findRecordFor = useCallback(
    (patientId: string) => records.find((r) => r.patientId === patientId),
    [records],
  )

  /** Open a new medical record (first ficha) for a patient. */
  const openRecord = useCallback(
    async (patientId: string, firstEntry: RecordEntryInput) => {
      const user = useAuthStore.getState().user
      const patientName = resolvePatientName(patientId)
      const recordId = await saveDoc('medicalRecords', {
        patientId,
        patientName,
        doctorId: user?.uid ?? null,
        doctorName: user?.name ?? null,
        createdAt: todayISO(),
        updatedAt: todayISO(),
      })
      const entryPayload: NewRecordEntry = { ...firstEntry, recordId }
      await saveSubDoc('medicalRecords', recordId, 'entries', entryPayload)
      await logActivity({
        type: 'new_record',
        message: `Ficha médica abierta`,
        submessage: `${patientName} — ${firstEntry.title}`,
        refId: recordId,
        color: 'bg-violet-500',
        icon: '📝',
      })
      return recordId
    },
    [resolvePatientName],
  )

  /** Append an entry to an existing record. */
  const addEntry = useCallback(
    async (recordId: string, input: RecordEntryInput) => {
      const id = await saveSubDoc('medicalRecords', recordId, 'entries', { ...input, recordId })
      await updateDocHelper('medicalRecords', recordId, { updatedAt: todayISO() })
      const rec = records.find((r) => r.id === recordId)
      await logActivity({
        type: 'new_record',
        message: `Nueva entrada de seguimiento`,
        submessage: `${rec?.patientName ?? 'Paciente'} — ${input.title}`,
        refId: recordId,
        color: 'bg-blue-500',
        icon: '📝',
      })
      return id
    },
    [records],
  )

  const updateEntry = useCallback(
    async (recordId: string, entryId: string, patch: Partial<RecordEntryInput>) => {
      await updateSubDoc('medicalRecords', recordId, 'entries', entryId, patch)
      await updateDocHelper('medicalRecords', recordId, { updatedAt: todayISO() })
    },
    [],
  )

  const removeEntry = useCallback(
    async (recordId: string, entryId: string) => {
      await removeSubDoc('medicalRecords', recordId, 'entries', entryId)
      await updateDocHelper('medicalRecords', recordId, { updatedAt: todayISO() })
    },
    [],
  )

  return { records, patients, loading, error, findRecordFor, openRecord, addEntry, updateEntry, removeEntry }
}

/** Live entries for a specific record. */
export function useRecordEntries(recordId: string | null | undefined) {
  const { data, loading, error } = useSubcollection<RecordEntry>(
    'medicalRecords',
    recordId ?? '__none__',
    'entries',
    newest('date'),
  )
  return { entries: data, loading, error }
}