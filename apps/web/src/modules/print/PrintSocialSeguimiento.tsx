import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientSocialWork } from '../../hooks/useSocialWork'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import { SOCIAL_SEGUIMIENTO } from '../../config/formTemplates/social'
import { formatTimestamp } from '../../utils/date'
import { prefillValues } from '../../utils/clinicalPrint'
import BlankFormSheet from './forms/BlankFormSheet'

/** Todas las visitas de seguimiento social de un paciente, una tras otra en orden cronológico. */
export default function PrintSocialSeguimiento() {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const { seguimientos, loading: entriesLoading } = usePatientSocialWork(patient)
  // El hook trae del más reciente al más antiguo; para leer como bitácora, del más antiguo al más reciente.
  const chronological = [...seguimientos].reverse()

  if (!patient) {
    return (
      <PrintLayout title="Ficha de seguimiento social">
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`Ficha de seguimiento social — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando seguimientos…</p>
      ) : chronological.length === 0 ? (
        <BlankFormSheet template={SOCIAL_SEGUIMIENTO} values={prefillValues({ patient, centerName: settings.centerName })} />
      ) : (
        <div className="space-y-8">
          {chronological.map((entry, i) => (
            <div key={entry.id} className="break-inside-avoid">
              {i > 0 && <div className="mb-4 border-t-2 border-dashed border-slate-300" />}
              <p className="mb-1 text-right text-[9px] text-slate-400">
                Visita {i + 1} de {chronological.length} · registrada el {formatTimestamp(entry.createdAt)}
              </p>
              <BlankFormSheet
                template={SOCIAL_SEGUIMIENTO}
                values={prefillValues({ patient, centerName: settings.centerName })}
                answers={entry.answers}
              />
            </div>
          ))}
        </div>
      )}
    </PrintLayout>
  )
}
