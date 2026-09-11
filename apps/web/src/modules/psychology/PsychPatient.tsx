import { useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useRecords } from '../../hooks/useRecords'
import { usePatientPsychology } from '../../hooks/usePsychology'
import { usePermissions } from '../../hooks/usePermissions'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import StatusBadge from '../../components/ui/StatusBadge'
import ToggleChip from '../../components/ui/ToggleChip'
import { PSICO_HISTORIA } from '../../config/formTemplates/psicologia'
import { PSYCH_TESTS, PSYCH_TEST_DISCLAIMER, findPsychTest, scoreBand, type PsychTestDef } from '../../config/psychTests'
import { answerText, answeredCount, sectionTextKey } from '../../utils/formAnswers'
import { currentTimeHHMM, hcNumber } from '../../utils/clinicalPrint'
import { todayISO } from '../../utils/date'
import TestTrendChart from './TestTrendChart'
import {
  SESSION_MODALITIES,
  type NewPsychEntry,
  type PsychEntry,
  type PsychEvaluation,
  type PsychSession,
  type PsychTestId,
  type PsychTestResult,
  type SessionModality,
} from '../../types/psychology'
import type { Patient } from '../../types/patient'

type Tab = 'evaluacion' | 'sesiones' | 'test'
const TABS: { id: Tab; label: string }[] = [
  { id: 'evaluacion', label: 'Historia psicológica' },
  { id: 'sesiones', label: 'Sesiones' },
  { id: 'test', label: 'Test' },
]

type Actions = {
  create: (input: NewPsychEntry) => Promise<string>
  update: (entry: PsychEntry, patch: Partial<NewPsychEntry>) => Promise<void>
  remove: (entry: PsychEntry) => Promise<void>
}

function useDeleteEntry(remove: Actions['remove']) {
  const toast = useToast()
  const confirm = useConfirm()
  return async (entry: PsychEntry, what: string) => {
    const ok = await confirm({ title: `Eliminar ${what}`, message: `¿Eliminar ${what} del ${entry.date}? No se puede deshacer.` })
    if (!ok) return
    try {
      await remove(entry)
      toast.success('Registro eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar.')
    }
  }
}

// ── Historia psicológica ────────────────────────────────────────────────

function EvaluationTab({ patient, evaluations, remove }: { patient: Patient; evaluations: PsychEvaluation[]; remove: Actions['remove'] }) {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const deleteEntry = useDeleteEntry(remove)
  const latest = evaluations[evaluations.length - 1]

  if (!latest) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-100 text-center">
        <p className="text-4xl">🧠</p>
        <p className="mt-3 font-bold text-slate-800">Aún no tiene historia clínica psicológica</p>
        <p className="mt-1 text-sm text-slate-500">
          Incluye la entrevista para adultos: datos generales, consumo, antecedentes, familia, examen mental y conclusiones.
        </p>
        {can('psychology', 'create') && (
          <button onClick={() => navigate(`/psychology/${patient.id}/evaluacion`)} className="btn-primary mt-5">
            Iniciar evaluación psicológica
          </button>
        )}
      </div>
    )
  }

  const progress = answeredCount(PSICO_HISTORIA, latest.answers)
  const pct = progress.total ? Math.round((progress.answered / progress.total) * 100) : 0
  const excerpt = (section: string, label?: string) => {
    const key = sectionTextKey(PSICO_HISTORIA, section, label)
    return key ? answerText(latest.answers, key).trim() : ''
  }
  const highlights = [
    ['Motivo de consulta', excerpt('Motivo de consulta', 'Motivo')],
    ['Conclusiones', excerpt('Conclusiones')],
    ['Recomendaciones generales', excerpt('Recomendaciones', 'Generales')],
    ['Recomendaciones específicas', excerpt('Recomendaciones', 'Específicas')],
  ] as const

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Historia clínica psicológica</h3>
            <p className="text-sm text-slate-500">
              {latest.date}
              {latest.hora ? ` · ${latest.hora}` : ''} · {latest.authorName ?? '—'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={`#/print/psico/historia/${patient.id}`}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary inline-flex items-center text-xs"
            >
              🖨️ Imprimir
            </a>
            {can('psychology', 'edit') && (
              <button onClick={() => navigate(`/psychology/${patient.id}/evaluacion/${latest.id}`)} className="btn-primary text-xs">
                ✏️ Continuar / editar
              </button>
            )}
          </div>
        </div>

        <div className="mt-4">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Campos con información</span>
            <span className="font-semibold text-slate-700">
              {progress.answered} de {progress.total}
            </span>
          </div>
          <div className="mt-1 h-2 rounded-full bg-emerald-100">
            <div className="h-2 rounded-full bg-emerald-600" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          {highlights.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 p-3 border border-slate-100">
              <p className="mb-1 text-xs font-bold uppercase text-slate-400">{label}</p>
              <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">{value || '—'}</p>
            </div>
          ))}
        </div>
      </div>

      {can('psychology', 'create') && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
          <span>¿Reingreso del usuario? Registre una nueva evaluación; puede partir de la anterior.</span>
          <button onClick={() => navigate(`/psychology/${patient.id}/evaluacion`)} className="btn-secondary text-xs">
            + Nueva evaluación
          </button>
        </div>
      )}

      {evaluations.length > 1 && (
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <h4 className="mb-2 font-bold text-slate-800">Evaluaciones anteriores</h4>
          <ul className="divide-y divide-slate-50 text-sm">
            {evaluations
              .slice(0, -1)
              .reverse()
              .map((ev) => (
                <li key={ev.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="text-slate-700">
                    {ev.date} · {ev.authorName ?? '—'}
                  </span>
                  <span className="flex gap-1">
                    {can('psychology', 'edit') && (
                      <button
                        onClick={() => navigate(`/psychology/${patient.id}/evaluacion/${ev.id}`)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600"
                        title="Abrir"
                      >
                        ✏️
                      </button>
                    )}
                    {can('psychology', 'delete') && (
                      <button
                        onClick={() => deleteEntry(ev, 'la evaluación')}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Sesiones ────────────────────────────────────────────────────────────

type SessionDraft = {
  date: string
  hora: string
  modality: SessionModality
  durationMin: string
  process: string
  observations: string
}

const newSessionDraft = (): SessionDraft => ({
  date: todayISO(),
  hora: currentTimeHHMM(),
  modality: 'Individual',
  durationMin: '',
  process: '',
  observations: '',
})

function SessionsTab({ patient, sessions, create, update, remove }: { patient: Patient; sessions: PsychSession[] } & Actions) {
  const { can } = usePermissions()
  const toast = useToast()
  const deleteEntry = useDeleteEntry(remove)
  const [draft, setDraft] = useState<SessionDraft | null>(null)
  const [editing, setEditing] = useState<PsychSession | null>(null)
  const [saving, setSaving] = useState(false)

  function startEdit(s: PsychSession) {
    setEditing(s)
    setDraft({
      date: s.date,
      hora: s.hora ?? '',
      modality: s.modality,
      durationMin: s.durationMin ? String(s.durationMin) : '',
      process: s.process,
      observations: s.observations,
    })
  }

  async function handleSave() {
    if (!draft) return
    if (!draft.process.trim()) {
      toast.error('Describa el proceso terapéutico de la sesión.')
      return
    }
    setSaving(true)
    const payload = {
      date: draft.date,
      hora: draft.hora,
      modality: draft.modality,
      durationMin: draft.durationMin ? Number(draft.durationMin) : null,
      process: draft.process.trim(),
      observations: draft.observations.trim(),
    }
    try {
      if (editing) await update(editing, payload)
      else await create({ kind: 'sesion', ...payload })
      toast.success(editing ? 'Sesión actualizada.' : 'Sesión registrada.')
      setDraft(null)
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la sesión.')
    } finally {
      setSaving(false)
    }
  }

  const recent = [...sessions].reverse()

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{sessions.length} sesiones registradas</p>
        <div className="flex gap-2">
          <a
            href={`#/print/psico/evolucion/${patient.id}`}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary inline-flex items-center text-xs"
          >
            🖨️ Hoja de evolución
          </a>
          {can('psychology', 'create') && !draft && (
            <button
              onClick={() => {
                setEditing(null)
                setDraft(newSessionDraft())
              }}
              className="btn-primary text-xs"
            >
              + Nueva sesión
            </button>
          )}
        </div>
      </div>

      {draft && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-emerald-200 space-y-4">
          <h3 className="font-bold text-slate-800">{editing ? 'Editar sesión' : 'Nueva sesión'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="form-label">Fecha</label>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Hora</label>
              <input type="time" value={draft.hora} onChange={(e) => setDraft({ ...draft, hora: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Duración (min)</label>
              <input
                type="number"
                min={0}
                value={draft.durationMin}
                onChange={(e) => setDraft({ ...draft, durationMin: e.target.value })}
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label">Modalidad</label>
              <div className="flex flex-wrap gap-2">
                {SESSION_MODALITIES.map((m) => (
                  <ToggleChip key={m} label={m} active={draft.modality === m} onClick={() => setDraft({ ...draft, modality: m })} />
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="form-label">Proceso terapéutico *</label>
            <textarea
              value={draft.process}
              onChange={(e) => setDraft({ ...draft, process: e.target.value })}
              placeholder="Objetivo de la sesión, técnicas aplicadas, temas trabajados, respuesta del usuario…"
              className="form-textarea min-h-32"
            />
          </div>
          <div>
            <label className="form-label">Observaciones</label>
            <textarea
              value={draft.observations}
              onChange={(e) => setDraft({ ...draft, observations: e.target.value })}
              placeholder="Acuerdos, tareas, alertas para el equipo…"
              className="form-textarea"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Guardando…' : 'Guardar sesión'}
            </button>
            <button
              onClick={() => {
                setDraft(null)
                setEditing(null)
              }}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {recent.length === 0 && !draft && (
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-sm text-slate-400">
          Sin sesiones registradas.
        </div>
      )}

      {recent.map((s) => (
        <div key={s.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="status-badge bg-fuchsia-50 text-fuchsia-700">{s.modality}</span>
              <span className="text-sm font-semibold text-slate-700">
                {s.date}
                {s.hora ? ` · ${s.hora}` : ''}
              </span>
              {s.durationMin ? <span className="text-xs text-slate-400">{s.durationMin} min</span> : null}
              <span className="text-xs text-slate-400">· {s.authorName ?? '—'}</span>
            </div>
            <div className="flex gap-1">
              {can('psychology', 'edit') && (
                <button onClick={() => startEdit(s)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Editar">
                  ✏️
                </button>
              )}
              {can('psychology', 'delete') && (
                <button
                  onClick={() => deleteEntry(s, 'la sesión')}
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

// ── Test ────────────────────────────────────────────────────────────────

type TestDraft = { testId: PsychTestId; date: string; substance: string; score: string; interpretation: string; notes: string }

function TestsTab({ tests, create, remove }: { tests: PsychTestResult[] } & Actions) {
  const { can } = usePermissions()
  const toast = useToast()
  const deleteEntry = useDeleteEntry(remove)
  const [draft, setDraft] = useState<TestDraft>({ testId: 'audit', date: todayISO(), substance: 'Alcohol', score: '', interpretation: '', notes: '' })
  const [interpretationTouched, setInterpretationTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const def = findPsychTest(draft.testId)
  const score = draft.score === '' ? null : Number(draft.score)
  const band = scoreBand(def, score, def.substances ? draft.substance : undefined)
  const interpretation = interpretationTouched ? draft.interpretation : band?.label ?? draft.interpretation

  async function handleSave() {
    if (!def.manual && score == null) {
      toast.error('Ingrese el puntaje.')
      return
    }
    if (score != null && (score < def.min || score > def.max)) {
      toast.error(`El puntaje de ${def.name} va de ${def.min} a ${def.max}.`)
      return
    }
    if (!interpretation.trim()) {
      toast.error('Escriba la interpretación del resultado.')
      return
    }
    setSaving(true)
    try {
      await create({
        kind: 'test',
        testId: draft.testId,
        date: draft.date,
        score,
        substance: def.substances ? draft.substance : undefined,
        interpretation: interpretation.trim(),
        notes: draft.notes.trim(),
      })
      toast.success('Test registrado.')
      setDraft({ ...draft, score: '', interpretation: '', notes: '' })
      setInterpretationTouched(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo registrar el test.')
    } finally {
      setSaving(false)
    }
  }

  const groups = useMemo(() => {
    const map = new Map<string, { def: PsychTestDef; substance?: string; results: PsychTestResult[] }>()
    for (const t of tests) {
      if (t.score == null) continue
      const key = `${t.testId}|${t.substance ?? ''}`
      if (!map.has(key)) map.set(key, { def: findPsychTest(t.testId), substance: t.substance, results: [] })
      map.get(key)!.results.push(t)
    }
    const order = (id: PsychTestId) => PSYCH_TESTS.findIndex((t) => t.id === id)
    return [...map.values()].sort((a, b) => order(a.def.id) - order(b.def.id))
  }, [tests])

  return (
    <div className="space-y-6">
      {can('psychology', 'create') && (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-bold text-slate-800">Registrar test</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="form-label">Test</label>
              <select
                value={draft.testId}
                onChange={(e) => {
                  setDraft({ ...draft, testId: e.target.value as PsychTestId, score: '', interpretation: '' })
                  setInterpretationTouched(false)
                }}
                className="form-input"
              >
                {PSYCH_TESTS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Fecha de aplicación</label>
              <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Puntaje {def.manual ? '(opcional)' : `(${def.min} a ${def.max})`}</label>
              <input
                type="number"
                min={def.min}
                max={def.max}
                value={draft.score}
                onChange={(e) => setDraft({ ...draft, score: e.target.value })}
                className="form-input"
              />
            </div>
            {def.substances && (
              <div className="md:col-span-2">
                <label className="form-label">Sustancia evaluada</label>
                <select value={draft.substance} onChange={(e) => setDraft({ ...draft, substance: e.target.value })} className="form-input">
                  {def.substances.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            )}
            <div className={def.substances ? 'md:col-span-2' : 'md:col-span-4'}>
              <label className="form-label">Interpretación</label>
              <input
                value={interpretation}
                onChange={(e) => {
                  setInterpretationTouched(true)
                  setDraft({ ...draft, interpretation: e.target.value })
                }}
                placeholder={def.manual ? 'Interprete el resultado' : 'Se sugiere según el puntaje'}
                className="form-input"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Notas</label>
            <textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} className="form-textarea" />
          </div>
          <p className="text-xs text-slate-400">{PSYCH_TEST_DISCLAIMER}</p>
          <button onClick={handleSave} disabled={saving} className="btn-primary">
            {saving ? 'Guardando…' : 'Guardar test'}
          </button>
        </div>
      )}

      {groups.length > 0 && (
        <div>
          <h3 className="mb-3 text-sm font-extrabold uppercase tracking-wider text-slate-500">Evolución de puntajes</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {groups.map((g) => (
              <TestTrendChart key={`${g.def.id}|${g.substance ?? ''}`} def={g.def} substance={g.substance} results={g.results} />
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Test</th>
                <th className="px-4 py-3 text-right">Puntaje</th>
                <th className="px-4 py-3">Interpretación</th>
                <th className="px-4 py-3 hidden md:table-cell">Profesional</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {[...tests].reverse().map((t) => (
                <tr key={t.id} className="table-row align-top">
                  <td className="px-4 py-3 whitespace-nowrap text-slate-600">{t.date}</td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {findPsychTest(t.testId).name}
                    {t.substance ? <span className="block text-xs font-normal text-slate-400">{t.substance}</span> : null}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">{t.score ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {t.interpretation}
                    {t.notes && <span className="block text-xs text-slate-400">{t.notes}</span>}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{t.authorName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {can('psychology', 'delete') && (
                      <button
                        onClick={() => deleteEntry(t, 'el test')}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {tests.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    Sin test registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Pantalla ────────────────────────────────────────────────────────────

/** Expediente psicológico de un paciente: historia, sesiones y test. */
export default function PsychPatient() {
  const { patientId } = useParams<{ patientId: string }>()
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { patients, loading } = usePatients()
  const { records } = useRecords()
  const { can } = usePermissions()
  const patient = patients.find((p) => p.id === patientId)
  const record = patient ? records.find((r) => r.patientId === patient.id) : undefined
  const { evaluations, sessions, tests, loading: entriesLoading, create, update, remove } = usePatientPsychology(patient)

  const tabParam = params.get('tab')
  const tab: Tab = TABS.some((t) => t.id === tabParam) ? (tabParam as Tab) : 'evaluacion'

  if (!patient) {
    return (
      <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
        {loading ? 'Cargando…' : 'Paciente no encontrado.'}
      </div>
    )
  }

  const counts: Record<Tab, number> = { evaluacion: evaluations.length, sesiones: sessions.length, test: tests.length }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/psychology')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Psicología
        </button>
      </div>

      <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">
              N° HC {hcNumber(patient, record) || '—'} · {patient.age} años · Ingreso: {patient.admission}
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
      ) : (
        <>
          {tab === 'evaluacion' && <EvaluationTab patient={patient} evaluations={evaluations} remove={remove} />}
          {tab === 'sesiones' && <SessionsTab patient={patient} sessions={sessions} create={create} update={update} remove={remove} />}
          {tab === 'test' && <TestsTab tests={tests} create={create} update={update} remove={remove} />}
        </>
      )}
    </div>
  )
}
