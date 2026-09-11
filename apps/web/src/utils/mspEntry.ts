import {
  MSP_FORM_LABELS,
  SIGNOS_VITALES_LABELS,
  EXAMEN_FISICO_LABELS,
  type RecordEntry,
  type MspFormType,
} from '../types/medicalRecord'

/**
 * Helpers de presentación para entradas clínicas MSP.
 *
 * Regla de oro de la transición: una entrada puede ser MSP (`formType` definido)
 * o clásica sin migrar. Toda la UI pasa por estas funciones, que resuelven el
 * valor correcto con fallback al campo legado — nunca se lee `entry.anamnesis`
 * directamente fuera de aquí y de la migración.
 */

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Etiqueta corta del formulario: "MSP 002", "MSP 005" o "Clásico". */
export function entryFormBadge(entry: RecordEntry): string {
  return entry.formType ? `MSP ${entry.formType}` : 'Clásico'
}

export function entryFormLabel(entry: RecordEntry): string {
  return entry.formType ? MSP_FORM_LABELS[entry.formType] : entry.type ?? 'Entrada clásica'
}

export function diagnosticosText(entry: RecordEntry): string {
  const list = entry.diagnosticos ?? []
  if (list.length > 0) {
    return list
      .filter((d) => clean(d.descripcion) || clean(d.codigo))
      .map((d) => `${clean(d.codigo) ? `[${clean(d.codigo)}] ` : ''}${clean(d.descripcion)} (${d.tipo})`)
      .join('\n')
  }
  return clean(entry.diagnostico) // LEGACY fallback
}

export function tratamientoText(entry: RecordEntry): string {
  return clean(entry.planTratamiento) || clean(entry.tratamiento) // LEGACY fallback
}

export function evolucionText(entry: RecordEntry): string {
  return clean(entry.evolucion)
}

export function observacionesText(entry: RecordEntry): string {
  return clean(entry.observaciones)
}

/** Signos vitales como línea legible: "PA 120/80 · FC 72 lpm · …" */
export function signosVitalesText(entry: RecordEntry): string {
  const sv = entry.signosVitales
  if (!sv) return ''
  return SIGNOS_VITALES_LABELS.map(({ key, label }) => {
    const v = clean(sv[key])
    return v ? `${label}: ${v}` : ''
  })
    .filter(Boolean)
    .join(' · ')
}

/** Examen físico como texto multilínea "Sistema: hallazgo". */
export function examenFisicoText(entry: RecordEntry): string {
  const ef = entry.examenFisico
  if (ef && Object.values(ef).some((v) => clean(v))) {
    return EXAMEN_FISICO_LABELS.map(({ key, label }) => {
      const v = clean(ef[key])
      return v ? `${label}: ${v}` : ''
    })
      .filter(Boolean)
      .join('\n')
  }
  return clean(entry.evaluacion) // LEGACY fallback
}

export function prescripcionesText(entry: RecordEntry): string {
  const list = entry.prescripciones ?? []
  return list
    .filter((p) => clean(p.medicamento))
    .map((p) =>
      [
        clean(p.medicamento),
        clean(p.dosis) && `Dosis: ${clean(p.dosis)}`,
        clean(p.via) && `Vía: ${clean(p.via)}`,
        clean(p.frecuencia) && `Frec.: ${clean(p.frecuencia)}`,
        clean(p.duracion) && `Duración: ${clean(p.duracion)}`,
      ]
        .filter(Boolean)
        .join(' — '),
    )
    .join('\n')
}

export interface EntrySection {
  label: string
  value: string
}

/**
 * Secciones para mostrar/imprimir una entrada, en orden MSP.
 * Entrada MSP → secciones del formulario correspondiente; entrada clásica sin
 * migrar → sus 7 campos originales con las etiquetas de siempre.
 * Secciones vacías se omiten (los huecos los llena el médico editando).
 */
export function entryDisplaySections(entry: RecordEntry): EntrySection[] {
  if (!entry.formType) {
    // Entrada clásica aún no migrada.
    return [
      { label: 'Anamnesis', value: clean(entry.anamnesis) },
      { label: 'Antecedentes', value: clean(entry.antecedentes) },
      { label: 'Evaluación', value: clean(entry.evaluacion) },
      { label: 'Diagnóstico', value: clean(entry.diagnostico) },
      { label: 'Tratamiento', value: clean(entry.tratamiento) },
      { label: 'Evolución', value: clean(entry.evolucion) },
      { label: 'Observaciones', value: clean(entry.observaciones) },
    ].filter((s) => s.value)
  }

  const sections: EntrySection[] = []
  const push = (label: string, value: string) => {
    if (value) sections.push({ label, value })
  }

  if (entry.formType === '002') {
    push('Motivo de consulta', clean(entry.motivoConsulta))
    push('Enfermedad o problema actual', clean(entry.enfermedadActual))
    push('Antecedentes personales', clean(entry.antecedentesPersonales))
    push('Antecedentes familiares', clean(entry.antecedentesFamiliares))
    push('Signos vitales', signosVitalesText(entry))
    push('Examen físico', examenFisicoText(entry))
  }
  if (entry.formType === '005') {
    push('Nota de evolución', clean(entry.evolucion))
    push('Prescripciones', prescripcionesText(entry))
  }
  push('Diagnósticos (CIE-10)', diagnosticosText(entry))
  push('Plan de tratamiento', tratamientoText(entry))
  if (entry.formType === '002') push('Evolución', clean(entry.evolucion))
  push('Observaciones', clean(entry.observaciones))
  return sections
}

/** Mapeo del tipo clásico al formulario MSP destino. Usado por la migración. */
export const LEGACY_TYPE_TO_FORM: Record<string, MspFormType> = {
  Apertura: '002',
  'Evaluación pre-visita': '002',
  Seguimiento: '005',
  Emergencia: '005',
  'Alta médica': '005',
}
