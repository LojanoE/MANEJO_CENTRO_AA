import type {
  AnswerValue,
  FormAnswers,
  FormTemplate,
  PhotoRef,
  PrefillKey,
  QuestionAnswer,
  TableAnswer,
} from '../config/formTemplates/types'

/**
 * Respuestas de los formatos declarativos (config/formTemplates) llenados en
 * el sistema. Cada campo se identifica con una clave estable derivada de la
 * sección y la etiqueta ("motivo-de-consulta__condiciones-fisicas-…"), así los
 * datos guardados se leen solos en Firestore y no dependen del orden.
 * ⚠️ Cambiar el título de una sección o la etiqueta de un campo cambia su clave.
 */

export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'campo'
  )
}

export interface TemplateKeys {
  /** Clave de un bloque de un solo valor (text, checks, table). */
  block: (sectionIndex: number, blockIndex: number) => string
  /** Clave de un elemento de grid o questions. */
  item: (sectionIndex: number, blockIndex: number, itemIndex: number) => string
}

const keysCache = new WeakMap<FormTemplate, TemplateKeys>()

export function templateKeys(template: FormTemplate): TemplateKeys {
  const cached = keysCache.get(template)
  if (cached) return cached

  const used = new Set<string>()
  const map = new Map<string, string>()
  const unique = (base: string) => {
    let key = base
    for (let n = 2; used.has(key); n++) key = `${base}-${n}`
    used.add(key)
    return key
  }

  template.sections.forEach((section, si) => {
    const sec = slug(section.title ?? `seccion-${si + 1}`)
    section.blocks.forEach((block, bi) => {
      switch (block.kind) {
        case 'grid':
        case 'questions':
          block.items.forEach((it, ii) => map.set(`${si}.${bi}.${ii}`, unique(`${sec}__${slug(it.label)}`)))
          break
        case 'text':
          map.set(`${si}.${bi}`, unique(`${sec}__${slug(block.label ?? 'texto')}`))
          break
        case 'checks':
          map.set(`${si}.${bi}`, unique(`${sec}__${slug(block.label ?? 'opciones')}`))
          break
        case 'table':
          map.set(`${si}.${bi}`, unique(`${sec}__${slug(block.label ?? 'tabla')}`))
          break
        case 'photo':
          map.set(`${si}.${bi}`, unique(`${sec}__${slug(block.label)}`))
          break
      }
    })
  })

  const keys: TemplateKeys = {
    block: (si, bi) => map.get(`${si}.${bi}`) ?? `${si}.${bi}`,
    item: (si, bi, ii) => map.get(`${si}.${bi}.${ii}`) ?? `${si}.${bi}.${ii}`,
  }
  keysCache.set(template, keys)
  return keys
}

const EMPTY_QUESTION: QuestionAnswer = { answer: '', detail: '' }

const isPlainObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

export function answerText(answers: FormAnswers | undefined, key: string): string {
  const v = answers?.[key]
  return typeof v === 'string' ? v : ''
}

export function answerList(answers: FormAnswers | undefined, key: string): string[] {
  const v = answers?.[key]
  // `checks` guarda string[] y `photo` guarda PhotoRef[] — ambos son arreglos,
  // así que se filtra por forma en vez de confiar en `Array.isArray`.
  return Array.isArray(v) ? v.filter((item): item is string => typeof item === 'string') : []
}

export function answerQuestion(answers: FormAnswers | undefined, key: string): QuestionAnswer {
  const v = answers?.[key]
  return isPlainObject(v) && 'answer' in v ? { ...EMPTY_QUESTION, ...(v as QuestionAnswer) } : EMPTY_QUESTION
}

export function answerTable(answers: FormAnswers | undefined, key: string): TableAnswer {
  const v = answers?.[key]
  return isPlainObject(v) && !('answer' in v) ? (v as TableAnswer) : {}
}

/** Fotos subidas para un bloque `photo`. Filtra por forma en vez de por clave:
 * `checks` también guarda un arreglo, pero de strings, nunca de objetos. */
export function answerPhotos(answers: FormAnswers | undefined, key: string): PhotoRef[] {
  const v = answers?.[key]
  if (!Array.isArray(v)) return []
  return v.filter((item): item is PhotoRef => typeof item === 'object' && item !== null && 'url' in item)
}

export const cellKey = (row: number, col: number) => `${row}-${col}`

/** true si (fila, columna) está marcada dentro de un grupo de selección única (C/NC/NA…). */
export function isRadioMarked(table: TableAnswer, row: number, col: number): boolean {
  return table[cellKey(row, col)] === 'X'
}

/** Marca (fila, columna) y limpia el resto del grupo en esa fila; marcarla de nuevo la desmarca. */
export function toggleRadioCell(table: TableAnswer, row: number, col: number, radioGroup: number[]): TableAnswer {
  const next = { ...table }
  const wasMarked = next[cellKey(row, col)] === 'X'
  for (const c of radioGroup) delete next[cellKey(row, c)]
  if (!wasMarked) next[cellKey(row, col)] = 'X'
  return next
}

/** Cuántas de las primeras `dataRowCount` filas tienen marcada cada columna del grupo — para la fila "TOTAL". */
export function radioGroupCounts(table: TableAnswer, dataRowCount: number, radioGroup: number[]): number[] {
  return radioGroup.map(
    (col) => Array.from({ length: dataRowCount }, (_, row) => isRadioMarked(table, row, col)).filter(Boolean).length,
  )
}

/** Índice de la fila fija "TOTAL" de una tabla (insensible a mayúsculas), o -1 si no tiene. */
export function findTotalRowIndex(rows: string[][]): number {
  return rows.findIndex((r) => (r[0] ?? '').trim().toUpperCase() === 'TOTAL')
}

/** Respuestas iniciales de un formato nuevo: los datos del paciente en sus casillas. */
export function initialAnswers(template: FormTemplate, values: Record<PrefillKey, string>): FormAnswers {
  const keys = templateKeys(template)
  const answers: FormAnswers = {}
  template.sections.forEach((section, si) =>
    section.blocks.forEach((block, bi) => {
      if (block.kind !== 'grid') return
      block.items.forEach((it, ii) => {
        if (it.prefill && values[it.prefill]) answers[keys.item(si, bi, ii)] = values[it.prefill]
      })
    }),
  )
  return answers
}

const hasValue = (v: AnswerValue | undefined): boolean => {
  if (typeof v === 'string') return v.trim() !== ''
  if (Array.isArray(v)) return v.length > 0
  if (isPlainObject(v)) return 'answer' in v ? (v as QuestionAnswer).answer !== '' : Object.values(v).some((c) => String(c).trim() !== '')
  return false
}

/** Cuántos campos del formato tienen información, para mostrar el avance. */
export function answeredCount(template: FormTemplate, answers: FormAnswers | undefined): { answered: number; total: number } {
  const keys = templateKeys(template)
  let answered = 0
  let total = 0
  template.sections.forEach((section, si) =>
    section.blocks.forEach((block, bi) => {
      if (block.kind === 'grid' || block.kind === 'questions') {
        block.items.forEach((_, ii) => {
          total++
          if (hasValue(answers?.[keys.item(si, bi, ii)])) answered++
        })
      } else if (block.kind === 'text' || block.kind === 'checks' || block.kind === 'table') {
        total++
        if (hasValue(answers?.[keys.block(si, bi)])) answered++
      }
    }),
  )
  return { answered, total }
}

/**
 * Clave del primer texto o lista para marcar de una sección (o del que tenga
 * esa etiqueta), p. ej. para mostrar "Conclusiones" en un resumen.
 */
export function sectionFieldKey(template: FormTemplate, sectionTitle: string, label?: string): string | null {
  const keys = templateKeys(template)
  for (let si = 0; si < template.sections.length; si++) {
    const section = template.sections[si]
    if (section.title !== sectionTitle) continue
    for (let bi = 0; bi < section.blocks.length; bi++) {
      const block = section.blocks[bi]
      if ((block.kind === 'text' || block.kind === 'checks') && (label === undefined || block.label === label)) return keys.block(si, bi)
    }
  }
  return null
}

/**
 * Respuestas ya registradas en otro formato (`from`) que caben en campos
 * equivalentes de `to`, para no volver a preguntarlas. Se emparejan por la
 * etiqueta del campo y no por la sección —así sirven aunque el formato de
 * origen haya cambiado desde que se guardó— y por la forma del valor; una lista
 * para marcar se empareja por sus opciones. Omite lo que ya tiene información en `into`.
 */
export function carryOverAnswers(from: FormAnswers, to: FormTemplate, into: FormAnswers = {}): FormAnswers {
  const byLabel = new Map<string, AnswerValue>()
  for (const [key, value] of Object.entries(from)) {
    const sep = key.indexOf('__')
    const label = key.slice(sep + 2)
    if (sep >= 0 && hasValue(value) && !byLabel.has(label)) byLabel.set(label, value)
  }
  const lists = Object.values(from).filter(
    (v): v is string[] => Array.isArray(v) && v.length > 0 && v.every((item) => typeof item === 'string'),
  )

  const keys = templateKeys(to)
  const carried: FormAnswers = {}
  const put = (key: string, value: AnswerValue | undefined) => {
    if (value !== undefined && !hasValue(into[key])) carried[key] = value
  }
  to.sections.forEach((section, si) =>
    section.blocks.forEach((block, bi) => {
      switch (block.kind) {
        case 'grid':
          block.items.forEach((it, ii) => {
            const v = byLabel.get(slug(it.label))
            if (typeof v === 'string') put(keys.item(si, bi, ii), v)
          })
          break
        case 'questions':
          block.items.forEach((it, ii) => {
            const v = byLabel.get(slug(it.label))
            if (isPlainObject(v) && 'answer' in v) put(keys.item(si, bi, ii), v)
          })
          break
        case 'text': {
          const v = byLabel.get(slug(block.label ?? 'texto'))
          if (typeof v === 'string') put(keys.block(si, bi), v)
          break
        }
        case 'checks': {
          const options = new Set(block.options)
          put(
            keys.block(si, bi),
            lists.find((list) => list.every((o) => options.has(o))),
          )
          break
        }
      }
    }),
  )
  return carried
}
