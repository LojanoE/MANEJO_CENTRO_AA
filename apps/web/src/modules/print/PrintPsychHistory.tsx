import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientPsychology } from '../../hooks/usePsychology'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { PSICO_HISTORIA } from '../../config/formTemplates/psicologia'
import { prefillValues } from '../../utils/clinicalPrint'
import { testResultRows } from '../../utils/psychology'
import BlankFormSheet from './forms/BlankFormSheet'

/** Historia clínica psicológica llena con la última evaluación y los test registrados. */
export default function PrintPsychHistory() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { evaluations, tests, loading: entriesLoading } = usePatientPsychology(patient)
  const evaluation = evaluations[evaluations.length - 1]

  if (!patient) {
    return (
      <PrintLayout title="Historia clínica psicológica">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Historia clínica psicológica — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando evaluación…</p>
      ) : (
        <>
          {!evaluation && (
            <p className="screen-only mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Aún no hay evaluación registrada: se imprime el formato con los datos del paciente.
            </p>
          )}
          <BlankFormSheet
            template={PSICO_HISTORIA}
            values={prefillValues({ patient, record, centerName: settings.centerName })}
            answers={evaluation?.answers}
            testRows={testResultRows(tests)}
          />
          {evaluation && (
            <p className="mt-2 text-right text-[9px] text-slate-400">
              Evaluación del {evaluation.date} · {evaluation.authorName ?? '—'}
            </p>
          )}
        </>
      )}
    </PrintLayout>
  )
}
