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
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MedicalRecord {
  id: string
  patientId: string
  patientName: string
  doctorId?: string | null
  doctorName?: string | null
  createdAt: string
  updatedAt: string
}

export type NewRecordEntry = Omit<RecordEntry, 'id'>
export type RecordEntryInput = Omit<NewRecordEntry, 'id'>