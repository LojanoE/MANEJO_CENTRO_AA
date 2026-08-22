import type { Patient } from '../types/patient'

/** Resolve a patient's display name from an id — used to denormalize `patientName`
 * onto payments/visits/records/authorizations at write time. */
export function resolvePatientName(patients: Patient[], patientId: string | null | undefined): string {
  if (!patientId) return '—'
  return patients.find((p) => p.id === patientId)?.name ?? 'Paciente eliminado'
}
