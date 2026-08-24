import { collection, doc, getDocs } from 'firebase/firestore'
import { db } from '../firebase/config'
import type { Patient } from '../types/patient'
import type { MedicalRecord, RecordEntry } from '../types/medicalRecord'
import type { Payment } from '../types/payment'
import type { Visit } from '../types/visit'
import type { MedicalAuth } from '../types/medicalAuth'
import type { Task } from '../types/task'

/**
 * Canonical list of clinical fields of a record entry, in the order they should
 * be presented. Single source of truth for the printable views and the Excel
 * export so an audit copy never silently misses a field.
 */
export const RECORD_FIELDS: { key: keyof RecordEntry; label: string }[] = [
  { key: 'anamnesis', label: 'Anamnesis' },
  { key: 'antecedentes', label: 'Antecedentes' },
  { key: 'evaluacion', label: 'Evaluación' },
  { key: 'diagnostico', label: 'Diagnóstico' },
  { key: 'tratamiento', label: 'Tratamiento' },
  { key: 'evolucion', label: 'Evolución' },
  { key: 'observaciones', label: 'Observaciones' },
]

/** Everything the center holds about one patient, gathered in one place. */
export interface PatientDossier {
  patient: Patient
  record: MedicalRecord | null
  entries: RecordEntry[]
  payments: Payment[]
  visits: Visit[]
  auths: MedicalAuth[]
  tasks: Task[]
}

/** The live collections a dossier is assembled from. */
export interface DossierSources {
  records: MedicalRecord[]
  entriesByRecord: Map<string, RecordEntry[]>
  payments: Payment[]
  visits: Visit[]
  auths: MedicalAuth[]
  tasks: Task[]
}

const byDateAsc = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? -1 : 1)
const byDateDesc = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? 1 : -1)

/**
 * One-shot read of the `entries` subcollection for each record.
 *
 * `useRecordEntries` only subscribes to a single record, so a bulk export can't
 * use it — this reads every record's entries directly. Costs one query per
 * record, so call it from an explicit user action, never on render.
 */
export async function fetchEntriesByRecord(recordIds: string[]): Promise<Map<string, RecordEntry[]>> {
  const result = new Map<string, RecordEntry[]>()
  const reads = recordIds.map(async (recordId) => {
    const snap = await getDocs(collection(doc(db, 'medicalRecords', recordId), 'entries'))
    const entries = snap.docs.map((d) => ({ ...(d.data() as RecordEntry), id: d.id }))
    result.set(recordId, entries.sort(byDateAsc))
  })
  await Promise.all(reads)
  return result
}

/**
 * Assemble one patient's dossier from already-loaded collections. Pure — the
 * patient detail view passes data straight from its live hooks, while the bulk
 * export passes data it fetched itself.
 */
export function buildDossier(patient: Patient, sources: DossierSources): PatientDossier {
  const record = sources.records.find((r) => r.patientId === patient.id) ?? null
  const entries = record ? (sources.entriesByRecord.get(record.id) ?? []) : []
  return {
    patient,
    record,
    entries: [...entries].sort(byDateAsc),
    payments: sources.payments.filter((p) => p.patientId === patient.id).sort(byDateDesc),
    visits: sources.visits.filter((v) => v.patientId === patient.id).sort(byDateDesc),
    auths: sources.auths.filter((a) => a.patientId === patient.id).sort(byDateDesc),
    tasks: sources.tasks.filter((t) => t.patientId === patient.id),
  }
}

const readAll = async <T>(name: string): Promise<T[]> => {
  const snap = await getDocs(collection(db, name))
  return snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }))
}

/**
 * Build the dossiers for a set of patients, reading everything they need on
 * demand.
 *
 * Deliberately uses one-shot `getDocs` rather than the live hooks: exporting is
 * an occasional action, and subscribing the patients list to payments, visits,
 * authorizations, tasks and records just to feed a button would leave five
 * permanent listeners open on the app's busiest screen (see PatientsContext).
 */
export async function buildDossiersFor(patients: Patient[]): Promise<PatientDossier[]> {
  const [records, payments, visits, auths, tasks] = await Promise.all([
    readAll<MedicalRecord>('medicalRecords'),
    readAll<Payment>('payments'),
    readAll<Visit>('visits'),
    readAll<MedicalAuth>('medicalAuths'),
    readAll<Task>('tasks'),
  ])
  const patientIds = new Set(patients.map((p) => p.id))
  const relevantRecordIds = records.filter((r) => patientIds.has(r.patientId)).map((r) => r.id)
  const entriesByRecord = await fetchEntriesByRecord(relevantRecordIds)
  return patients.map((p) =>
    buildDossier(p, { records, entriesByRecord, payments, visits, auths, tasks }),
  )
}
