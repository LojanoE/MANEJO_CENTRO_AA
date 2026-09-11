import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientPsychology } from '../../hooks/usePsychology'
import { useSettingsLive } from '../../hooks/useSettings'
import { useToast } from '../../components/ui/ToastProvider'
import TemplateFormFields from '../../components/forms/TemplateFormFields'
import { PSICO_HISTORIA } from '../../config/formTemplates/psicologia'
import type { FormAnswers } from '../../config/formTemplates/types'
import { answeredCount, initialAnswers } from '../../utils/formAnswers'
import { currentTimeHHMM, prefillValues } from '../../utils/clinicalPrint'
import { testResultRows } from '../../utils/psychology'
import { todayISO } from '../../utils/date'

/**
 * Historia clínica psicológica (con la entrevista para adultos integrada),
 * llenada en el sistema a partir del formato del centro.
 */
export default function PsychEvaluationForm() {
  const { patientId, entryId } = useParams<{ patientId: string; entryId?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { patients } = usePatients()
  const { records } = useRecords()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { evaluations, tests, loading, create, update } = usePatientPsychology(patient)

  const isEditing = Boolean(entryId)
  const editing = entryId ? evaluations.find((e) => e.id === entryId) : undefined

  const [answers, setAnswers] = useState<FormAnswers | null>(null)
  const [date, setDate] = useState(todayISO())
  const [hora, setHora] = useState(currentTimeHHMM())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Carga una sola vez: la suscripción en vivo no debe pisar lo que se escribe.
  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !patient || loading) return
    if (isEditing) {
      if (!editing) return
      loaded.current = true
      setAnswers(editing.answers ?? {})
      setDate(editing.date)
      setHora(editing.hora ?? '')
      return
    }
    loaded.current = true
    setAnswers(initialAnswers(PSICO_HISTORIA, prefillValues({ patient, record, centerName: settings.centerName })))
  }, [patient, record, loading, isEditing, editing, settings.centerName])

  const previous = !isEditing ? evaluations[evaluations.length - 1] : undefined

  if (!patient || !answers) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {!patient && !loading ? 'Paciente no encontrado.' : 'Cargando evaluación…'}
      </div>
    )
  }

  function copyPrevious() {
    if (!previous || !patient) return
    // Datos de identificación actuales encima de las respuestas anteriores.
    setAnswers({ ...previous.answers, ...initialAnswers(PSICO_HISTORIA, prefillValues({ patient, record, centerName: settings.centerName })) })
    toast.info(`Se copiaron las respuestas de la evaluación del ${previous.date}. Actualice lo que haya cambiado.`)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!patient || !answers) return
    setSaving(true)
    setError(null)
    try {
      if (isEditing && editing) {
        await update(editing, { date, hora, answers })
      } else {
        await create({ kind: 'evaluacion', templateId: PSICO_HISTORIA.id, date, hora, answers })
      }
      toast.success('Historia clínica psicológica guardada.')
      navigate(`/psychology/${patient.id}?tab=evaluacion`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evaluación.')
      setSaving(false)
    }
  }

  const progress = answeredCount(PSICO_HISTORIA, answers)
  const rows = testResultRows(tests)

  return (
    <form onSubmit={handleSave}>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(`/psychology/${patient.id}`)}
          className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition"
        >
          ← Volver al expediente psicológico
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">
            {isEditing ? 'Editar' : 'Nueva'} historia clínica psicológica
          </h2>
          <p className="text-slate-500">
            {patient.name} · {progress.answered} de {progress.total} campos con información
          </p>
        </div>
        {previous && (
          <button type="button" onClick={copyPrevious} className="btn-secondary text-sm self-start sm:self-auto">
            📋 Partir de la evaluación del {previous.date}
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Fecha de la evaluación</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="form-input" required />
          </div>
          <div>
            <label className="form-label">Hora</label>
            <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="form-input" />
          </div>
        </div>

        <TemplateFormFields
          template={PSICO_HISTORIA}
          answers={answers}
          onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))}
          renderTestResults={() => (
            <div className="space-y-2">
              {rows.length === 0 ? (
                <p className="text-sm text-slate-400">Sin test registrados.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-3 py-2">Test</th>
                        <th className="px-3 py-2">Fecha</th>
                        <th className="px-3 py-2 text-right">Puntaje</th>
                        <th className="px-3 py-2">Interpretación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((r) => (
                        <tr key={`${r.test}-${r.date}`}>
                          <td className="px-3 py-2 font-semibold text-slate-700">{r.test}</td>
                          <td className="px-3 py-2 text-slate-600">{r.date}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-700">{r.score}</td>
                          <td className="px-3 py-2 text-slate-600">{r.interpretation}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <a
                href={`#/psychology/${patient.id}?tab=test`}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-xs font-bold text-emerald-700 hover:underline"
              >
                Registrar test en otra pestaña →
              </a>
              <p className="text-xs text-slate-400">Se imprimen solos en la historia con el último resultado de cada test.</p>
            </div>
          )}
        />

        <div className="sticky bottom-0 -mx-6 lg:-mx-8 mt-8 flex gap-3 border-t border-slate-100 bg-white/95 px-6 lg:px-8 py-4 backdrop-blur">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar historia psicológica'}
          </button>
          <button type="button" onClick={() => navigate(`/psychology/${patient.id}`)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
