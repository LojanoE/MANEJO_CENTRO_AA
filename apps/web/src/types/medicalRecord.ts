/**
 * Modelo clínico alineado a la Historia Clínica Única (HCU) del MSP Ecuador.
 *
 * Los campos marcados como LEGACY pertenecen al formato clásico de medicina
 * general que se usó antes del rediseño MSP. Se conservan en Firestore durante
 * la transición (la migración no borra nada) y se eliminarán una vez validada.
 * No escribir código nuevo que los use: pasar siempre por los helpers de
 * `utils/mspEntry.ts`, que resuelven el valor correcto con fallback al legado.
 */

/** Tipos del formato clásico. LEGACY — solo se usa al migrar entradas antiguas. */
export type EntryType = 'Apertura' | 'Seguimiento' | 'Emergencia' | 'Evaluación pre-visita' | 'Alta médica'

/** Formularios MSP implementados. Se amplía en fases siguientes (006, 008, 053…). */
export type MspFormType = '002' | '005'

export const MSP_FORM_LABELS: Record<MspFormType, string> = {
  '002': 'Consulta Externa (MSP 002)',
  '005': 'Evolución y Prescripciones (MSP 005)',
}

export interface DiagnosticoCie10 {
  /** Código CIE-10. Puede quedar vacío si el médico aún no lo clasifica. */
  codigo: string
  descripcion: string
  tipo: 'Presuntivo' | 'Definitivo'
}

export interface Prescripcion {
  medicamento: string
  dosis: string
  via: string
  frecuencia: string
  duracion: string
}

/** Sección 5 del formulario 002: signos vitales. Todo texto libre corto. */
export interface SignosVitales {
  presionArterial: string
  frecuenciaCardiaca: string
  frecuenciaRespiratoria: string
  temperatura: string
  saturacionO2: string
  peso: string
  talla: string
  imc: string
}

export const EMPTY_SIGNOS_VITALES: SignosVitales = {
  presionArterial: '',
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  temperatura: '',
  saturacionO2: '',
  peso: '',
  talla: '',
  imc: '',
}

export const SIGNOS_VITALES_LABELS: { key: keyof SignosVitales; label: string; hint?: string }[] = [
  { key: 'presionArterial', label: 'Presión arterial', hint: 'mmHg, ej: 120/80' },
  { key: 'frecuenciaCardiaca', label: 'Frec. cardíaca', hint: 'lpm' },
  { key: 'frecuenciaRespiratoria', label: 'Frec. respiratoria', hint: 'rpm' },
  { key: 'temperatura', label: 'Temperatura', hint: '°C' },
  { key: 'saturacionO2', label: 'Sat. O₂', hint: '%' },
  { key: 'peso', label: 'Peso', hint: 'kg' },
  { key: 'talla', label: 'Talla', hint: 'cm' },
  { key: 'imc', label: 'IMC', hint: 'kg/m²' },
]

/** Examen físico por sistemas (form. 002). `general` recoge la nota libre y
 * sirve de destino al migrar la `evaluacion` del formato clásico. */
export interface ExamenFisico {
  general: string
  cabeza: string
  cuello: string
  torax: string
  corazon: string
  abdomen: string
  columna: string
  pelvis: string
  extremidades: string
  neurologico: string
  piel: string
}

export const EXAMEN_FISICO_LABELS: { key: keyof ExamenFisico; label: string }[] = [
  { key: 'general', label: 'Examen general / estado mental' },
  { key: 'cabeza', label: 'Cabeza' },
  { key: 'cuello', label: 'Cuello' },
  { key: 'torax', label: 'Tórax' },
  { key: 'corazon', label: 'Corazón' },
  { key: 'abdomen', label: 'Abdomen' },
  { key: 'columna', label: 'Columna' },
  { key: 'pelvis', label: 'Pelvis' },
  { key: 'extremidades', label: 'Extremidades' },
  { key: 'neurologico', label: 'Neurológico' },
  { key: 'piel', label: 'Piel y faneras' },
]

export interface RecordEntry {
  id: string
  recordId: string
  date: string
  /** Formulario MSP de la entrada. `undefined` = entrada clásica aún no migrada. */
  formType?: MspFormType
  title: string

  // ── MSP 002: Consulta externa ──────────────────────────────
  motivoConsulta?: string
  enfermedadActual?: string
  antecedentesPersonales?: string
  antecedentesFamiliares?: string
  signosVitales?: SignosVitales
  examenFisico?: Partial<ExamenFisico>

  // ── Diagnósticos CIE-10 (002 y 005) ────────────────────────
  diagnosticos?: DiagnosticoCie10[]

  // ── MSP 005: Evolución y prescripciones ────────────────────
  evolucion?: string
  prescripciones?: Prescripcion[]
  planTratamiento?: string
  observaciones?: string

  // ── Trazabilidad ───────────────────────────────────────────
  /** Auth uid / name of whoever performed this attention. Optional because
   * entries written before this field existed don't have it — those fall back
   * to the parent record's doctor (see resolveAuthorUid in utils/weeklyReport.ts).
   * Set on creation only: editing an entry doesn't reassign who attended. */
  authorId?: string | null
  authorName?: string | null
  /** Puesta por la migración: la entrada viene del formato clásico. */
  migradoDesdeClasico?: boolean
  /** La migración deja en blanco lo que el dato clásico no tenía (signos
   * vitales, CIE-10, etc.); el médico lo completa editando si lo necesita. */
  pendienteCompletar?: boolean

  // ── LEGACY (formato clásico, no usar en código nuevo) ──────
  /** @deprecated usar `formType`. */ type?: EntryType
  /** @deprecated usar `motivoConsulta`/`enfermedadActual`. */ anamnesis?: string
  /** @deprecated usar `antecedentesPersonales`. */ antecedentes?: string
  /** @deprecated usar `examenFisico.general`. */ evaluacion?: string
  /** @deprecated usar `diagnosticos`. */ diagnostico?: string
  /** @deprecated usar `planTratamiento`. */ tratamiento?: string

  /** Written via serverTimestamp() — at runtime a Firestore Timestamp. */
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MedicalRecord {
  id: string
  patientId: string
  patientName: string
  doctorId?: string | null
  doctorName?: string | null
  /** Written via serverTimestamp() (see saveDoc/updateDocHelper) — at runtime
   * this is a Firestore Timestamp, never a string. Format with
   * utils/date.ts#formatTimestamp before rendering; never render it directly. */
  createdAt: unknown
  updatedAt: unknown
}

export type NewRecordEntry = Omit<RecordEntry, 'id'>
export type RecordEntryInput = Omit<RecordEntry, 'id' | 'authorId' | 'authorName' | 'createdAt' | 'updatedAt'>
