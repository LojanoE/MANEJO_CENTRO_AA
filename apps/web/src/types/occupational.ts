import type { FormAnswers } from '../config/formTemplates/types'

/**
 * Área de Terapia Ocupacional (Fase 4). Vive en `patients/{id}/occupational`:
 * un solo formato (evaluación por criterios), con reevaluaciones a lo largo
 * del internamiento. Igual que Trabajo Social, la fecha vive en `answers`
 * (el formato ya tiene su propia casilla "Fecha" pre-llenada al crear).
 */
export interface OccupationalEntry {
  id: string
  patientId: string
  templateId: string
  answers: FormAnswers
  authorId?: string | null
  authorName?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewOccupationalEntry = Omit<OccupationalEntry, 'id' | 'patientId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
