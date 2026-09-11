import type {
  AnswerValue,
  FormAnswers,
  FormTemplate,
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
  return Array.isArray(v) ? v : []
}

export function answerQuestion(answers: FormAnswers | undefined, key: string): QuestionAnswer {
  const v = answers?.[key]
  return isPlainObject(v) && 'answer' in v ? { ...EMPTY_QUESTION, ...(v as QuestionAnswer) } : EMPTY_QUESTION
}

export function answerTable(answers: FormAnswers | undefined, key: string): TableAnswer {
  const v = answers?.[key]
  return isPlainObject(v) && !('answer' in v) ? (v as TableAnswer) : {}
}

export const cellKey = (row: number, col: number) => `${row}-${col}`

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

/** Clave del primer texto de una sección (p. ej. para mostrar "Conclusiones" en un resumen). */
export function sectionTextKey(template: FormTemplate, sectionTitle: string, label?: string): string | null {
  const keys = templateKeys(template)
  for (let si = 0; si < template.sections.length; si++) {
    const section = template.sections[si]
    if (section.title !== sectionTitle) continue
    for (let bi = 0; bi < section.blocks.length; bi++) {
      const block = section.blocks[bi]
      if (block.kind === 'text' && (label === undefined || block.label === label)) return keys.block(si, bi)
    }
  }
  return null
}
