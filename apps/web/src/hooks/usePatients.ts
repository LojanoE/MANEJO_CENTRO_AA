import { useCallback } from 'react'
import { usePatientsContext } from '../contexts/PatientsContext'
import { useProfessionals } from './useProfessionals'
import { saveDoc, saveSubDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { deleteStorageFile } from '../firebase/storage'
import type { Patient, PatientInput, NewPatient } from '../types/patient'
import { TRACKED_CHANGE_FIELDS, type AdmissionInput } from '../types/admission'
import { useAuthStore } from '../stores/authStore'
import { todayISO } from '../utils/date'

const norm = (v: unknown): string => (typeof v === 'string' ? v.trim() : '')

/**
 * Sección 3 del MSP 001 (registro de cambios): si cambió un dato ya registrado
 * (estado civil, instrucción, ocupación, empresa, seguro, dirección, teléfono),
 * guarda la foto de los datos nuevos. Completar un dato vacío no es un cambio.
 */
async function recordTrackedChanges(before: Patient | undefined, patch: Partial<PatientInput>) {
  if (!before) return
  const changed = TRACKED_CHANGE_FIELDS.filter(
    (f) => f in patch && norm(before[f]) !== '' && norm(patch[f]) !== norm(before[f]),
  )
  if (changed.length === 0) return
  const after = { ...before, ...patch }
  await saveSubDoc('patients', before.id, 'changes', {
    ...Object.fromEntries(TRACKED_CHANGE_FIELDS.map((f) => [f, norm(after[f])])),
    changedFields: changed,
    date: todayISO(),
    changedByName: useAuthStore.getState().user?.name ?? null,
  })
}

export function usePatients() {
  const { patients, loading, error } = usePatientsContext()
  const { professionals } = useProfessionals()

  const resolveDoctorName = useCallback(
    (doctorId: string | null | undefined) => {
      if (!doctorId) return null
      return professionals.find((p) => p.id === doctorId)?.name ?? null
    },
    [professionals],
  )

  const create = useCallback(
    async (input: PatientInput) => {
      const user = useAuthStore.getState().user
      const data: NewPatient = {
        ...input,
        admittedByName: input.admittedByName || user?.name || '',
        assignedDoctorName: resolveDoctorName(input.assignedDoctorId),
        status: input.status || 'Nuevo',
      }
      const id = await saveDoc('patients', data)
      // Sección 2 del MSP 001: todo paciente nuevo abre su primera admisión.
      if (input.admission) {
        const firstAdmission: AdmissionInput = {
          date: input.admission,
          age: input.age || null,
          referredBy: input.referredBy ?? '',
          kind: 'Primera',
          admittedByName: data.admittedByName ?? '',
          dischargeDate: null,
          dischargeType: null,
          epicrisisEntryId: null,
        }
        await saveSubDoc('patients', id, 'admissions', firstAdmission)
      }
      await logActivity({
        type: 'new_patient',
        message: `Paciente ingresado: ${input.name}`,
        submessage: `${input.stage} · ${user?.name ?? ''}`,
        refId: id,
        color: 'bg-blue-500',
        icon: '👤',
      })
      return id
    },
    [resolveDoctorName],
  )

  const update = useCallback(
    async (id: string, patch: Partial<PatientInput>) => {
      const data: Partial<NewPatient> = { ...patch }
      if ('assignedDoctorId' in patch) {
        data.assignedDoctorName = resolveDoctorName(patch.assignedDoctorId)
      }
      const before = patients.find((p) => p.id === id)
      await updateDocHelper('patients', id, data)
      await recordTrackedChanges(before, patch)
    },
    [resolveDoctorName, patients],
  )

  const remove = useCallback(async (patient: Patient) => {
    if (patient.photoFileId) {
      try {
        await deleteStorageFile(patient.photoFileId)
      } catch {
        // Si Storage falla, continuamos eliminando el documento.
      }
    }
    await removeDoc('patients', patient.id)
    await logActivity({
      type: 'new_patient',
      message: `Paciente eliminado: ${patient.name}`,
      submessage: 'Administrador',
      refId: patient.id,
      color: 'bg-red-400',
      icon: '🗑️',
    })
  }, [])

  return { patients, loading, error, create, update, remove }
}
