import { OCUPACIONAL } from '../config/formTemplates/social'
import { answerTable, findTotalRowIndex, radioGroupCounts, templateKeys } from './formAnswers'
import type { FormAnswers, TemplateBlock } from '../config/formTemplates/types'

/** Ubica la tabla de criterios (C/NC/NA) dentro del formato, sin fijar índices a mano. */
function findCriteriaTable(): { si: number; bi: number; block: Extract<TemplateBlock, { kind: 'table' }> } | null {
  for (let si = 0; si < OCUPACIONAL.sections.length; si++) {
    const blocks = OCUPACIONAL.sections[si].blocks
    for (let bi = 0; bi < blocks.length; bi++) {
      const block = blocks[bi]
      if (block.kind === 'table' && block.radioGroup) return { si, bi, block }
    }
  }
  return null
}

const criteriaTable = findCriteriaTable()
const keys = templateKeys(OCUPACIONAL)

export interface OccupationalTotals {
  /** Cumple / no cumple / no aplica. */
  c: number
  nc: number
  na: number
  /** Cuántos criterios tiene el formato (sin contar la fila TOTAL). */
  total: number
}

/** Cuenta C/NC/NA de una evaluación ocupacional, leyendo la misma tabla que se imprime. */
export function occupationalTotals(answers: FormAnswers): OccupationalTotals {
  if (!criteriaTable) return { c: 0, nc: 0, na: 0, total: 0 }
  const { si, bi, block } = criteriaTable
  const table = answerTable(answers, keys.block(si, bi))
  const rows: string[][] =
    typeof block.rows === 'number' ? Array.from({ length: block.rows }, () => []) : block.rows.map((r) => (Array.isArray(r) ? r : [r]))
  const totalRowIndex = findTotalRowIndex(rows)
  const dataRowCount = totalRowIndex === -1 ? rows.length : totalRowIndex
  const [c, nc, na] = radioGroupCounts(table, dataRowCount, block.radioGroup ?? [])
  return { c, nc, na, total: dataRowCount }
}
