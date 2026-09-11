import { PSYCH_TESTS } from '../config/psychTests'
import { comparePsychAsc } from '../hooks/usePsychology'
import type { PsychTestResult } from '../types/psychology'

export interface TestResultRow {
  test: string
  date: string
  score: string
  interpretation: string
}

/** Último resultado de cada test (y de cada sustancia en ASSIST), en el orden del formato. */
export function testResultRows(tests: PsychTestResult[]): TestResultRow[] {
  const latest = new Map<string, PsychTestResult>()
  for (const t of [...tests].sort(comparePsychAsc)) latest.set(`${t.testId}|${t.substance ?? ''}`, t)
  return PSYCH_TESTS.flatMap((def) =>
    [...latest.values()]
      .filter((t) => t.testId === def.id)
      .map((t) => ({
        test: t.substance ? `${def.name} · ${t.substance}` : def.name,
        date: t.date,
        score: t.score != null ? String(t.score) : '—',
        interpretation: t.interpretation,
      })),
  )
}
