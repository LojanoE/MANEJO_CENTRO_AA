import { startOfWeek, endOfWeek, addWeeks, format } from 'date-fns'
import type { MedicalRecord, RecordEntry } from '../types/medicalRecord'
import type { Patient } from '../types/patient'
import { entryFormLabel, diagnosticosText, tratamientoText, evolucionText, observacionesText } from './mspEntry'

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

/** One row of the weekly report: one clinical entry, with its patient and
 * author resolved. */
export interface Attention {
  entryId: string
  recordId: string
  date: string
  patientId: string
  patientName: string
  patientIdCard: string
  patientAge: number
  patientStage: string
  patientStatus: string
  /** Etiqueta del formulario MSP ("Consulta Externa (MSP 002)") o el tipo
   * clásico si la entrada aún no se ha migrado. */
  type: string
  title: string
  diagnostico: string
  tratamiento: string
  evolucion: string
  observaciones: string
  doctorUid: string | null
  doctorName: string | null
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
  /** Auth uid of the doctor to report on — NOT `Professional.id` (see
   * resolveDoctorUid below for translating from a Professional doc). */
  doctorUid: string
  from: string
  to: string
}

/** Pure: every clinical entry attributed to `doctorUid` whose date falls
 * within [from, to] (inclusive), across all patients, sorted by date. */
export function buildWeeklyAttentions(input: BuildWeeklyAttentionsInput): Attention[] {
  const { records, entriesByRecord, patients, doctorUid, from, to } = input
  const patientById = new Map(patients.map((p) => [p.id, p]))
  const recordById = new Map(records.map((r) => [r.id, r]))
  const result: Attention[] = []

  for (const [recordId, entries] of entriesByRecord) {
    const record = recordById.get(recordId)
    for (const entry of entries) {
      if (entry.date < from || entry.date > to) continue
      const author = resolveAttentionAuthor(entry, record)
      if (author.uid !== doctorUid) continue
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
        doctorUid: author.uid,
        doctorName: author.name,
      })
    }
  }

  return result.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1
    return a.patientName.localeCompare(b.patientName, 'es')
  })
}

/** `resumen-dr-garcia-2026-08-24.xlsx` / same slug for the PDF filename base. */
export function weeklyFilename(doctorName: string, from: string): string {
  const slug = doctorName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `resumen-semanal-${slug || 'medico'}-${from}`
}
