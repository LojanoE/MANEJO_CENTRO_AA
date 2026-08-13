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
  idCard?: string
  birthDate?: string // ISO date yyyy-mm-dd
  maritalStatus?: string
  religion?: string
  occupation?: string
  education?: string
  email?: string
  address?: string
  sponsor?: string
  assignedDoctorId?: string | null
  assignedDoctorName?: string | null
  monthlyFee?: number | null
  nextPaymentDate?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewPatient = Omit<Patient, 'id'> & { id?: string }
export type PatientInput = Omit<NewPatient, 'assignedDoctorName' | 'createdAt' | 'updatedAt'>