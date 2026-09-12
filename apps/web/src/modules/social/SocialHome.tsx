import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchSocialWorkEntries } from '../../firebase/firestore'
import { usePatients } from '../../hooks/usePatients'
import { usePermissions } from '../../hooks/usePermissions'
import StatusBadge from '../../components/ui/StatusBadge'
import PendingList, { type PendingItem } from '../../components/ui/PendingList'
import type { SocialWorkEntry } from '../../types/socialWork'

interface PatientSummary {
  hasFicha: boolean
  seguimientos: number
}

/**
 * Inicio del área de Trabajo Social: quién está pendiente de ficha
 * socioeconómica al internarse, y quién egresó sin seguimiento registrado.
 */
export default function SocialHome() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { can } = usePermissions()
  const [entries, setEntries] = useState<SocialWorkEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchSocialWorkEntries()
        if (!cancelled) setEntries(list)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar los registros de trabajo social.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const summaries = useMemo(() => {
    const map = new Map<string, PatientSummary>()
    for (const e of entries ?? []) {
      const s = map.get(e.patientId) ?? { hasFicha: false, seguimientos: 0 }
      if (e.kind === 'ficha') s.hasFicha = true
      if (e.kind === 'seguimiento') s.seguimientos++
      map.set(e.patientId, s)
    }
    return map
  }, [entries])

  const internados = useMemo(() => patients.filter((p) => p.status === 'Activo' || p.status === 'Nuevo'), [patients])
  const egresados = useMemo(() => patients.filter((p) => p.status === 'Alta'), [patients])
  const canCreate = can('social', 'create')

  const pending = useMemo(() => {
    if (!entries) return null
    const sinFicha: PendingItem[] = internados
      .filter((p) => !summaries.get(p.id)?.hasFicha)
      .map((p) => ({
        id: p.id,
        label: p.name,
        detail: canCreate ? 'Iniciar ficha' : 'Sin ficha',
        action: () => navigate(canCreate ? `/social/${p.id}/ficha` : `/social/${p.id}`),
      }))
    const sinSeguimiento: PendingItem[] = egresados
      .filter((p) => !summaries.get(p.id)?.seguimientos)
      .map((p) => ({
        id: p.id,
        label: p.name,
        detail: canCreate ? 'Registrar visita' : 'Sin seguimiento',
        action: () => navigate(canCreate ? `/social/${p.id}/seguimiento` : `/social/${p.id}?tab=seguimientos`),
      }))
    return { sinFicha, sinSeguimiento }
  }, [entries, internados, egresados, summaries, navigate, canCreate])

  const stats = useMemo(() => {
    const list = entries ?? []
    return {
      fichas: list.filter((e) => e.kind === 'ficha').length,
      seguimientos: list.filter((e) => e.kind === 'seguimiento').length,
    }
  }, [entries])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    return patients
      .filter((p) => !q || p.name.toLowerCase().includes(q) || (p.idCard ?? '').includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [patients, search])

  const cell = 'px-4 lg:px-6 py-3.5'

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Trabajo Social</h2>
          <p className="text-slate-500">Ficha socioeconómica al ingreso y seguimiento tras el egreso</p>
        </div>
        {can('medical', 'view') && (
          <button onClick={() => navigate('/medical/formatos')} className="btn-secondary self-start sm:self-auto">
            🖨️ Formatos del expediente
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Fichas socioeconómicas', value: stats.fichas },
          { label: 'Visitas de seguimiento', value: stats.seguimientos },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-800">{entries ? s.value : '…'}</p>
          </div>
        ))}
      </div>

      {pending && (
        <div className="mb-8 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PendingList title="🏠 Internados sin ficha socioeconómica" tone="rose" items={pending.sinFicha} />
          <PendingList title="🚪 Egresados sin seguimiento registrado" tone="amber" items={pending.sinSeguimiento} />
        </div>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar por nombre o cédula…"
          className="form-input w-full sm:w-72"
        />
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className={cell}>Paciente</th>
                <th className={`${cell} hidden md:table-cell`}>Estado</th>
                <th className={cell}>Ficha socioeconómica</th>
                <th className={`${cell} hidden lg:table-cell`}>Seguimientos</th>
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
                      {s?.hasFicha ? (
                        <span className="text-slate-600">✅ Registrada</span>
                      ) : (
                        <span className="status-badge status-pendiente">Pendiente</span>
                      )}
                    </td>
                    <td className={`${cell} hidden lg:table-cell text-slate-600`}>{s?.seguimientos ?? 0}</td>
                    <td className={cell}>
                      <button
                        onClick={() => navigate(`/social/${p.id}`)}
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
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-slate-400">
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
