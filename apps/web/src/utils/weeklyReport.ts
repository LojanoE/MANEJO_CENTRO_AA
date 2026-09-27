import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'
import type { MedicalRecord, RecordEntry } from '../types/medicalRecord'
import type { Patient } from '../types/patient'
import type { PsychEntry } from '../types/psychology'
import type { SocialWorkEntry } from '../types/socialWork'
import type { OccupationalEntry } from '../types/occupational'
import { entryFormLabel, diagnosticosText, tratamientoText, evolucionText, observacionesText } from './mspEntry'
import { timestampToISODate } from './date'
import { isOccupationalSession } from '../types/occupational'
import { occupationalTotals } from './occupational'
import { PSYCH_KIND_LABELS } from '../hooks/usePsychology'

/**
 * Parses an ISO `yyyy-mm-dd` string as local midnight, not UTC midnight.
 *
 * `new Date('yyyy-mm-dd')` parses as UTC, which in a timezone west of UTC
 * (e.g. Ecuador, UTC-5) lands on the *previous* local day — silently shifting
 * week boundaries by a day. Verified: `new Date('2026-08-24')` (a Monday)
 * renders locally as Sunday Aug 23 in UTC-5, so `startOfWeek` would return the
 * wrong week entirely. Always go through this for date-only strings.
 */
export function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export interface WeekRange {
  /** yyyy-mm-dd, Monday */
  from: string
  /** yyyy-mm-dd, Sunday */
  to: string
}

/** The Monday–Sunday week containing `date` (defaults to today). */
export function getWeekRange(date: Date | string = new Date()): WeekRange {
  const base = typeof date === 'string' ? parseISODateLocal(date) : date
  return {
    from: format(startOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
    to: format(endOfWeek(base, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
  }
}

/** Moves a week range forward/back by `deltaWeeks` (negative to go back). */
export function shiftWeek(range: WeekRange, deltaWeeks: number): WeekRange {
  return getWeekRange(addWeeks(parseISODateLocal(range.from), deltaWeeks))
}

/** One row of the weekly report: one clinical entry (de cualquier área — médica,
 * psicológica, social u ocupacional), con su paciente y autor resueltos. */
export interface Attention {
  entryId: string
  /** Solo aplica a entradas médicas (viven bajo `medicalRecords/{recordId}`). */
  recordId?: string
  date: string
  patientId: string
  patientName: string
  patientIdCard: string
  patientAge: number
  patientStage: string
  patientStatus: string
  /** Ej. "Consulta Externa (MSP 002)", "Sesión psicológica", "Ficha de seguimiento social". */
  type: string
  title: string
  diagnostico: string
  tratamiento: string
  evolucion: string
  observaciones: string
  authorUid: string | null
  authorName: string | null
}

/**
 * Who attended: the entry's own author if it has one, otherwise the doctor who
 * opened the parent record — the only attribution available for entries written
 * before `RecordEntry.authorId` existed.
 */
export function resolveAttentionAuthor(
  entry: RecordEntry,
  record: MedicalRecord | undefined,
): { uid: string | null; name: string | null } {
  if (entry.authorId) return { uid: entry.authorId, name: entry.authorName ?? record?.doctorName ?? null }
  return { uid: record?.doctorId ?? null, name: record?.doctorName ?? null }
}

export interface BuildWeeklyAttentionsInput {
  records: MedicalRecord[]
  entriesByRecord: Map<string, RecordEntry[]>
  patients: Patient[]
  /** Auth uid del médico a reportar — NO `Professional.id`. */
  authorUid: string
  from: string
  to: string
}

/** Pure: every clinical entry attributed to `authorUid` whose date falls
 * within [from, to] (inclusive), across all patients, sorted by date. */
export function buildWeeklyMedicalAttentions(input: BuildWeeklyAttentionsInput): Attention[] {
  const { records, entriesByRecord, patients, authorUid, from, to } = input
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const recordById = new Map(records.map((r) => [r.id, r]))
  const result: Attention[] = []

  for (const [recordId, entries] of entriesByRecord) {
    const record = recordById.get(recordId)
    for (const entry of entries) {
      if (entry.date < from || entry.date > to) continue
      const author = resolveAttentionAuthor(entry, record)
      if (author.uid !== authorUid) continue
      const patient = record ? patientById.get(record.patientId) : undefined
      result.push({
        entryId: entry.id,
        recordId,
        date: entry.date,
        patientId: record?.patientId ?? patient?.id ?? '',
        patientName: record?.patientName ?? patient?.name ?? 'Paciente',
        patientIdCard: patient?.idCard ?? '',
        patientAge: patient?.age ?? 0,
        patientStage: patient?.stage ?? '—',
        patientStatus: patient?.status ?? '—',
        type: entryFormLabel(entry),
        title: entry.title,
        diagnostico: diagnosticosText(entry),
        tratamiento: tratamientoText(entry),
        evolucion: evolucionText(entry),
        observaciones: observacionesText(entry),
        authorUid: author.uid,
        authorName: author.name,
      })
    }
  }

  return sortAttentions(result)
}

function sortAttentions(list: Attention[]): Attention[] {
  return list.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.patientName.localeCompare(b.patientName, 'es')
  })
}

/** Base común a los tres constructores de abajo: resuelve los datos del
 * paciente y arma la fila, dejando que cada área rellene lo específico. */
function attentionRow(
  patient: Patient | undefined,
  base: Pick<Attention, 'entryId' | 'date' | 'type' | 'title' | 'diagnostico' | 'tratamiento' | 'evolucion' | 'observaciones' | 'authorUid' | 'authorName'>,
): Attention {
  return {
    ...base,
    patientId: patient?.id ?? '',
    patientName: patient?.name ?? 'Paciente',
    patientIdCard: patient?.idCard ?? '',
    patientAge: patient?.age ?? 0,
    patientStage: patient?.stage ?? '—',
    patientStatus: patient?.status ?? '—',
  }
}

export interface BuildWeeklyAreaAttentionsInput<T> {
  entries: T[]
  patients: Patient[]
  authorUid: string
  from: string
  to: string
}

/** Sesiones, entrevistas, historias y test de Psicología atribuidos a `authorUid`. */
export function buildWeeklyPsychologyAttentions({
  entries,
  patients,
  authorUid,
  from,
  to,
}: BuildWeeklyAreaAttentionsInput<PsychEntry>): Attention[] {
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const result: Attention[] = []

  for (const entry of entries) {
    if (entry.authorId !== authorUid) continue
    if (entry.date < from || entry.date > to) continue
    const tratamiento = entry.kind === 'sesion' ? entry.process : entry.kind === 'test' ? entry.interpretation : ''
    const observaciones = entry.kind === 'sesion' ? entry.observations : entry.kind === 'test' ? entry.notes : ''
    result.push(
      attentionRow(patientById.get(entry.patientId), {
        entryId: entry.id,
        date: entry.date,
        type: PSYCH_KIND_LABELS[entry.kind],
        title: PSYCH_KIND_LABELS[entry.kind],
        diagnostico: '',
        tratamiento,
        evolucion: '',
        observaciones,
        authorUid: entry.authorId ?? null,
        authorName: entry.authorName ?? null,
      }),
    )
  }

  return sortAttentions(result)
}

const SOCIAL_KIND_LABELS = { ficha: 'Ficha socioeconómica', seguimiento: 'Ficha de seguimiento social' } as const

/** Fichas de Trabajo Social atribuidas a `authorUid`. Sin campo `date` propio
 * (vive dentro del formato): se usa `createdAt`, igual que el resto de la app
 * las muestra (ver `SocialPatient.tsx`). */
export function buildWeeklySocialAttentions({
  entries,
  patients,
  authorUid,
  from,
  to,
}: BuildWeeklyAreaAttentionsInput<SocialWorkEntry>): Attention[] {
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const result: Attention[] = []

  for (const entry of entries) {
    if (entry.authorId !== authorUid) continue
    const date = timestampToISODate(entry.createdAt)
    if (!date || date < from || date > to) continue
    result.push(
      attentionRow(patientById.get(entry.patientId), {
        entryId: entry.id,
        date,
        type: SOCIAL_KIND_LABELS[entry.kind],
        title: SOCIAL_KIND_LABELS[entry.kind],
        diagnostico: '',
        tratamiento: '',
        evolucion: '',
        observaciones: '',
        authorUid: entry.authorId ?? null,
        authorName: entry.authorName ?? null,
      }),
    )
  }

  return sortAttentions(result)
}

/** Evaluaciones y atenciones (hoja de evolución) de Terapia Ocupacional
 * atribuidas a `authorUid`. Las evaluaciones tampoco tienen `date` propio. */
export function buildWeeklyOccupationalAttentions({
  entries,
  patients,
  authorUid,
  from,
  to,
}: BuildWeeklyAreaAttentionsInput<OccupationalEntry>): Attention[] {
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const result: Attention[] = []

  for (const entry of entries) {
    if (entry.authorId !== authorUid) continue
    const date = isOccupationalSession(entry) ? entry.date : timestampToISODate(entry.createdAt)
    if (!date || date < from || date > to) continue
    const tratamiento = isOccupationalSession(entry)
      ? entry.process
      : (() => {
          const t = occupationalTotals(entry.answers, entry.templateId)
          return `Cumple: ${t.c} · No cumple: ${t.nc} · No aplica: ${t.na}`
        })()
    result.push(
      attentionRow(patientById.get(entry.patientId), {
        entryId: entry.id,
        date,
        type: isOccupationalSession(entry) ? 'Atención ocupacional' : 'Evaluación ocupacional',
        title: isOccupationalSession(entry) ? 'Atención ocupacional' : 'Evaluación ocupacional',
        diagnostico: '',
        tratamiento,
        evolucion: '',
        observaciones: isOccupationalSession(entry) ? entry.observations : '',
        authorUid: entry.authorId ?? null,
        authorName: entry.authorName ?? null,
      }),
    )
  }

  return sortAttentions(result)
}

/** `resumen-dr-garcia-2026-08-24.xlsx` / same slug for the PDF filename base. */
export function weeklyFilename(professionalName: string, from: string): string {
  const slug = professionalName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `resumen-semanal-${slug || 'profesional'}-${from}`
}
