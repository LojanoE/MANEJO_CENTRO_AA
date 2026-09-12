import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientOccupational } from '../../hooks/useOccupational'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { OCUPACIONAL } from '../../config/formTemplates/social'
import { prefillValues } from '../../utils/clinicalPrint'
import BlankFormSheet from './forms/BlankFormSheet'

/** Una evaluación ocupacional: la indicada por `entryId`, o la más reciente sin ella (en blanco si no hay ninguna). */
export default function PrintOccupational() {
  const { patientId, entryId } = useParams<{ patientId: string; entryId?: string }>()
  const { patients, loading } = usePatients()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const { entries, loading: entriesLoading } = usePatientOccupational(patient)
  const entry = entryId ? entries.find((e) => e.id === entryId) : entries[0]

  if (!patient) {
    return (
      <PrintLayout title="Área ocupacional">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Área ocupacional — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando evaluación…</p>
      ) : (
        <>
          {!entry && (
            <p className="screen-only mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Aún no hay evaluación registrada: se imprime el formato con los datos del paciente.
            </p>
          )}
          <BlankFormSheet
            template={OCUPACIONAL}
            values={prefillValues({ patient, centerName: settings.centerName })}
            answers={entry?.answers}
          />
        </>
      )}
    </PrintLayout>
  )
}
