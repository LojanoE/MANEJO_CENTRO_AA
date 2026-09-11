/**
 * Definición declarativa de los formatos del expediente.
 *
 * Fase 1: se usan para imprimir cada formato pre-llenado con los datos del
 * paciente (o en blanco) y llenarlo a mano. Fases 2-4: la misma definición es
 * el punto de partida del formulario digital de cada área, para que el papel y
 * la pantalla no diverjan.
 */

/** Datos que se pueden pre-llenar desde la ficha del paciente (ver utils/clinicalPrint.ts). */
export type PrefillKey =
  | 'center'
  | 'today'
  | 'name'
  | 'idCard'
  | 'age'
  | 'sex'
  | 'birthDate'
  | 'maritalStatus'
  | 'religion'
  | 'occupation'
  | 'education'
  | 'phone'
  | 'address'
  | 'admission'
  | 'hc'
  | 'doctor'

export interface GridItem {
  label: string
  prefill?: PrefillKey
  /** Columnas que ocupa dentro de la grilla (por defecto 1). */
  span?: number
}

export type TemplateBlock =
  /** Celdas etiquetadas cortas (datos de identificación). */
  | { kind: 'grid'; cols: number; items: GridItem[] }
  /** Pregunta abierta: título, guía de qué escribir y renglones. */
  | { kind: 'text'; label?: string; hint?: string; lines: number }
  /** Opciones para marcar con X. */
  | { kind: 'checks'; label?: string; options: string[]; cols?: number }
  /** Preguntas SÍ / NO con detalle opcional. */
  | { kind: 'questions'; items: { label: string; detail?: string }[] }
  /**
   * Tabla. `rows`: cantidad de filas vacías, etiquetas de la primera columna,
   * o el contenido fijo de cada fila (celdas vacías = para llenar).
   */
  | {
      kind: 'table'
      label?: string
      columns: { label: string; width?: string }[]
      rows: number | string[] | string[][]
      rowHeight?: 'sm' | 'md' | 'lg'
      numbered?: boolean
      note?: string
    }
  /** Resultados de test psicológicos: se llena con los test registrados del paciente. */
  | { kind: 'testResults'; label?: string }
  /** Recuadro para pegar fotografías. */
  | { kind: 'photo'; label: string }
  /** Líneas de firma con cédula. */
  | { kind: 'signatures'; signers: string[] }

export interface TemplateSection {
  title?: string
  hint?: string
  blocks: TemplateBlock[]
}

export type FormArea = 'admision' | 'medica' | 'psicologia' | 'social' | 'ocupacional'

export interface FormTemplate {
  id: string
  title: string
  /** Código oficial impreso en la barra de título (formularios MSP). */
  code?: string
  sections: TemplateSection[]
}

// ── Respuestas de un formato llenado en el sistema (Fase 3+) ──────────────
// Firestore no admite arreglos anidados: las tablas se guardan como mapa
// "fila-columna" → texto (ver utils/formAnswers.ts).

export type QuestionAnswer = { answer: 'SI' | 'NO' | ''; detail: string }
export type TableAnswer = Record<string, string>
/** grid/text → string · checks → string[] · questions → QuestionAnswer · table → TableAnswer */
export type AnswerValue = string | string[] | QuestionAnswer | TableAnswer
export type FormAnswers = Record<string, AnswerValue>
