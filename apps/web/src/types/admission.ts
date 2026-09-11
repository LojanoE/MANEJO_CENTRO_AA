import type { TipoEgreso } from './medicalRecord'

export type AdmissionKind = 'Primera' | 'Subsecuente'

/**
 * Un internamiento del paciente: `patients/{id}/admissions` (sección 2 del
 * MSP 001). Se abre al ingresar o reingresar y lo cierra la epicrisis (MSP 006).
 * Los pacientes creados antes de la Fase 2 no tienen documentos: su primera
 * admisión se deduce de la ficha hasta que se registre un reingreso o un alta.
 */
export interface Admission {
  id: string
  date: string
  age: number | null
  referredBy: string
  kind: AdmissionKind
  admittedByName: string
  dischargeDate?: string | null
  dischargeType?: TipoEgreso | null
  epicrisisEntryId?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type AdmissionInput = Omit<Admission, 'id' | 'createdAt' | 'updatedAt'>

/** Datos que el MSP 001 pide registrar cada vez que cambian (sección 3). */
export const TRACKED_CHANGE_FIELDS = [
  'maritalStatus',
  'education',
  'occupation',
  'employer',
  'insurance',
  'address',
  'neighborhood',
  'parish',
  'canton',
  'province',
  'phone',
] as const
export type TrackedChangeField = (typeof TRACKED_CHANGE_FIELDS)[number]

/** Foto de los datos DESPUÉS de un cambio: `patients/{id}/changes`. */
export type PatientChange = {
  id: string
  date: string
  changedByName: string | null
  changedFields: TrackedChangeField[]
  createdAt?: unknown
} & Record<TrackedChangeField, string>
