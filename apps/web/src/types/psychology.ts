import type { FormAnswers } from '../config/formTemplates/types'

/**
 * Área de Psicología (Fase 3). Todo vive en `patients/{id}/psychology`:
 * una subcolección por paciente con cuatro tipos de registro.
 */

export type PsychEntryKind = 'entrevista' | 'evaluacion' | 'sesion' | 'test'

/** Registros que son un formato del centro lleno: la entrevista y la historia, cada uno por separado. */
export type PsychFormKind = Extract<PsychEntryKind, 'entrevista' | 'evaluacion'>

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

interface PsychFormEntryBase extends PsychEntryBase {
  /** Formato con que se capturó (config/printableForms), para leer las respuestas. */
  templateId: string
  answers: FormAnswers
}

/** Entrevista psicológica para adultos: respuestas del formato del centro. */
export interface PsychInterview extends PsychFormEntryBase {
  kind: 'entrevista'
}

/** Historia clínica psicológica de ingreso: respuestas del formato del centro. */
export interface PsychEvaluation extends PsychFormEntryBase {
  kind: 'evaluacion'
}

export type PsychFormEntry = PsychInterview | PsychEvaluation

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

export type PsychEntry = PsychInterview | PsychEvaluation | PsychSession | PsychTestResult

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type NewPsychEntry = DistributiveOmit<PsychEntry, 'id' | 'patientId' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
