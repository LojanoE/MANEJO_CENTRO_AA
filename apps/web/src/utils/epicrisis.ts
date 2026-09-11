import type { DiagnosticoCie10, MedicoTratante, RecordEntry, RecordEntryInput } from '../types/medicalRecord'
import type { Patient } from '../types/patient'
import type { Professional } from '../types/professional'
import { clean, findProfessional } from './clinicalPrint'
import { todayISO } from './date'
import {
  compareEntriesAsc,
  examenFisicoText,
  prescripcionText,
  revisionSistemasText,
  signosVitalesText,
  tratamientoText,
} from './mspEntry'

const validDx = (list: DiagnosticoCie10[] | undefined): DiagnosticoCie10[] =>
  (list ?? []).filter((d) => clean(d.descripcion) || clean(d.codigo)).map((d) => ({ ...d }))

/**
 * Borrador de la epicrisis (MSP 006) armado con lo ya registrado en la historia
 * clínica. Todo queda editable: es el punto de partida del médico, no el
 * documento final.
 *
 * - Cuadro clínico y hallazgos: de la primera consulta (002).
 * - Evolución y tratamiento: de las evoluciones (005) y el último plan.
 * - Diagnósticos de ingreso: los de la primera atención con diagnóstico;
 *   de egreso: los de la última.
 * - Médicos tratantes: quienes firmaron entradas, con su periodo.
 */
export function buildEpicrisisDraft({
  patient,
  entries,
  professionals,
}: {
  patient?: Patient | null
  entries: RecordEntry[]
  professionals: Professional[]
}): Partial<RecordEntryInput> {
  const clinical = entries.filter((e) => e.formType !== '006').sort(compareEntriesAsc)
  const first002 = clinical.find((e) => e.formType === '002')
  const evoluciones = clinical.filter((e) => e.formType === '005')
  const withDx = clinical.filter((e) => validDx(e.diagnosticos).length > 0)

  const resumenCuadroClinico = first002
    ? [clean(first002.motivoConsulta), clean(first002.enfermedadActual)].filter(Boolean).join('\n\n')
    : ''

  const hallazgosRelevantes = first002
    ? [
        signosVitalesText(first002) && `Constantes vitales al ingreso: ${signosVitalesText(first002)}`,
        revisionSistemasText(first002),
        examenFisicoText(first002),
      ]
        .filter(Boolean)
        .join('\n')
    : ''

  const resumenEvolucion = evoluciones.map((e) => `${e.date}: ${clean(e.evolucion) || e.title}`).join('\n')

  const meds = new Map<string, string>()
  for (const e of evoluciones) {
    for (const p of e.prescripciones ?? []) {
      const key = clean(p.medicamento).toLowerCase()
      if (key && !meds.has(key)) meds.set(key, prescripcionText(p))
    }
  }
  const lastPlan = [...clinical].reverse().map(tratamientoText).find(Boolean) ?? ''
  const resumenTratamiento = [
    meds.size > 0 && `Farmacoterapia:\n${[...meds.values()].map((m) => `- ${m}`).join('\n')}`,
    lastPlan && `Plan: ${lastPlan}`,
  ]
    .filter(Boolean)
    .join('\n\n')

  const byAuthor = new Map<string, { first: string; last: string; authorId?: string | null }>()
  for (const e of clinical) {
    const name = clean(e.authorName)
    if (!name) continue
    const current = byAuthor.get(name)
    if (current) current.last = e.date
    else byAuthor.set(name, { first: e.date, last: e.date, authorId: e.authorId })
  }
  const medicosTratantes: MedicoTratante[] = [...byAuthor.entries()].map(([nombre, period]) => {
    const prof = findProfessional(professionals, period.authorId, nombre)
    return {
      nombre,
      especialidad: prof?.specialty ?? '',
      codigo: prof?.registro ?? '',
      periodo: period.first === period.last ? period.first : `${period.first} a ${period.last}`,
    }
  })

  return {
    title: 'Epicrisis — egreso',
    fechaIngreso: patient?.admission || clinical[0]?.date || '',
    fechaEgreso: todayISO(),
    resumenCuadroClinico,
    resumenEvolucion,
    hallazgosRelevantes,
    resumenTratamiento,
    diagnosticosIngreso: validDx(withDx[0]?.diagnosticos),
    diagnosticosEgreso: validDx(withDx[withDx.length - 1]?.diagnosticos),
    condicionesEgreso: '',
    medicosTratantes,
    tipoEgreso: 'Alta definitiva',
  }
}
