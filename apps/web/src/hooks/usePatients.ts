import { useCallback } from 'react'
import { usePatientsContext } from '../contexts/PatientsContext'
import { useProfessionals } from './useProfessionals'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { deleteStorageFile } from '../firebase/storage'
import type { Patient, PatientInput, NewPatient } from '../types/patient'
import { useAuthStore } from '../stores/authStore'

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
        assignedDoctorName: resolveDoctorName(input.assignedDoctorId),
        status: input.status || 'Nuevo',
      }
      const id = await saveDoc('patients', data)
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
      await updateDocHelper('patients', id, data)
    },
    [resolveDoctorName],
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