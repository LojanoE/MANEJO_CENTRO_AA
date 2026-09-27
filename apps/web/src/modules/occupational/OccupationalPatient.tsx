import { useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { usePatientOccupational } from '../../hooks/useOccupational'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import StatusBadge from '../../components/ui/StatusBadge'
import { formatTimestamp, todayISO } from '../../utils/date'
import { currentTimeHHMM, hcNumber } from '../../utils/clinicalPrint'
import { occupationalTotals } from '../../utils/occupational'
import type { Patient } from '../../types/patient'
import type { NewOccupationalEntry, OccupationalEntry, OccupationalEvaluation, OccupationalSession } from '../../types/occupational'

type Tab = 'evaluaciones' | 'evolucion'
const TABS: { id: Tab; label: string }[] = [
  { id: 'evaluaciones', label: 'Evaluaciones' },
  { id: 'evolucion', label: 'Hoja de evolución' },
]

type Actions = {
  create: (input: NewOccupationalEntry) => Promise<string>
  update: (entry: OccupationalEntry, patch: Partial<NewOccupationalEntry>) => Promise<void>
  remove: (entry: OccupationalEntry) => Promise<void>
}

function useDeleteEntry(remove: Actions['remove']) {
  const toast = useToast()
  const confirm = useConfirm()
  return async (entry: OccupationalEntry, title: string, message: string) => {
    const ok = await confirm({ title, message })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Registro eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.')
    }
  }
}

// ── Evaluaciones por criterios ──────────────────────────────────────────

function EvaluationsTab({ patient, evaluations, remove }: { patient: Patient; evaluations: OccupationalEvaluation[]; remove: Actions['remove'] }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const deleteEntry = useDeleteEntry(remove)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{evaluations.length} evaluaciones registradas</p>
        <div className="flex gap-2">
          {evaluations.length > 0 && (
            <a href={`#/print/occupational/${patient.id}`} target="_blank" rel="noreferrer" className="btn-secondary inline-flex items-center text-xs">
              🖨️ Imprimir última
            </a>
          )}
          {can('occupational', 'create') && (
            <button onClick={() => navigate(`/occupational/${patient.id}/evaluacion`)} className="btn-primary text-xs">
              + Nueva evaluación
            </button>
          )}
        </div>
      </div>

      {evaluations.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
          <p className="text-4xl">🧩</p>
          <p className="mt-3 font-bold text-slate-800">Aún no tiene evaluación ocupacional</p>
          <p className="mt-1 text-sm text-slate-500">Coordinación, equilibrio, atención, actividades de la vida diaria y componente cognitivo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {evaluations.map((entry) => {
            const totals = occupationalTotals(entry.answers, entry.templateId)
            return (
              <div key={entry.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      {formatTimestamp(entry.createdAt)} · {entry.authorName ?? '—'}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span className="status-badge status-activo">✔ Cumple: {totals.c}</span>
                      <span className="status-badge bg-amber-100 text-amber-700">✖ No cumple: {totals.nc}</span>
                      <span className="status-badge bg-slate-100 text-slate-600">— No aplica: {totals.na}</span>
                      <span className="text-slate-400">de {totals.total} criterios</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <a
                      href={`#/print/occupational/${patient.id}/${entry.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-emerald-600"
                      title="Imprimir"
                    >
                      🖨️
                    </a>
                    {can('occupational', 'edit') && (
                      <button
                        onClick={() => navigate(`/occupational/${patient.id}/evaluacion/${entry.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Editar"
                      >
                        ✏️
                      </button>
                    )}
                    {can('occupational', 'delete') && (
                      <button
                        onClick={() => deleteEntry(entry, 'Eliminar evaluación', '¿Eliminar esta evaluación ocupacional? No se puede deshacer.')}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Hoja de evolución ───────────────────────────────────────────────────

type SessionDraft = { date: string; hora: string; process: string; observations: string }

const newSessionDraft = (): SessionDraft => ({ date: todayISO(), hora: currentTimeHHMM(), process: '', observations: '' })

function EvolutionTab({ patient, sessions, create, update, remove }: { patient: Patient; sessions: OccupationalSession[] } & Actions) {
  const { can } = usePermissions()
  const toast = useToast()
  const deleteEntry = useDeleteEntry(remove)
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const [editing, setEditing] = useState<OccupationalSession | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(s: OccupationalSession) {
    setEditing(s)
    setDraft({ date: s.date, hora: s.hora ?? '', process: s.process, observations: s.observations })
  }

  function closeDraft() {
    setDraft(null)
    setEditing(null)
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.process.trim()) {
      toast.error('Describa el proceso terapéutico de la atención.')
      return
    }
    setSaving(true)
    const payload = {
      date: draft.date,
      hora: draft.hora,
      process: draft.process.trim(),
      observations: draft.observations.trim(),
    }
    try {
      if (editing) await update(editing, payload)
      else await create({ kind: 'sesion', ...payload })
      toast.success(editing ? 'Atención actualizada.' : 'Atención registrada.')
      closeDraft()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la atención.')
    } finally {
      setSaving(false)
    }
  }

  const recent = [...sessions].reverse()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{sessions.length} atenciones registradas</p>
        <div className="flex gap-2">
          <a
            href={`#/print/occupational/evolucion/${patient.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center text-xs"
          >
            🖨️ Hoja de evolución
          </a>
          {can('occupational', 'create') && !draft && (
            <button
              onClick={() => {
                setEditing(null)
                setDraft(newSessionDraft())
              }}
              className="btn-primary text-xs"
            >
              + Nueva atención
            </button>
          )}
        </div>
      </div>

      {draft && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-emerald-200 space-y-4">
          <h3 className="font-bold text-slate-800">{editing ? 'Editar atención' : 'Nueva atención individual'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Hora</label>
              <input type="time" value={draft.hora} onChange={(e) => setDraft({ ...draft, hora: e.target.value })} className="form-input" />
            </div>
          </div>
          <div>
            <label className="form-label">Proceso terapéutico *</label>
            <textarea
              value={draft.process}
              onChange={(e) => setDraft({ ...draft, process: e.target.value })}
              placeholder="Actividades realizadas, objetivos trabajados, desempeño del usuario…"
              className="form-textarea min-h-32"
            />
          </div>
          <div>
            <label className="form-label">Observaciones</label>
            <textarea
              value={draft.observations}
              onChange={(e) => setDraft({ ...draft, observations: e.target.value })}
              placeholder="Avances, dificultades, recomendaciones…"
              className="form-textarea"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar atención'}
            </button>
            <button onClick={closeDraft} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {recent.length === 0 && !draft && (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-sm text-slate-400">Sin atenciones registradas.</div>
      )}

      {recent.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-slate-700">
                {s.date}
                {s.hora ? ` · ${s.hora}` : ''}
              </span>
              <span className="text-xs text-slate-400">· {s.authorName ?? '—'}</span>
            </div>
            <div className="flex gap-1">
              {can('occupational', 'edit') && (
                <button onClick={() => startEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                  ✏️
                </button>
              )}
              {can('occupational', 'delete') && (
                <button
                  onClick={() => deleteEntry(s, 'Eliminar atención', `¿Eliminar la atención del ${s.date}? No se puede deshacer.`)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                  title="Eliminar"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{s.process}</p>
          {s.observations && (
            <p className="mt-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600 whitespace-pre-wrap">{s.observations}</p>
          )}
        </div>
      ))}
    </div>
  )
}

/** Expediente ocupacional de un paciente: evaluaciones por criterios y hoja de evolución. */
export default function OccupationalPatient() {
  const { patientId } = useParams<{ patientId: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { patients, loading } = usePatients()
  const { can } = usePermissions()
  const patient = patients.find((p) => p.id === patientId)
  const { evaluations, sessions, loading: entriesLoading, create, update, remove } = usePatientOccupational(patient)

  const tabParam = params.get('tab')
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : TABS[0].id

  if (!patient) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {loading ? 'Cargando…' : 'Paciente no encontrado.'}
      </div>
    )
  }

  const counts: Record<Tab, number> = { evaluaciones: evaluations.length, evolucion: sessions.length }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/occupational')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Terapia Ocupacional
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">
              N° HC {hcNumber(patient) || '—'} · {patient.age} años · Ingreso: {patient.admission}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <StatusBadge status={patient.stage} variant="custom" />
              <StatusBadge status={patient.status} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {can('patients', 'viewDetail') && (
              <button onClick={() => navigate(`/patients/${patient.id}`)} className="btn-secondary text-xs">
                👤 Ficha del paciente
              </button>
            )}
            {can('medical', 'view') && (
              <button onClick={() => navigate(`/medical/formatos?paciente=${patient.id}`)} className="btn-secondary text-xs">
                🗂️ Formatos
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-4 border-b border-slate-200 overflow-x-auto">
        <nav className="-mb-px flex gap-6 whitespace-nowrap" aria-label="Pestañas">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setParams({ tab: t.id }, { replace: true })}
              className={`border-b-2 px-1 py-3 text-sm font-bold transition ${
                tab === t.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {t.label}
              <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-500">{counts[t.id]}</span>
            </button>
          ))}
        </nav>
      </div>

      {entriesLoading ? (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">Cargando registros…</div>
      ) : tab === 'evaluaciones' ? (
        <EvaluationsTab patient={patient} evaluations={evaluations} remove={remove} />
      ) : (
        <EvolutionTab patient={patient} sessions={sessions} create={create} update={update} remove={remove} />
      )}
    </div>
  )
}
