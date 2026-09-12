import type { Patient, PatientSex } from '../types/patient'
import type { MedicalRecord } from '../types/medicalRecord'
import type { Professional } from '../types/professional'
import type { PrefillKey } from '../config/formTemplates/types'
import { todayISO } from './date'

/**
 * Datos compartidos por todas las impresiones clínicas (formularios MSP y
 * formatos del centro): número de historia, sexo, profesional responsable y
 * los valores con que se pre-llena un formato para un paciente.
 */

/** Texto recortado, o '' si el valor no es texto (campos opcionales de Firestore). */
export const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/** N° de historia clínica: la cédula (convención de la HCU) o, sin cédula,
 * el código interno de la ficha. */
export function hcNumber(patient?: Patient | null, record?: MedicalRecord | null): string {
  const idCard = patient?.idCard?.trim()
  if (idCard) return idCard
  return record ? record.id.slice(-8).toUpperCase() : ''
}

export const SEX_LABELS: Record<Exclude<PatientSex, ''>, string> = { M: 'Masculino', F: 'Femenino' }

export function sexLabel(sex: PatientSex | undefined): string {
  return sex ? SEX_LABELS[sex] : ''
}

/** Profesional que firmó una entrada: por cuenta vinculada y, si no, por nombre. */
export function findProfessional(
  professionals: Professional[],
  authorId: string | null | undefined,
  authorName: string | null | undefined,
): Professional | undefined {
  return (
    (authorId ? professionals.find((p) => p.uid === authorId) : undefined) ??
    (authorName ? professionals.find((p) => p.name.trim().toLowerCase() === authorName.trim().toLowerCase()) : undefined)
  )
}

/** Hora local actual en HH:MM, para pre-llenar la hora de la atención. */
export function currentTimeHHMM(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** IMC con un decimal a partir de peso (kg) y talla (cm); '' si falta algún dato. */
export function computeImc(peso: string | undefined, talla: string | undefined): string {
  const kg = Number(String(peso ?? '').replace(',', '.'))
  const cm = Number(String(talla ?? '').replace(',', '.'))
  if (!kg || !cm) return ''
  const m = cm / 100
  return (kg / (m * m)).toFixed(1)
}

/** Valores con que se pre-llena un formato impreso. Sin paciente, todo queda en blanco
 * salvo los datos del centro. */
export function prefillValues(ctx: {
  patient?: Patient | null
  record?: MedicalRecord | null
  centerName: string
}): Record<PrefillKey, string> {
  const { patient, record, centerName } = ctx
  return {
    center: centerName,
    today: patient ? todayISO() : '',
    now: patient ? currentTimeHHMM() : '',
    name: patient?.name ?? '',
    idCard: patient?.idCard ?? '',
    age: patient?.age ? String(patient.age) : '',
    sex: sexLabel(patient?.sex),
    birthDate: patient?.birthDate ?? '',
    maritalStatus: patient?.maritalStatus ?? '',
    religion: patient?.religion ?? '',
    occupation: patient?.occupation ?? '',
    education: patient?.education ?? '',
    phone: patient?.phone ?? '',
    address: patient?.address ?? '',
    admission: patient?.admission ?? '',
    hc: patient ? hcNumber(patient, record) : '',
    doctor: patient?.assignedDoctorName ?? record?.doctorName ?? '',
  }
}
