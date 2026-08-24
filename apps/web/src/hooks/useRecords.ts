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
import { resolvePatientName as resolvePatientNameFrom } from '../utils/patientName'
import type { MedicalRecord, RecordEntry, RecordEntryInput, NewRecordEntry } from '../types/medicalRecord'

export function useRecords() {
  const { data: records, loading, error } = useCollection<MedicalRecord>('medicalRecords')
  const { patients } = usePatients()

  const resolvePatientName = useCallback(
    (patientId: string | null | undefined) => resolvePatientNameFrom(patients, patientId),
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
      // createdAt/updatedAt are not passed here: saveDoc always stamps them with
      // serverTimestamp() (firebase/firestore.ts), so anything set here would be
      // silently discarded — it's what made MedicalRecord.createdAt look like a
      // string in the type when at runtime it's a Firestore Timestamp.
      const recordId = await saveDoc('medicalRecords', {
        patientId,
        patientName,
        doctorId: user?.uid ?? null,
        doctorName: user?.name ?? null,
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
      await updateDocHelper('medicalRecords', recordId, {})
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

  /** Edit an existing entry. Takes the full entry (not just its id) so it has
   * the recordId and a title to fall back on for the activity log entry. */
  const updateEntry = useCallback(
    async (entry: RecordEntry, patch: Partial<RecordEntryInput>) => {
      await updateSubDoc('medicalRecords', entry.recordId, 'entries', entry.id, patch)
      await updateDocHelper('medicalRecords', entry.recordId, {})
      const rec = records.find((r) => r.id === entry.recordId)
      await logActivity({
        type: 'record_updated',
        message: 'Entrada de historial clínico editada',
        submessage: `${rec?.patientName ?? 'Paciente'} — ${patch.title ?? entry.title}`,
        refId: entry.recordId,
        color: 'bg-amber-500',
        icon: '✏️',
      })
    },
    [records],
  )

  const removeEntry = useCallback(
    async (entry: RecordEntry) => {
      await removeSubDoc('medicalRecords', entry.recordId, 'entries', entry.id)
      await updateDocHelper('medicalRecords', entry.recordId, {})
      const rec = records.find((r) => r.id === entry.recordId)
      await logActivity({
        type: 'record_deleted',
        message: 'Entrada de historial clínico eliminada',
        submessage: `${rec?.patientName ?? 'Paciente'} — ${entry.title}`,
        refId: entry.recordId,
        color: 'bg-red-400',
        icon: '🗑️',
      })
    },
    [records],
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
