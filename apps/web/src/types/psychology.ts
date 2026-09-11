import type { FormAnswers } from '../config/formTemplates/types'

/**
 * Área de Psicología (Fase 3). Todo vive en `patients/{id}/psychology`:
 * una subcolección por paciente con tres tipos de registro.
 */

export type PsychEntryKind = 'evaluacion' | 'sesion' | 'test'

export type PsychTestId = 'audit' | 'assist' | 'beck' | 'hamilton' | 'barratt' | 'ipde' | 'mayo'

export const SESSION_MODALITIES = ['Individual', 'Grupal', 'Familiar'] as const
export type SessionModality = (typeof SESSION_MODALITIES)[number]

interface PsychEntryBase {
  id: string
  patientId: string
  kind: PsychEntryKind
  date: string
  hora?: string
  /** Quien registró; se fija al crear. */
  authorId?: string | null
  authorName?: string | null
  createdAt?: unknown
  updatedAt?: unknown
}

/** Historia clínica psicológica de ingreso: respuestas del formato del centro. */
export interface PsychEvaluation extends PsychEntryBase {
  kind: 'evaluacion'
  /** Formato con que se capturó (config/printableForms), para leer las respuestas. */
  templateId: string
  answers: FormAnswers
}

/** Una atención de la hoja de evolución psicológica. */
export interface PsychSession extends PsychEntryBase {
  kind: 'sesion'
  modality: SessionModality
  durationMin?: number | null
  /** "Proceso terapéutico" del formato en papel. */
  process: string
  observations: string
}

/** Aplicación de un test con su puntaje. */
export interface PsychTestResult extends PsychEntryBase {
  kind: 'test'
  testId: PsychTestId
  score: number | null
  /** Solo ASSIST: sustancia evaluada. */
  substance?: string
  interpretation: string
  notes: string
}

export type PsychEntry = PsychEvaluation | PsychSession | PsychTestResult

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type NewPsychEntry = DistributiveOmit<PsychEntry, 'id' | 'patientId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
