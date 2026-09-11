import * as XLSX from 'xlsx'
import type { PatientDossier } from './patientDossier'
import type { Attention } from './weeklyReport'
import {
  entryFormLabel,
  diagnosticosText,
  tratamientoText,
  evolucionText,
  observacionesText,
  signosVitalesText,
  examenFisicoText,
  prescripcionesText,
} from './mspEntry'

const clean = (v: unknown): string => (typeof v === 'string' ? v : '')

/**
 * Export one or many dossiers to a single .xlsx workbook.
 *
 * Every sheet repeats `pacienteId` / `paciente` so the sheets can be cross
 * referenced when the workbook holds more than one patient.
 */
export function exportDossiersToExcel(dossiers: PatientDossier[], filename: string): void {
  const book = XLSX.utils.book_new()

  const patients = dossiers.map(({ patient: p }) => ({
    pacienteId: p.id,
    paciente: p.name,
    cedula: p.idCard ?? '',
    fechaNacimiento: p.birthDate ?? '',
    edad: p.age,
    estadoCivil: p.maritalStatus ?? '',
    religion: p.religion ?? '',
    ocupacion: p.occupation ?? '',
    instruccion: p.education ?? '',
    telefono: p.phone,
    email: p.email ?? '',
    direccion: p.address ?? '',
    padrino: p.sponsor ?? '',
    fechaIngreso: p.admission,
    fase: p.stage,
    estado: p.status,
    medicoAsignado: p.assignedDoctorName ?? '',
    cuotaMensual: p.monthlyFee ?? '',
    proximoPago: p.nextPaymentDate ?? '',
  }))

  const entries = dossiers.flatMap(({ patient, entries: list }) =>
    list.map((e) => ({
      pacienteId: patient.id,
      paciente: patient.name,
      fecha: e.date,
      formulario: entryFormLabel(e),
      titulo: e.title,
      motivoConsulta: clean(e.motivoConsulta),
      enfermedadActual: clean(e.enfermedadActual),
      antecedentesPersonales: clean(e.antecedentesPersonales),
      antecedentesFamiliares: clean(e.antecedentesFamiliares),
      signosVitales: signosVitalesText(e),
      examenFisico: examenFisicoText(e),
      diagnosticos: diagnosticosText(e),
      evolucion: evolucionText(e),
      prescripciones: prescripcionesText(e),
      planTratamiento: tratamientoText(e),
      observaciones: observacionesText(e),
    })),
  )

  const payments = dossiers.flatMap(({ patient, payments: list }) =>
    list.map((p) => ({
      pacienteId: patient.id,
      paciente: patient.name,
      fecha: p.date,
      concepto: p.concept,
      monto: p.amount ?? 0,
      estado: p.status,
      metodo: p.method,
      proximoPago: p.nextPaymentDate ?? '',
    })),
  )

  const visits = dossiers.flatMap(({ patient, visits: list }) =>
    list.map((v) => ({
      pacienteId: patient.id,
      paciente: patient.name,
      fecha: v.date,
      hora: v.time,
      visitante: v.visitor,
      tipo: v.type,
      estado: v.status,
      medico: v.doctorName ?? '',
      notas: v.notes ?? '',
    })),
  )

  const auths = dossiers.flatMap(({ patient, auths: list }) =>
    list.map((a) => ({
      pacienteId: patient.id,
      paciente: patient.name,
      fecha: a.date,
      tipo: a.type,
      estado: a.status,
      medico: a.doctorName ?? '',
      notas: a.notes ?? '',
    })),
  )

  const tasks = dossiers.flatMap(({ patient, tasks: list }) =>
    list.map((t) => ({
      pacienteId: patient.id,
      paciente: patient.name,
      titulo: t.title,
      descripcion: t.description ?? '',
      categoria: t.category,
      asignadoA: t.assignedToName ?? '',
      vencimiento: t.dueDate ?? '',
      prioridad: t.priority,
      estado: t.status,
      completadaEl: t.completedAt ?? '',
    })),
  )

  const sheets: [string, Record<string, unknown>[]][] = [
    ['Pacientes', patients],
    ['Historia clínica', entries],
    ['Pagos', payments],
    ['Visitas', visits],
    ['Autorizaciones', auths],
    ['Tareas', tasks],
  ]

  for (const [name, rows] of sheets) {
    // A sheet built from [] has no header row at all; keep the sheet anyway so
    // the workbook shape is identical for every export.
    XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), name)
  }

  XLSX.writeFile(book, filename)
}

/** `expediente-juan-perez-2026-08-24.xlsx` */
export function dossierFilename(label: string): string {
  const slug = label
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `expediente-${slug || 'pacientes'}-${new Date().toISOString().slice(0, 10)}.xlsx`
}

export interface WeeklyReportMeta {
  doctorName: string
  from: string
  to: string
}

/**
 * Export a doctor's weekly attentions to a workbook with two sheets:
 * `Atenciones` (one row per clinical entry) and `Resumen` (totals for the
 * covering letter / quick check against the printed PDF).
 */
export function exportWeeklyToExcel(attentions: Attention[], meta: WeeklyReportMeta, filename: string): void {
  const book = XLSX.utils.book_new()

  const rows = attentions.map((a) => ({
    fecha: a.date,
    paciente: a.patientName,
    cedula: a.patientIdCard,
    edad: a.patientAge,
    fase: a.patientStage,
    estado: a.patientStatus,
    tipoAtencion: a.type,
    titulo: a.title,
    diagnostico: a.diagnostico,
    tratamiento: a.tratamiento,
    evolucion: a.evolucion,
    observaciones: a.observaciones,
    medico: a.doctorName ?? meta.doctorName,
  }))
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(rows), 'Atenciones')

  const uniquePatients = new Set(attentions.map((a) => a.patientId)).size
  const byType = new Map<string, number>()
  for (const a of attentions) byType.set(a.type, (byType.get(a.type) ?? 0) + 1)

  const summaryRows: Record<string, unknown>[] = [
    { campo: 'Médico', valor: meta.doctorName },
    { campo: 'Semana desde', valor: meta.from },
    { campo: 'Semana hasta', valor: meta.to },
    { campo: 'Total de atenciones', valor: attentions.length },
    { campo: 'Pacientes distintos', valor: uniquePatients },
    ...Array.from(byType.entries()).map(([tipo, count]) => ({ campo: `Tipo — ${tipo}`, valor: count })),
  ]
  XLSX.utils.book_append_sheet(book, XLSX.utils.json_to_sheet(summaryRows), 'Resumen')

  XLSX.writeFile(book, filename)
}
