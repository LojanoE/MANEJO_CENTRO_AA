import type { FormAnswers } from '../config/formTemplates/types'

/**
 * Área de Terapia Ocupacional (Fase 4). Vive en `patients/{id}/occupational`
 * con dos tipos de registro, como los dos formatos en papel del área:
 * - la evaluación por criterios, con reevaluaciones a lo largo del
 *   internamiento. Su fecha vive en `answers` (el formato tiene su casilla
 *   "Fecha" pre-llenada al crear);
 * - las atenciones de la hoja de evolución (`kind: 'sesion'`).
 */
interface OccupationalEntryBase {
  id: string
  patientId: string
  authorId?: string | null
  authorName?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

/** Evaluación por criterios. Las guardadas antes de la hoja de evolución no tienen `kind`. */
export interface OccupationalEvaluation extends OccupationalEntryBase {
  kind?: 'evaluacion'
  templateId: string
  answers: FormAnswers
}

/** Una atención de la hoja de evolución ocupacional. */
export interface OccupationalSession extends OccupationalEntryBase {
  kind: 'sesion'
  date: string
  hora?: string
  /** "Proceso terapéutico" del formato en papel. */
  process: string
  observations: string
}

export type OccupationalEntry = OccupationalEvaluation | OccupationalSession

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type NewOccupationalEntry = DistributiveOmit<OccupationalEntry, 'id' | 'patientId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>

export function isOccupationalSession(entry: OccupationalEntry): entry is OccupationalSession {
  return entry.kind === 'sesion'
}
