import type { FormAnswers } from '../config/formTemplates/types'

/**
 * Área de Trabajo Social (Fase 4). Vive en `patients/{id}/socialWork`: una
 * subcolección por paciente con dos tipos de registro. A diferencia de
 * Psicología, no hay campos `date`/`hora` aparte: el propio formato (config/
 * formTemplates/social.ts) ya tiene sus casillas de fecha y hora, pre-llenadas
 * al crear — no hace falta duplicarlas fuera de `answers`.
 */
export type SocialWorkKind = 'ficha' | 'seguimiento'

export interface SocialWorkEntry {
  id: string
  patientId: string
  kind: SocialWorkKind
  /** Formato con que se capturó (config/printableForms), para leer las respuestas. */
  templateId: string
  answers: FormAnswers
  authorId?: string | null
  authorName?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

export type NewSocialWorkEntry = Omit<SocialWorkEntry, 'id' | 'patientId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
