import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientOccupational } from '../../hooks/useOccupational'
import { useSettingsLive } from '../../hooks/useSettings'
import { useToast } from '../../components/ui/ToastProvider'
import TemplateFormFields from '../../components/forms/TemplateFormFields'
import type { FormAnswers } from '../../config/formTemplates/types'
import { answeredCount, initialAnswers } from '../../utils/formAnswers'
import { prefillValues } from '../../utils/clinicalPrint'
import { occupationalTemplate } from '../../utils/occupational'

/** Evaluación ocupacional por criterios (cumple / no cumple / no aplica). */
export default function OccupationalForm() {
  const { patientId, entryId } = useParams<{ patientId: string; entryId?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { patients } = usePatients()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const { evaluations, loading, create, update } = usePatientOccupational(patient)

  const isEditing = Boolean(entryId)
  const editing = entryId ? evaluations.find((e) => e.id === entryId) : undefined
  // Al editar se respeta el formato con que se capturó; lo nuevo usa el del centro.
  const template = occupationalTemplate(editing?.templateId)

  const [answers, setAnswers] = useState<FormAnswers | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loaded = useRef(false)
  useEffect(() => {
    if (loaded.current || !patient || loading) return
    if (isEditing) {
      if (!editing) return
      loaded.current = true
      setAnswers(editing.answers ?? {})
      return
    }
    loaded.current = true
    setAnswers(initialAnswers(template, prefillValues({ patient, centerName: settings.centerName })))
  }, [patient, loading, isEditing, editing, template, settings.centerName])

  if (!patient || !answers) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {!patient && !loading ? 'Paciente no encontrado.' : 'Cargando evaluación…'}
      </div>
    )
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!patient || !answers) return
    setSaving(true)
    setError(null)
    try {
      if (isEditing && editing) {
        await update(editing, { answers })
      } else {
        await create({ kind: 'evaluacion', templateId: template.id, answers })
      }
      toast.success('Evaluación ocupacional guardada.')
      navigate(`/occupational/${patient.id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la evaluación.')
      setSaving(false)
    }
  }

  const progress = answeredCount(template, answers)

  return (
    <form onSubmit={handleSave}>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(`/occupational/${patient.id}`)}
          className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition"
        >
          ← Volver a Terapia Ocupacional
        </button>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar' : 'Nueva'} evaluación ocupacional</h2>
        <p className="text-slate-500">
          {patient.name} · {progress.answered} de {progress.total} campos con información
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <TemplateFormFields template={template} answers={answers} onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))} />

        <div className="sticky bottom-0 -mx-6 lg:-mx-8 mt-8 flex gap-3 border-t border-slate-100 bg-white/95 px-6 lg:px-8 py-4 backdrop-blur">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar evaluación'}
          </button>
          <button type="button" onClick={() => navigate(`/occupational/${patient.id}`)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
