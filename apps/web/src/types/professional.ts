import type { Role } from '../types/user'

export interface Professional {
  id: string
  uid?: string | null
  name: string
  role: Role
  specialty?: string
  phone?: string
  email?: string
  active: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export type ProfessionalInput = Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>

export interface Settings {
  centerName: string
  monthlyFee: number
  taskCategories: string[]
  driveFolderId?: string | null
  backupSchedule?: string | null
  updatedAt?: unknown
}