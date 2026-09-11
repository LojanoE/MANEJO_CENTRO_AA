import {
  MSP_FORM_LABELS,
  SIGNOS_VITALES_LABELS,
  EXAMEN_FISICO_LABELS,
  REVISION_SISTEMAS_LABELS,
  type AntecedenteCategoria,
  type DiagnosticoCie10,
  type RecordEntry,
} from '../types/medicalRecord'
import { daysBetween } from './date'

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

/** "2026-09-11 · 10:30" o solo la fecha si la entrada no tiene hora. */
export function entryDateTime(entry: Pick<RecordEntry, 'date' | 'hora'>): string {
  return clean(entry.hora) ? `${entry.date} · ${clean(entry.hora)}` : entry.date
}

/** Orden cronológico por fecha y hora (las entradas sin hora van primero en su día). */
export function compareEntriesAsc(a: RecordEntry, b: RecordEntry): number {
  const ka = `${a.date} ${clean(a.hora)}`
  const kb = `${b.date} ${clean(b.hora)}`
  return ka < kb ? -1 : ka > kb ? 1 : 0
}

/** Secciones G y H: una clave presente en el mapa = marcada "con patología". */
export function isMarked(map: object | undefined, key: string): boolean {
  return map != null && typeof (map as Record<string, unknown>)[key] === 'string'
}

/** Lista de diagnósticos como texto: "[F10.2] Descripción (Definitivo)". */
export function diagnosticosListText(list: DiagnosticoCie10[] | undefined): string {
  return (list ?? [])
    .filter((d) => clean(d.descripcion) || clean(d.codigo))
    .map((d) => `${clean(d.codigo) ? `[${clean(d.codigo)}] ` : ''}${clean(d.descripcion)} (${d.tipo})`)
    .join('\n')
}

/** Diagnósticos vigentes de una entrada (en la epicrisis, los de egreso). */
export function diagnosticosText(entry: RecordEntry): string {
  if (entry.formType === '006') return diagnosticosListText(entry.diagnosticosEgreso)
  const list = entry.diagnosticos ?? []
  if (list.length > 0) return diagnosticosListText(list)
  return clean(entry.diagnostico) // LEGACY fallback
}

export function medicosTratantesText(entry: RecordEntry): string {
  return (entry.medicosTratantes ?? [])
    .filter((m) => clean(m.nombre))
    .map((m) => [clean(m.nombre), clean(m.especialidad), clean(m.codigo) && `cód. ${clean(m.codigo)}`, clean(m.periodo)].filter(Boolean).join(' · '))
    .join('\n')
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

/** Antecedentes: categorías marcadas + descripción libre. */
export function antecedentesText(marcados: AntecedenteCategoria[] | undefined, texto: string | undefined): string {
  const checks = (marcados ?? []).join(', ')
  return [checks, clean(texto)].filter(Boolean).join('\n')
}

/** Signos vitales como línea legible: "Temperatura: 36.5 · Presión arterial: 120/80 · …" */
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

export function revisionSistemasText(entry: RecordEntry): string {
  const rs = entry.revisionSistemas
  return REVISION_SISTEMAS_LABELS.filter(({ key }) => isMarked(rs, key))
    .map(({ key, code, label }) => `${code}. ${label}: ${clean(rs?.[key]) || 'con patología'}`)
    .join('\n')
}

/** Examen físico como texto multilínea "1R Piel - faneras: hallazgo". */
export function examenFisicoText(entry: RecordEntry): string {
  const ef = entry.examenFisico
  if (ef && Object.keys(ef).length > 0) {
    return EXAMEN_FISICO_LABELS.map(({ key, code, label }) => {
      if (key === 'general' || key === 'extremidades') {
        const v = clean(ef[key])
        return v ? `${label}: ${v}` : ''
      }
      if (!isMarked(ef, key)) return ''
      return `${code} ${label}: ${clean(ef[key]) || 'con patología'}`
    })
      .filter(Boolean)
      .join('\n')
  }
  return clean(entry.evaluacion) // LEGACY fallback
}

export function prescripcionText(p: NonNullable<RecordEntry['prescripciones']>[number]): string {
  return [
    clean(p.medicamento),
    clean(p.dosis) && `Dosis: ${clean(p.dosis)}`,
    clean(p.via) && `Vía: ${clean(p.via)}`,
    clean(p.frecuencia) && `Frec.: ${clean(p.frecuencia)}`,
    clean(p.duracion) && `Duración: ${clean(p.duracion)}`,
  ]
    .filter(Boolean)
    .join(' — ')
}

export function prescripcionesText(entry: RecordEntry): string {
  return (entry.prescripciones ?? [])
    .filter((p) => clean(p.medicamento))
    .map((p) => `${prescripcionText(p)}${p.administrado ? ' (administrado)' : ''}`)
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

  if (entry.formType === '006') {
    const dias = daysBetween(entry.fechaIngreso, entry.fechaEgreso)
    push(
      'Internamiento',
      [
        entry.fechaIngreso && `Ingreso: ${entry.fechaIngreso}`,
        entry.fechaEgreso && `Egreso: ${entry.fechaEgreso}`,
        dias != null && `Días de estada: ${dias}`,
      ]
        .filter(Boolean)
        .join(' · '),
    )
    push('Resumen del cuadro clínico', clean(entry.resumenCuadroClinico))
    push('Resumen de evolución y complicaciones', clean(entry.resumenEvolucion))
    push('Hallazgos relevantes', clean(entry.hallazgosRelevantes))
    push('Resumen de tratamiento', clean(entry.resumenTratamiento))
    push('Diagnósticos de ingreso', diagnosticosListText(entry.diagnosticosIngreso))
    push('Diagnósticos de egreso', diagnosticosListText(entry.diagnosticosEgreso))
    push('Condiciones de egreso y pronóstico', clean(entry.condicionesEgreso))
    push(
      'Egreso',
      [entry.tipoEgreso, entry.estadoEgreso, clean(entry.diasIncapacidad) && `Días de incapacidad: ${clean(entry.diasIncapacidad)}`]
        .filter(Boolean)
        .join(' · '),
    )
    push('Médicos tratantes', medicosTratantesText(entry))
    return sections
  }

  if (entry.formType === '002') {
    push('Tipo de consulta', clean(entry.tipoConsulta))
    push('Motivo de consulta', clean(entry.motivoConsulta))
    push('Enfermedad o problema actual', clean(entry.enfermedadActual))
    push('Antecedentes personales', antecedentesText(entry.antecedentesPersonalesMarcados, entry.antecedentesPersonales))
    push('Antecedentes familiares', antecedentesText(entry.antecedentesFamiliaresMarcados, entry.antecedentesFamiliares))
    push('Constantes vitales', signosVitalesText(entry))
    push('Revisión de órganos y sistemas', revisionSistemasText(entry))
    push('Examen físico', examenFisicoText(entry))
  }
  if (entry.formType === '005') {
    push('Nota de evolución', clean(entry.evolucion))
    push('Prescripciones', prescripcionesText(entry))
    push('Indicaciones', clean(entry.indicaciones))
  }
  push('Diagnósticos (CIE-10)', diagnosticosText(entry))
  push('Plan de tratamiento', tratamientoText(entry))
  if (entry.formType === '002') push('Evolución y pronóstico', clean(entry.evolucion))
  push('Observaciones', clean(entry.observaciones))
  return sections
}

/** Ícono, color del círculo y variante de insignia de cada tipo de entrada (líneas de tiempo). */
export function entryVisual(entry: Pick<RecordEntry, 'formType'>): {
  icon: string
  circleClass: string
  badgeVariant: 'activo' | 'nuevo' | 'alta' | 'pendiente'
} {
  switch (entry.formType) {
    case '002':
      return { icon: '🩺', circleClass: 'bg-emerald-100 text-emerald-700', badgeVariant: 'activo' }
    case '005':
      return { icon: '📋', circleClass: 'bg-blue-100 text-blue-700', badgeVariant: 'nuevo' }
    case '006':
      return { icon: '🏁', circleClass: 'bg-rose-100 text-rose-700', badgeVariant: 'alta' }
    default:
      return { icon: '🗂️', circleClass: 'bg-slate-100 text-slate-500', badgeVariant: 'pendiente' }
  }
}

/** Mapeo del tipo clásico al formulario MSP destino. Usado por la migración. */
export const LEGACY_TYPE_TO_FORM: Record<string, '002' | '005'> = {
  Apertura: '002',
  'Evaluación pre-visita': '002',
  Seguimiento: '005',
  Emergencia: '005',
  'Alta médica': '005',
}
