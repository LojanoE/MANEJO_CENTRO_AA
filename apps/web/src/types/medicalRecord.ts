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

/** Formularios MSP que viven como entradas de la historia clínica.
 * (El 001 Admisión es de la ficha del paciente, no una entrada.) */
export type MspFormType = '002' | '005' | '006'

export const MSP_FORM_LABELS: Record<MspFormType, string> = {
  '002': 'Consulta Externa (MSP 002)',
  '005': 'Evolución y Prescripciones (MSP 005)',
  '006': 'Epicrisis (MSP 006)',
}

/** Sección 9 del 006: cómo termina el internamiento. */
export const TIPOS_EGRESO = [
  'Alta definitiva',
  'Alta transitoria',
  'Retiro autorizado',
  'Retiro no autorizado',
  'Defunción menos de 48 horas',
  'Defunción más de 48 horas',
] as const
export type TipoEgreso = (typeof TIPOS_EGRESO)[number]

/** Sección 9 del 006: estado del usuario al egreso. */
export const ESTADOS_EGRESO = ['Asintomático', 'Discapacidad leve', 'Discapacidad moderada', 'Discapacidad grave'] as const
export type EstadoEgreso = (typeof ESTADOS_EGRESO)[number]

/** Sección 8 del 006. */
export interface MedicoTratante {
  nombre: string
  especialidad: string
  codigo: string
  periodo: string
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
  /** Columna "Administr. fármacos / dispositivo" del 005: se imprime en rojo. */
  administrado?: boolean
}

/** Sección F del formulario 002: constantes vitales y antropometría.
 * Texto libre corto. Las tres últimas claves llegaron con el rediseño de la
 * Fase 1, así que las entradas anteriores no las tienen: leer siempre con `?? ''`. */
export interface SignosVitales {
  temperatura: string
  presionArterial: string
  frecuenciaCardiaca: string
  frecuenciaRespiratoria: string
  peso: string
  talla: string
  imc: string
  saturacionO2: string
  perimetroAbdominal?: string
  hemoglobinaCapilar?: string
  glucosaCapilar?: string
}

export const EMPTY_SIGNOS_VITALES: SignosVitales = {
  temperatura: '',
  presionArterial: '',
  frecuenciaCardiaca: '',
  frecuenciaRespiratoria: '',
  peso: '',
  talla: '',
  imc: '',
  saturacionO2: '',
  perimetroAbdominal: '',
  hemoglobinaCapilar: '',
  glucosaCapilar: '',
}

/** En el orden de la sección F del formulario en papel. */
export const SIGNOS_VITALES_LABELS: { key: keyof SignosVitales; label: string; hint?: string }[] = [
  { key: 'temperatura', label: 'Temperatura', hint: '°C' },
  { key: 'presionArterial', label: 'Presión arterial', hint: 'mmHg' },
  { key: 'frecuenciaCardiaca', label: 'Pulso', hint: '/min' },
  { key: 'frecuenciaRespiratoria', label: 'Frec. respiratoria', hint: '/min' },
  { key: 'peso', label: 'Peso', hint: 'kg' },
  { key: 'talla', label: 'Talla', hint: 'cm' },
  { key: 'imc', label: 'IMC', hint: 'kg/m²' },
  { key: 'perimetroAbdominal', label: 'Perímetro abdominal', hint: 'cm' },
  { key: 'hemoglobinaCapilar', label: 'Hemoglobina capilar', hint: 'g/dl' },
  { key: 'glucosaCapilar', label: 'Glucosa capilar', hint: 'mg/dl' },
  { key: 'saturacionO2', label: 'Pulsioximetría', hint: '%' },
]

/** Secciones C y D del 002: categorías que se marcan con X. Se guardan por su
 * etiqueta para que el dato sea legible directamente en Firestore. */
export const ANTECEDENTES_CATEGORIAS = [
  'Cardiopatía',
  'Hipertensión',
  'Enf. cerebro vascular',
  'Endócrino metabólico',
  'Cáncer',
  'Tuberculosis',
  'Enf. mental',
  'Enf. infecciosa',
  'Malformación',
  'Otro',
] as const
export type AntecedenteCategoria = (typeof ANTECEDENTES_CATEGORIAS)[number]

export type TipoConsulta = 'Primera' | 'Subsecuente'

/** Sección G del 002: revisión actual de órganos y sistemas. */
export type RevisionSistemaKey =
  | 'pielAnexos'
  | 'organosSentidos'
  | 'respiratorio'
  | 'cardiovascular'
  | 'digestivo'
  | 'genitourinario'
  | 'musculoEsqueletico'
  | 'endocrino'
  | 'hemoLinfatico'
  | 'nervioso'

export const REVISION_SISTEMAS_LABELS: { key: RevisionSistemaKey; code: string; label: string }[] = [
  { key: 'pielAnexos', code: '1', label: 'Piel - anexos' },
  { key: 'organosSentidos', code: '2', label: 'Órganos de los sentidos' },
  { key: 'respiratorio', code: '3', label: 'Respiratorio' },
  { key: 'cardiovascular', code: '4', label: 'Cardio - vascular' },
  { key: 'digestivo', code: '5', label: 'Digestivo' },
  { key: 'genitourinario', code: '6', label: 'Génito - urinario' },
  { key: 'musculoEsqueletico', code: '7', label: 'Músculo - esquelético' },
  { key: 'endocrino', code: '8', label: 'Endócrino' },
  { key: 'hemoLinfatico', code: '9', label: 'Hemo - linfático' },
  { key: 'nervioso', code: '10', label: 'Nervioso' },
]

/**
 * Sección H del 002: examen físico regional (1R–15R) y sistémico (1S–10S).
 * `general` recoge la nota libre y es el destino de la `evaluacion` clásica.
 *
 * Regla de marcado (G y H): una clave PRESENTE en el mapa = "con patología"
 * (se imprime la X) y su texto es la descripción; clave ausente = sin patología.
 * Las claves previas al rediseño se reutilizan donde el sistema coincide
 * (`pelvis` pasa a ser 13R Ingle-periné, `corazon` 3S Cardio-vascular);
 * `extremidades` queda solo como dato anterior.
 */
export interface ExamenFisico {
  general: string
  piel: string
  cabeza: string
  ojos: string
  oidos: string
  nariz: string
  boca: string
  orofaringe: string
  cuello: string
  axilasMamas: string
  torax: string
  abdomen: string
  columna: string
  pelvis: string
  miembrosSuperiores: string
  miembrosInferiores: string
  organosSentidos: string
  respiratorio: string
  corazon: string
  digestivo: string
  genital: string
  urinario: string
  musculoEsqueletico: string
  endocrino: string
  hemoLinfatico: string
  neurologico: string
  /** @deprecated registro anterior al rediseño; usar miembros superiores/inferiores. */
  extremidades: string
}

export type ExamenFisicoItem = { key: keyof ExamenFisico; code: string; label: string }

export const EXAMEN_FISICO_REGIONAL: ExamenFisicoItem[] = [
  { key: 'piel', code: '1R', label: 'Piel - faneras' },
  { key: 'cabeza', code: '2R', label: 'Cabeza' },
  { key: 'ojos', code: '3R', label: 'Ojos' },
  { key: 'oidos', code: '4R', label: 'Oídos' },
  { key: 'nariz', code: '5R', label: 'Nariz' },
  { key: 'boca', code: '6R', label: 'Boca' },
  { key: 'orofaringe', code: '7R', label: 'Orofaringe' },
  { key: 'cuello', code: '8R', label: 'Cuello' },
  { key: 'axilasMamas', code: '9R', label: 'Axilas - mamas' },
  { key: 'torax', code: '10R', label: 'Tórax' },
  { key: 'abdomen', code: '11R', label: 'Abdomen' },
  { key: 'columna', code: '12R', label: 'Columna vertebral' },
  { key: 'pelvis', code: '13R', label: 'Ingle - periné' },
  { key: 'miembrosSuperiores', code: '14R', label: 'Miembros superiores' },
  { key: 'miembrosInferiores', code: '15R', label: 'Miembros inferiores' },
]

export const EXAMEN_FISICO_SISTEMICO: ExamenFisicoItem[] = [
  { key: 'organosSentidos', code: '1S', label: 'Órganos de los sentidos' },
  { key: 'respiratorio', code: '2S', label: 'Respiratorio' },
  { key: 'corazon', code: '3S', label: 'Cardio - vascular' },
  { key: 'digestivo', code: '4S', label: 'Digestivo' },
  { key: 'genital', code: '5S', label: 'Genital' },
  { key: 'urinario', code: '6S', label: 'Urinario' },
  { key: 'musculoEsqueletico', code: '7S', label: 'Músculo - esquelético' },
  { key: 'endocrino', code: '8S', label: 'Endócrino' },
  { key: 'hemoLinfatico', code: '9S', label: 'Hemo - linfático' },
  { key: 'neurologico', code: '10S', label: 'Neurológico' },
]

/** Todas las claves en orden de lectura: nota general, regional, sistémico y el dato anterior. */
export const EXAMEN_FISICO_LABELS: ExamenFisicoItem[] = [
  { key: 'general', code: '', label: 'Examen general / estado mental' },
  ...EXAMEN_FISICO_REGIONAL,
  ...EXAMEN_FISICO_SISTEMICO,
  { key: 'extremidades', code: '', label: 'Extremidades (registro anterior)' },
]

export interface RecordEntry {
  id: string
  recordId: string
  date: string
  /** Hora de la atención (HH:MM). Ausente en entradas anteriores a la Fase 1. */
  hora?: string
  /** Formulario MSP de la entrada. `undefined` = entrada clásica aún no migrada. */
  formType?: MspFormType
  title: string

  // ── MSP 002: Consulta externa ──────────────────────────────
  tipoConsulta?: TipoConsulta
  motivoConsulta?: string
  enfermedadActual?: string
  antecedentesPersonales?: string
  antecedentesPersonalesMarcados?: AntecedenteCategoria[]
  antecedentesFamiliares?: string
  antecedentesFamiliaresMarcados?: AntecedenteCategoria[]
  signosVitales?: SignosVitales
  revisionSistemas?: Partial<Record<RevisionSistemaKey, string>>
  examenFisico?: Partial<ExamenFisico>

  // ── Diagnósticos CIE-10 (002 y 005) ────────────────────────
  diagnosticos?: DiagnosticoCie10[]

  // ── MSP 005: Evolución y prescripciones ────────────────────
  evolucion?: string
  prescripciones?: Prescripcion[]
  /** Indicaciones no farmacológicas para enfermería y otros profesionales (005). */
  indicaciones?: string
  planTratamiento?: string
  observaciones?: string

  // ── MSP 006: Epicrisis ─────────────────────────────────────
  fechaIngreso?: string
  fechaEgreso?: string
  resumenCuadroClinico?: string
  resumenEvolucion?: string
  hallazgosRelevantes?: string
  resumenTratamiento?: string
  diagnosticosIngreso?: DiagnosticoCie10[]
  diagnosticosEgreso?: DiagnosticoCie10[]
  condicionesEgreso?: string
  medicosTratantes?: MedicoTratante[]
  tipoEgreso?: TipoEgreso
  estadoEgreso?: EstadoEgreso
  diasIncapacidad?: string

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
