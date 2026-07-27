export type Role = 'admin' | 'medico' | 'administrativo'

export interface UserProfile {
  uid: string
  name: string
  email: string
  role: Role
  status: 'Activo' | 'Inactivo'
  lastLogin: string | null
  photoDriveId?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}