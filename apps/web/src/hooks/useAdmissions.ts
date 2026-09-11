import { useCallback, useMemo } from 'react'
import { useSubcollection } from './useCollection'
import { saveSubDoc, updateSubDoc, removeSubDoc, updateDocHelper, logActivity } from '../firebase/firestore'
import { ageFromBirthDate } from '../utils/date'
import type { Patient } from '../types/patient'
import type { Admission, AdmissionInput, PatientChange } from '../types/admission'
import type { TipoEgreso } from '../types/medicalRecord'

const byDate = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)

/** Primera admisión deducida de la ficha, para pacientes sin documentos de admisión. */
function firstAdmissionFromPatient(patient: Patient): AdmissionInput {
  return {
    date: patient.admission,
    age: patient.age || null,
    referredBy: patient.referredBy ?? '',
    kind: 'Primera',
    admittedByName: patient.admittedByName ?? '',
    dischargeDate: null,
    dischargeType: null,
    epicrisisEntryId: null,
  }
}

/**
 * Admisiones (internamientos) y registro de cambios de un paciente, en vivo.
 * Secciones 2 y 3 del MSP 001; la epicrisis cierra la admisión abierta.
 */
export function usePatientAdmissions(patient: Patient | null | undefined) {
  const patientId = patient?.id ?? '__none__'
  const { data: rawAdmissions, loading, error } = useSubcollection<Admission>('patients', patientId, 'admissions')
  const { data: rawChanges, loading: changesLoading } = useSubcollection<PatientChange>('patients', patientId, 'changes')

  const admissions = useMemo(() => [...rawAdmissions].sort(byDate), [rawAdmissions])
  const changes = useMemo(() => [...rawChanges].sort(byDate), [rawChanges])

  /** Filas para mostrar/imprimir: sin documentos, la primera admisión sale de la ficha. */
  const rows: Admission[] = useMemo(() => {
    if (admissions.length > 0 || !patient?.admission) return admissions
    return [{ id: 'ficha', ...firstAdmissionFromPatient(patient) }]
  }, [admissions, patient])

  const openAdmission = useMemo(() => [...rows].reverse().find((a) => !a.dischargeDate), [rows])

  const addReadmission = useCallback(
    async (input: { date: string; referredBy: string; admittedByName: string }) => {
      if (!patient) return
      // Materializa la primera admisión antes del reingreso para no perderla.
      if (admissions.length === 0 && patient.admission) {
        await saveSubDoc('patients', patient.id, 'admissions', firstAdmissionFromPatient(patient))
      }
      const age = patient.birthDate
        ? ageFromBirthDate(patient.birthDate, new Date(`${input.date}T00:00:00`))
        : patient.age || null
      const readmission: AdmissionInput = {
        ...input,
        age,
        kind: 'Subsecuente',
        dischargeDate: null,
        dischargeType: null,
        epicrisisEntryId: null,
      }
      await saveSubDoc('patients', patient.id, 'admissions', readmission)
      await updateDocHelper('patients', patient.id, { admission: input.date, status: 'Activo' })
      await logActivity({
        type: 'new_patient',
        message: `Reingreso registrado: ${patient.name}`,
        submessage: `${input.date}${input.referredBy ? ` · referido de ${input.referredBy}` : ''}`,
        refId: patient.id,
        color: 'bg-blue-500',
        icon: '🪪',
      })
    },
    [patient, admissions],
  )

  /** Cierra el internamiento abierto al guardar una epicrisis. */
  const closeOpenAdmission = useCallback(
    async (close: { dischargeDate: string; dischargeType: TipoEgreso | null; epicrisisEntryId: string }) => {
      if (!patient) return
      const open = [...admissions].reverse().find((a) => !a.dischargeDate)
      if (open) {
        await updateSubDoc('patients', patient.id, 'admissions', open.id, close)
      } else if (admissions.length === 0 && patient.admission) {
        await saveSubDoc('patients', patient.id, 'admissions', { ...firstAdmissionFromPatient(patient), ...close })
      }
    },
    [patient, admissions],
  )

  const removeAdmission = useCallback(
    async (admission: Admission) => {
      if (!patient || admission.id === 'ficha') return
      await removeSubDoc('patients', patient.id, 'admissions', admission.id)
    },
    [patient],
  )

  return {
    admissions: rows,
    openAdmission,
    changes,
    loading: loading || changesLoading,
    error,
    addReadmission,
    closeOpenAdmission,
    removeAdmission,
  }
}
