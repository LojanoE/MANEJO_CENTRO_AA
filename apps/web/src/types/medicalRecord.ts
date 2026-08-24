export type EntryType = 'Apertura' | 'Seguimiento' | 'Emergencia' | 'Evaluación pre-visita' | 'Alta médica'

export interface RecordEntry {
  id: string
  recordId: string
  date: string
  type: EntryType
  title: string
  anamnesis: string
  antecedentes: string
  evaluacion: string
  diagnostico: string
  tratamiento: string
  evolucion: string
  observaciones: string
  /** Auth uid / name of whoever performed this attention. Optional because
   * entries written before this field existed don't have it — those fall back
   * to the parent record's doctor (see resolveAuthorUid in utils/weeklyReport.ts).
   * Set on creation only: editing an entry doesn't reassign who attended. */
  authorId?: string | null
  authorName?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MedicalRecord {
  id: string
  patientId: string
  patientName: string
  doctorId?: string | null
  doctorName?: string | null
  /** Written via serverTimestamp() (see saveDoc/updateDocHelper) — at runtime
   * this is a Firestore Timestamp, never a string. Format with
   * utils/date.ts#formatTimestamp before rendering; never render it directly. */
  createdAt: unknown
  updatedAt: unknown
}

export type NewRecordEntry = Omit<RecordEntry, 'id'>
export type RecordEntryInput = Omit<NewRecordEntry, 'id'>