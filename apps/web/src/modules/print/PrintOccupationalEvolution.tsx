import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientOccupational } from '../../hooks/useOccupational'
import PrintLayout from '../../components/print/PrintLayout'
import OccupationalEvolutionSheet from './forms/OccupationalEvolutionSheet'

/** Hoja de evolución ocupacional con todas las atenciones del paciente. */
export default function PrintOccupationalEvolution() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { sessions, loading: entriesLoading } = usePatientOccupational(patient)

  if (!patient) {
    return (
      <PrintLayout title="Hoja de evolución ocupacional">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Hoja de evolución ocupacional — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando atenciones…</p>
      ) : (
        <OccupationalEvolutionSheet sessions={sessions} patient={patient} record={record} blankRows={sessions.length > 0 ? 3 : 10} />
      )}
    </PrintLayout>
  )
}
