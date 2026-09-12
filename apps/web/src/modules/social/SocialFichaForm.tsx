import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientSocialWork } from '../../hooks/useSocialWork'
import { useSettingsLive } from '../../hooks/useSettings'
import { useToast } from '../../components/ui/ToastProvider'
import TemplateFormFields from '../../components/forms/TemplateFormFields'
import { SOCIAL_SOCIOECONOMICA } from '../../config/formTemplates/social'
import type { FormAnswers } from '../../config/formTemplates/types'
import { answeredCount, initialAnswers } from '../../utils/formAnswers'
import { prefillValues } from '../../utils/clinicalPrint'

/** Ficha socioeconómica, llenada en el sistema a partir del formato del centro. */
export default function SocialFichaForm() {
  const { patientId, entryId } = useParams<{ patientId: string; entryId?: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { patients } = usePatients()
  const { settings } = useSettingsLive()
  const patient = patients.find((p) => p.id === patientId)
  const { fichas, loading, create, update } = usePatientSocialWork(patient)

  const isEditing = Boolean(entryId)
  const editing = entryId ? fichas.find((e) => e.id === entryId) : undefined

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
    setAnswers(initialAnswers(SOCIAL_SOCIOECONOMICA, prefillValues({ patient, centerName: settings.centerName })))
  }, [patient, loading, isEditing, editing, settings.centerName])

  const previous = !isEditing ? fichas[0] : undefined

  if (!patient || !answers) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {!patient && !loading ? 'Paciente no encontrado.' : 'Cargando ficha…'}
      </div>
    )
  }

  function copyPrevious() {
    if (!previous || !patient) return
    setAnswers({ ...previous.answers, ...initialAnswers(SOCIAL_SOCIOECONOMICA, prefillValues({ patient, centerName: settings.centerName })) })
    toast.info('Se copiaron las respuestas de la ficha anterior. Actualice lo que haya cambiado.')
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
        await create({ kind: 'ficha', templateId: SOCIAL_SOCIOECONOMICA.id, answers })
      }
      toast.success('Ficha socioeconómica guardada.')
      navigate(`/social/${patient.id}?tab=ficha`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la ficha.')
      setSaving(false)
    }
  }

  const progress = answeredCount(SOCIAL_SOCIOECONOMICA, answers)

  return (
    <form onSubmit={handleSave}>
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate(`/social/${patient.id}`)}
          className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition"
        >
          ← Volver a Trabajo Social
        </button>
      </div>

      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar' : 'Nueva'} ficha socioeconómica</h2>
          <p className="text-slate-500">
            {patient.name} · {progress.answered} de {progress.total} campos con información
          </p>
        </div>
        {previous && (
          <button type="button" onClick={copyPrevious} className="btn-secondary text-sm self-start sm:self-auto">
            📋 Partir de la ficha anterior
          </button>
        )}
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>}

        <TemplateFormFields template={SOCIAL_SOCIOECONOMICA} answers={answers} onChange={(key, value) => setAnswers((a) => ({ ...a, [key]: value }))} />

        <div className="sticky bottom-0 -mx-6 lg:-mx-8 mt-8 flex gap-3 border-t border-slate-100 bg-white/95 px-6 lg:px-8 py-4 backdrop-blur">
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar ficha'}
          </button>
          <button type="button" onClick={() => navigate(`/social/${patient.id}`)} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </div>
    </form>
  )
}
