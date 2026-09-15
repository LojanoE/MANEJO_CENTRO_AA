import { useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientPsychology } from '../../hooks/usePsychology'
import { useSettingsLive } from '../../hooks/useSettings'
import PrintLayout from '../../components/print/PrintLayout'
import type { PsychFormKind } from '../../types/psychology'
import { prefillValues } from '../../utils/clinicalPrint'
import { testResultRows } from '../../utils/psychology'
import { PSYCH_FORMS } from '../psychology/psychForms'
import BlankFormSheet from './forms/BlankFormSheet'

/** Entrevista o historia clínica psicológica llena con el último registro (la historia, también con los test). */
export default function PrintPsychForm({ kind }: { kind: PsychFormKind }) {
  const { patientId } = useParams<{ patientId: string }>()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const { settings } = useSettingsLive()
  const { template, shortNoun } = PSYCH_FORMS[kind]
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { formEntries, tests, loading: entriesLoading } = usePatientPsychology(patient)
  const entries = formEntries[kind]
  const entry = entries[entries.length - 1]

  if (!patient) {
    return (
      <PrintLayout title={template.title}>
        <p className="text-sm text-slate-500">{loading ? 'Cargando…' : 'Paciente no encontrado.'}</p>
      </PrintLayout>
    )
  }

  return (
    <PrintLayout title={`${template.title} — ${patient.name}`}>
      {entriesLoading ? (
        <p className="text-sm text-slate-500">Cargando {shortNoun}…</p>
      ) : (
        <>
          {!entry && (
            <p className="screen-only mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Aún no hay {shortNoun} registrada: se imprime el formato con los datos del paciente.
            </p>
          )}
          <BlankFormSheet
            template={template}
            values={prefillValues({ patient, record, centerName: settings.centerName })}
            answers={entry?.answers}
            testRows={testResultRows(tests)}
          />
          {entry && (
            <p className="mt-2 text-right text-[9px] text-slate-400">
              {template.title} del {entry.date} · {entry.authorName ?? '—'}
            </p>
          )}
        </>
      )}
    </PrintLayout>
  )
}
