export type PatientStage = 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4'
export type PatientStatus = 'Activo' | 'Nuevo' | 'Alta' | 'Inactivo'

export interface Patient {
  id: string
  name: string
  age: number
  stage: PatientStage
  status: PatientStatus
  admission: string // ISO date yyyy-mm-dd
  phone: string
  email?: string
  address?: string
  sponsor?: string
  assignedDoctorId?: string | null
  assignedDoctorName?: string | null
  photoDriveId?: string | null
  photoUrl?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewPatient = Omit<Patient, 'id'> & { id?: string }
export type PatientInput = Omit<NewPatient, 'photoDriveId' | 'photoUrl' | 'assignedDoctorName' | 'createdAt' | 'updatedAt'>