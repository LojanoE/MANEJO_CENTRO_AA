export type AuthStatus = 'Aprobado' | 'Pendiente' | 'Denegado' | 'En revisión'

export interface MedicalAuth {
  id: string
  patientId: string | null
  patientName: string
  doctorId?: string | null
  doctorName?: string | null
  date: string
  type: string
  status: AuthStatus
  notes: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewMedicalAuth = Omit<MedicalAuth, 'id'>
export type MedicalAuthInput = Omit<NewMedicalAuth, 'patientName' | 'doctorName' | 'createdAt' | 'updatedAt'>