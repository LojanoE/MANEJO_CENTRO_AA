import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientSocialWork } from '../../hooks/useSocialWork'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { SOCIAL_SOCIOECONOMICA } from '../../config/formTemplates/social'
import { prefillValues } from '../../utils/clinicalPrint'
import BlankFormSheet from './forms/BlankFormSheet'

/** Ficha socioeconómica llena con la más reciente registrada (en blanco si no hay ninguna). */
export default function PrintSocialFicha() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const { fichas, loading: entriesLoading } = usePatientSocialWork(patient)
  const latest = fichas[0]

  if (!patient) {
    return (
      <PrintLayout title="Ficha socioeconómica">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Ficha socioeconómica — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando ficha…</p>
      ) : (
        <>
          {!latest && (
            <p className="screen-only mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Aún no hay ficha registrada: se imprime el formato con los datos del paciente.
            </p>
          )}
          <BlankFormSheet
            template={SOCIAL_SOCIOECONOMICA}
            values={prefillValues({ patient, centerName: settings.centerName })}
            answers={latest?.answers}
          />
        </>
      )}
    </PrintLayout>
  )
}
