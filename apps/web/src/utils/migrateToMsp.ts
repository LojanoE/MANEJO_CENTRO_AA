import { collection, doc, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db } from '../firebase/config'
import { logActivity } from '../firebase/firestore'
import { LEGACY_TYPE_TO_FORM } from './mspEntry'
import type { MedicalRecord, RecordEntry } from '../types/medicalRecord'

/**
 * Migración única del formato clásico de medicina general a los formularios
 * MSP (Historia Clínica Única).
 *
 * Decisiones acordadas:
 * - Nada se borra: los campos clásicos quedan intactos en el documento; solo
 *   se agregan los campos MSP. La limpieza se hace aparte, tras validar.
 * - Lo que el dato clásico no tiene (signos vitales, CIE-10, antecedentes
 *   familiares…) queda EN BLANCO y la entrada queda marcada con
 *   `pendienteCompletar` para que el médico la complete solo si lo necesita.
 * - Toda entrada sin `formType` es candidata; las ya migradas se saltan.
 */

/** Formularios destino: el formato clásico nunca produce una epicrisis (006). */
type MigrationForm = '002' | '005'

export interface MigrationPlanItem {
  recordId: string
  entryId: string
  patientName: string
  title: string
  date: string
  legacyType: string
  formType: MigrationForm
  patch: Record<string, unknown>
}

export interface MigrationPreview {
  totalEntries: number
  alreadyMsp: number
  toMigrate: number
  byForm: Record<MigrationForm, number>
  items: MigrationPlanItem[]
}

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** Traduce una entrada clásica a su patch MSP. Pura: fácil de probar. */
export function mapLegacyEntry(entry: RecordEntry): { formType: MigrationForm; patch: Record<string, unknown> } {
  const formType: MigrationForm = LEGACY_TYPE_TO_FORM[entry.type ?? ''] ?? '005'

  const diagnosticos =
    clean(entry.diagnostico).length > 0
      ? [{ codigo: '', descripcion: clean(entry.diagnostico), tipo: 'Presuntivo' as const }]
      : []

  const base: Record<string, unknown> = {
    formType,
    diagnosticos,
    planTratamiento: clean(entry.tratamiento),
    observaciones: clean(entry.observaciones),
    migradoDesdeClasico: true,
    pendienteCompletar: true,
  }

  if (formType === '002') {
    // Apertura / evaluación pre-visita → Consulta externa.
    // motivoConsulta queda en blanco a propósito: el clásico no lo distinguía.
    Object.assign(base, {
      motivoConsulta: '',
      enfermedadActual: clean(entry.anamnesis),
      antecedentesPersonales: clean(entry.antecedentes),
      antecedentesFamiliares: '',
      examenFisico: clean(entry.evaluacion) ? { general: clean(entry.evaluacion) } : {},
      prescripciones: [],
      evolucion: clean(entry.evolucion),
    })
  } else {
    // Seguimiento / emergencia / alta → Evolución y prescripciones.
    // Lo subjetivo del clásico se conserva dentro de la nota de evolución.
    const partes = [
      clean(entry.anamnesis) && `Subjetivo: ${clean(entry.anamnesis)}`,
      clean(entry.evaluacion) && `Evaluación: ${clean(entry.evaluacion)}`,
      clean(entry.evolucion),
    ].filter(Boolean)
    Object.assign(base, {
      evolucion: partes.join('\n\n'),
      prescripciones: [],
    })
  }

  return { formType, patch: base }
}

/** Lee todo y calcula qué se migraría, sin escribir nada (dry-run). */
export async function previewMigration(): Promise<MigrationPreview> {
  const recordsSnap = await getDocs(collection(db, 'medicalRecords'))
  const records = recordsSnap.docs.map((d) => ({ ...(d.data() as MedicalRecord), id: d.id }))

  const items: MigrationPlanItem[] = []
  let totalEntries = 0
  let alreadyMsp = 0

  for (const record of records) {
    const entriesSnap = await getDocs(collection(doc(db, 'medicalRecords', record.id), 'entries'))
    for (const d of entriesSnap.docs) {
      const entry = { ...(d.data() as RecordEntry), id: d.id }
      totalEntries++
      if (entry.formType) {
        alreadyMsp++
        continue
      }
      const { formType, patch } = mapLegacyEntry(entry)
      items.push({
        recordId: record.id,
        entryId: entry.id,
        patientName: record.patientName,
        title: entry.title,
        date: entry.date,
        legacyType: entry.type ?? '—',
        formType,
        patch,
      })
    }
  }

  const byForm: Record<MigrationForm, number> = { '002': 0, '005': 0 }
  for (const item of items) byForm[item.formType]++

  return { totalEntries, alreadyMsp, toMigrate: items.length, byForm, items }
}

// Firestore caps a batch at 500 operations; stay under that with margin.
const BATCH_LIMIT = 450

/** Aplica el plan calculado por `previewMigration`. Idempotente: una entrada
 * ya migrada no vuelve a aparecer en el plan. */
export async function runMigration(items: MigrationPlanItem[]): Promise<number> {
  let migrated = 0
  for (let i = 0; i < items.length; i += BATCH_LIMIT) {
    const chunk = items.slice(i, i + BATCH_LIMIT)
    const batch = writeBatch(db)
    for (const item of chunk) {
      const ref = doc(db, 'medicalRecords', item.recordId, 'entries', item.entryId)
      batch.update(ref, { ...item.patch, updatedAt: serverTimestamp() })
    }
    await batch.commit()
    migrated += chunk.length
  }
  await logActivity({
    type: 'record_updated',
    message: 'Migración a formatos MSP ejecutada',
    submessage: `${migrated} entradas clásicas convertidas (002: ${items.filter((i) => i.formType === '002').length}, 005: ${items.filter((i) => i.formType === '005').length})`,
    refId: null,
    color: 'bg-violet-500',
    icon: '🩺',
  })
  return migrated
}
