import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchPsychologyEntries } from '../../firebase/firestore'
import { usePatients } from '../../hooks/usePatients'
import { usePermissions } from '../../hooks/usePermissions'
import StatusBadge from '../../components/ui/StatusBadge'
import PendingList, { type PendingItem } from '../../components/ui/PendingList'
import { daysBetween, todayISO } from '../../utils/date'
import type { PsychEntry } from '../../types/psychology'

/** Días sin sesión a partir de los cuales un internado evaluado aparece como pendiente. */
const SESSION_GAP_DAYS = 7

interface PatientSummary {
  evaluationDate?: string
  sessions: number
  lastSession?: string
  tests: number
  lastTest?: string
}

/**
 * Inicio del área de Psicología: quién está pendiente de evaluación o de
 * sesión, y el estado psicológico de cada paciente.
 */
export default function PsychologyHome() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { can } = usePermissions()
  const [entries, setEntries] = useState<PsychEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [scope, setScope] = useState<'internados' | 'todos'>('internados')
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchPsychologyEntries()
        if (!cancelled) setEntries(list)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros de psicología.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const summaries = useMemo(() => {
    const map = new Map<string, PatientSummary>()
    for (const e of entries ?? []) {
      const s = map.get(e.patientId) ?? { sessions: 0, tests: 0 }
      if (e.kind === 'evaluacion' && (!s.evaluationDate || e.date > s.evaluationDate)) s.evaluationDate = e.date
      if (e.kind === 'sesion') {
        s.sessions++
        if (!s.lastSession || e.date > s.lastSession) s.lastSession = e.date
      }
      if (e.kind === 'test') {
        s.tests++
        if (!s.lastTest || e.date > s.lastTest) s.lastTest = e.date
      }
      map.set(e.patientId, s)
    }
    return map
  }, [entries])

  const internados = useMemo(() => patients.filter((p) => p.status === 'Activo' || p.status === 'Nuevo'), [patients])

  const pending = useMemo(() => {
    if (!entries) return null
    const today = todayISO()
    const canCreate = can('psychology', 'create')
    const sinEvaluacion: PendingItem[] = internados
      .filter((p) => !summaries.get(p.id)?.evaluationDate)
      .map((p) => ({
        id: p.id,
        label: p.name,
        detail: canCreate ? 'Iniciar evaluación' : 'Sin evaluación',
        action: () => navigate(canCreate ? `/psychology/${p.id}/evaluacion` : `/psychology/${p.id}`),
      }))
    const sinSesion: PendingItem[] = internados.flatMap((p) => {
      const s = summaries.get(p.id)
      if (!s?.evaluationDate) return []
      const gap = s.lastSession ? daysBetween(s.lastSession, today) : null
      if (s.lastSession && gap != null && gap <= SESSION_GAP_DAYS) return []
      return [
        {
          id: p.id,
          label: p.name,
          detail: s.lastSession ? `Última sesión hace ${gap} días` : 'Sin sesiones',
          action: () => navigate(`/psychology/${p.id}?tab=sesiones`),
        },
      ]
    })
    return { sinEvaluacion, sinSesion }
  }, [entries, internados, summaries, navigate, can])

  const stats = useMemo(() => {
    const today = todayISO()
    const list = entries ?? []
    return {
      evaluations: list.filter((e) => e.kind === 'evaluacion').length,
      sessions30: list.filter((e) => e.kind === 'sesion' && (daysBetween(e.date, today) ?? 99) <= 30).length,
      tests: list.filter((e) => e.kind === 'test').length,
    }
  }, [entries])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return (scope === 'internados' ? internados : patients)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.idCard ?? '').includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [scope, internados, patients, search])

  const cell = 'px-4 lg:px-6 py-3.5'

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Psicología</h2>
          <p className="text-slate-500">Evaluación psicológica, sesiones y test de los usuarios del centro</p>
        </div>
        {can('medical', 'view') && (
          <button onClick={() => navigate('/medical/formatos')} className="btn-secondary self-start sm:self-auto">
            🖨️ Formatos del expediente
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Historias psicológicas', value: stats.evaluations },
          { label: 'Sesiones en los últimos 30 días', value: stats.sessions30 },
          { label: 'Test aplicados', value: stats.tests },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-800">{entries ? s.value : '…'}</p>
          </div>
        ))}
      </div>

      {pending && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PendingList title="🧠 Internados sin evaluación psicológica" tone="rose" items={pending.sinEvaluacion} />
          <PendingList title={`🗓️ Sin sesión en los últimos ${SESSION_GAP_DAYS} días`} tone="amber" items={pending.sinSesion} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre o cédula…"
          className="form-input w-full sm:w-72"
        />
        <select value={scope} onChange={(e) => setScope(e.target.value as 'internados' | 'todos')} className="form-input w-full sm:w-auto">
          <option value="internados">Internados (activos y nuevos)</option>
          <option value="todos">Todos los pacientes</option>
        </select>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className={cell}>Paciente</th>
                <th className={`${cell} hidden md:table-cell`}>Estado</th>
                <th className={cell}>Evaluación</th>
                <th className={`${cell} hidden lg:table-cell`}>Sesiones</th>
                <th className={`${cell} hidden lg:table-cell`}>Último test</th>
                <th className={cell}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((p) => {
                const s = summaries.get(p.id)
                return (
                  <tr key={p.id} className="table-row">
                    <td className={`${cell} font-semibold text-slate-800`}>{p.name}</td>
                    <td className={`${cell} hidden md:table-cell`}>
                      <div className="flex flex-wrap gap-1">
                        <StatusBadge status={p.stage} variant="custom" />
                        <StatusBadge status={p.status} />
                      </div>
                    </td>
                    <td className={cell}>
                      {s?.evaluationDate ? (
                        <span className="text-slate-600">✅ {s.evaluationDate}</span>
                      ) : (
                        <span className="status-badge status-pendiente">Pendiente</span>
                      )}
                    </td>
                    <td className={`${cell} hidden lg:table-cell text-slate-600`}>
                      {s?.sessions ? `${s.sessions} · última ${s.lastSession}` : '—'}
                    </td>
                    <td className={`${cell} hidden lg:table-cell text-slate-600`}>{s?.lastTest ?? '—'}</td>
                    <td className={cell}>
                      <button
                        onClick={() => navigate(`/psychology/${p.id}`)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay pacientes para mostrar.
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
