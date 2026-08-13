import { useCallback } from 'react'
import { useCollection } from './useCollection'
import { saveDoc, updateDocHelper, removeDoc, logActivity } from '../firebase/firestore'
import { deleteDriveFile } from '../firebase/drive'
import type { Patient, PatientInput, NewPatient } from '../types/patient'
import { useAuthStore } from '../stores/authStore'

export function usePatients() {
  const { data: patients, loading, error } = useCollection<Patient>('patients')

  const create = useCallback(async (input: PatientInput) => {
    const user = useAuthStore.getState().user
    const data: NewPatient = {
      ...input,
      assignedDoctorName: null,
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
  }, [])

  const update = useCallback(async (id: string, patch: Partial<PatientInput>) => {
    await updateDocHelper('patients', id, patch)
  }, [])

  const remove = useCallback(async (patient: Patient) => {
    if (patient.photoFileId) {
      try {
        await deleteDriveFile(patient.photoFileId)
      } catch {
        // Si Drive falla, continuamos eliminando el documento.
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