import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientPsychology } from '../../hooks/usePsychology'
import PrintLayout from '../../components/print/PrintLayout'
import PsychEvolutionSheet from './forms/PsychEvolutionSheet'

/** Hoja de evolución psicológica con todas las sesiones del paciente. */
export default function PrintPsychEvolution() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { sessions, loading: entriesLoading } = usePatientPsychology(patient)

  if (!patient) {
    return (
      <PrintLayout title="Hoja de evolución psicológica">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Hoja de evolución psicológica — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando sesiones…</p>
      ) : (
        <PsychEvolutionSheet sessions={sessions} patient={patient} record={record} blankRows={sessions.length > 0 ? 3 : 10} />
      )}
    </PrintLayout>
  )
}
