import type { Role } from '../types/user'

export interface Professional {
  id: string
  uid?: string | null
  name: string
  role: Role
  specialty?: string
  phone?: string
  email?: string
  /** Cédula: sección "Datos del profesional responsable" de los formularios MSP. */
  idCard?: string
  /** Registro profesional (MSP / Senescyt) que va junto a la firma y el sello. */
  registro?: string
  active: boolean
  createdAt?: unknown
  updatedAt?: unknown
}

export type ProfessionalInput = Omit<Professional, 'id' | 'createdAt' | 'updatedAt'>

export interface Settings {
  centerName: string
  /** Membrete de impresión (Configuración): línea bajo el nombre del centro. */
  centerSubtitle?: string
  centerPhone?: string
  centerAddress?: string
  /** Código del establecimiento / unidad operativa para los formularios MSP. */
  establishmentCode?: string
  logoUrl?: string | null
  logoFileId?: string | null
  monthlyFee: number
  taskCategories: string[]
  driveFolderId?: string | null
  backupSchedule?: string | null
  updatedAt?: unknown
}