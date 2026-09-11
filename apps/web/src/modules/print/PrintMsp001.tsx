import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientAdmissions } from '../../hooks/useAdmissions'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import Msp001Sheet from './forms/Msp001Sheet'

/** MSP 001 Admisión de un paciente con sus admisiones y cambios registrados. */
export default function PrintMsp001() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const { settings } = useSettingsLive()

  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { admissions, changes, loading: admissionsLoading } = usePatientAdmissions(patient)

  if (!patient) {
    return (
      <PrintLayout title="Admisión (MSP 001)">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Admisión (MSP 001) — ${patient.name}`}>
      {admissionsLoading ? (
        <p className="text-sm text-slate-500">Cargando admisiones…</p>
      ) : (
        <Msp001Sheet
          patient={patient}
          record={record}
          admissions={admissions}
          changes={changes}
          centerName={settings.centerName}
          establishmentCode={settings.establishmentCode}
        />
      )}
    </PrintLayout>
  )
}
