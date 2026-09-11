import type { PsychTestId } from '../types/psychology'

/**
 * Test psicológicos del formato del centro, con sus rangos de puntaje.
 *
 * Las interpretaciones son ORIENTATIVAS (puntos de corte de uso habitual) y el
 * profesional puede corregirlas al registrar el test. IPDE y Test de Mayo no
 * tienen un puntaje total único: se interpretan a mano.
 */

export interface ScoreBand {
  /** Puntaje máximo (inclusive) de la banda. */
  max: number
  label: string
}

export interface PsychTestDef {
  id: PsychTestId
  name: string
  fullName: string
  min: number
  max: number
  bands?: ScoreBand[]
  /** ASSIST: los rangos dependen de la sustancia. */
  bandsBySubstance?: { alcohol: ScoreBand[]; other: ScoreBand[] }
  substances?: string[]
  /** Sin puntaje total interpretable automáticamente. */
  manual?: boolean
}

export const PSYCH_TESTS: PsychTestDef[] = [
  {
    id: 'audit',
    name: 'AUDIT',
    fullName: 'Test de identificación de trastornos por consumo de alcohol',
    min: 0,
    max: 40,
    bands: [
      { max: 7, label: 'Zona I · consumo de bajo riesgo' },
      { max: 15, label: 'Zona II · consumo de riesgo' },
      { max: 19, label: 'Zona III · consumo perjudicial' },
      { max: 40, label: 'Zona IV · probable dependencia' },
    ],
  },
  {
    id: 'assist',
    name: 'ASSIST',
    fullName: 'Prueba de detección de consumo de alcohol, tabaco y sustancias',
    min: 0,
    max: 39,
    substances: [
      'Alcohol',
      'Tabaco',
      'Cannabis',
      'Cocaína',
      'Estimulantes tipo anfetamina',
      'Inhalantes',
      'Sedantes o hipnóticos',
      'Alucinógenos',
      'Opioides',
      'Otras',
    ],
    bandsBySubstance: {
      alcohol: [
        { max: 10, label: 'Riesgo bajo' },
        { max: 26, label: 'Riesgo moderado' },
        { max: 39, label: 'Riesgo alto' },
      ],
      other: [
        { max: 3, label: 'Riesgo bajo' },
        { max: 26, label: 'Riesgo moderado' },
        { max: 39, label: 'Riesgo alto' },
      ],
    },
  },
  {
    id: 'beck',
    name: 'Beck (BDI-II)',
    fullName: 'Inventario de depresión de Beck',
    min: 0,
    max: 63,
    bands: [
      { max: 13, label: 'Depresión mínima' },
      { max: 19, label: 'Depresión leve' },
      { max: 28, label: 'Depresión moderada' },
      { max: 63, label: 'Depresión grave' },
    ],
  },
  {
    id: 'hamilton',
    name: 'Hamilton (HAM-A)',
    fullName: 'Escala de ansiedad de Hamilton',
    min: 0,
    max: 56,
    bands: [
      { max: 17, label: 'Ansiedad leve' },
      { max: 24, label: 'Ansiedad leve a moderada' },
      { max: 30, label: 'Ansiedad moderada a grave' },
      { max: 56, label: 'Ansiedad grave' },
    ],
  },
  {
    id: 'barratt',
    name: 'Barratt (BIS-11)',
    fullName: 'Escala de impulsividad de Barratt',
    min: 30,
    max: 120,
    bands: [
      { max: 51, label: 'Impulsividad baja' },
      { max: 71, label: 'Impulsividad en rango normal' },
      { max: 120, label: 'Impulsividad alta' },
    ],
  },
  {
    id: 'ipde',
    name: 'IPDE',
    fullName: 'Examen internacional de los trastornos de la personalidad',
    min: 0,
    max: 100,
    manual: true,
  },
  {
    id: 'mayo',
    name: 'Test de Mayo',
    fullName: 'Test de Mayo',
    min: 0,
    max: 100,
    manual: true,
  },
]

export const PSYCH_TEST_DISCLAIMER =
  'Interpretación orientativa según puntos de corte de uso habitual: el profesional la confirma o corrige.'

export function findPsychTest(id: PsychTestId): PsychTestDef {
  return PSYCH_TESTS.find((t) => t.id === id) ?? PSYCH_TESTS[0]
}

/** Banda que corresponde a un puntaje, o null si el test es de interpretación manual. */
export function scoreBand(def: PsychTestDef, score: number | null, substance?: string): ScoreBand | null {
  if (score == null || Number.isNaN(score) || def.manual) return null
  const bands = def.bandsBySubstance
    ? substance === 'Alcohol'
      ? def.bandsBySubstance.alcohol
      : def.bandsBySubstance.other
    : def.bands
  return bands?.find((b) => score <= b.max) ?? null
}

/** Límites entre bandas, para dibujarlos como líneas guía en la gráfica. */
export function bandCutoffs(def: PsychTestDef, substance?: string): number[] {
  const bands = def.bandsBySubstance
    ? substance === 'Alcohol'
      ? def.bandsBySubstance.alcohol
      : def.bandsBySubstance.other
    : def.bands
  return (bands ?? []).slice(0, -1).map((b) => b.max)
}
