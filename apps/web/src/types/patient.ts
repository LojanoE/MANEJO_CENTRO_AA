export type PatientStage = 'Fase 1' | 'Fase 2' | 'Fase 3' | 'Fase 4'
export type PatientStatus = 'Activo' | 'Nuevo' | 'Alta' | 'Inactivo'
export type PatientSex = 'M' | 'F' | ''
/** Zona de residencia del MSP 001: urbana / rural. */
export type PatientZone = 'U' | 'R' | ''

export interface EmergencyContact {
  name: string
  relationship: string
  phone: string
  address: string
}

export interface Patient {
  id: string
  name: string
  age: number
  stage: PatientStage
  status: PatientStatus
  admission: string // ISO date yyyy-mm-dd
  phone: string
  idCard?: string
  /** Requerido por los formularios MSP (002, 005, 001, 006). '' = sin registrar. */
  sex?: PatientSex
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
  photoFileId?: string | null
  photoUrl?: string | null

  // ── MSP 001 Admisión (Fase 2). Opcionales: los pacientes anteriores no los
  // tienen; `name` sigue siendo el nombre para mostrar en toda la app. ──
  fatherSurname?: string
  motherSurname?: string
  firstName?: string
  middleName?: string
  birthPlace?: string
  nationality?: string
  culturalGroup?: string
  neighborhood?: string
  parish?: string
  canton?: string
  province?: string
  zone?: PatientZone
  employer?: string
  insurance?: string
  referredBy?: string
  emergencyContact?: EmergencyContact
  /** Nombre de quien registró la primera admisión (el "admisionista" del formulario). */
  admittedByName?: string
  /** Sección 4 del MSP 001: información adicional. */
  additionalInfo?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewPatient = Omit<Patient, 'id'> & { id?: string }
export type PatientInput = Omit<NewPatient, 'assignedDoctorName' | 'createdAt' | 'updatedAt'>