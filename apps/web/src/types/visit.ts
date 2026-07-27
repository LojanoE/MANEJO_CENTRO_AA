export type VisitStatus = 'Aprobado' | 'Pendiente' | 'Denegado' | 'Requiere autorización'
export type VisitType = 'Familiar' | 'Externo'

export interface Visit {
  id: string
  patientId: string | null
  patientName: string
  visitor: string
  date: string // ISO
  time: string
  status: VisitStatus
  doctorId?: string | null
  doctorName?: string | null
  type: VisitType
  notes?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewVisit = Omit<Visit, 'id'>
export type VisitInput = Omit<NewVisit, 'patientName' | 'doctorName' | 'createdAt' | 'updatedAt'>