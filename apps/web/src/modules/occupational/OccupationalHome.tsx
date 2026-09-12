import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchOccupationalEntries } from '../../firebase/firestore'
import { usePatients } from '../../hooks/usePatients'
import { usePermissions } from '../../hooks/usePermissions'
import StatusBadge from '../../components/ui/StatusBadge'
import PendingList, { type PendingItem } from '../../components/ui/PendingList'
import type { OccupationalEntry } from '../../types/occupational'

/**
 * Inicio del área de Terapia Ocupacional: quién está pendiente de su primera
 * evaluación por criterios, y el conteo de evaluaciones por paciente.
 */
export default function OccupationalHome() {
  const navigate = useNavigate()
  const { patients } = usePatients()
  const { can } = usePermissions()
  const [entries, setEntries] = useState<OccupationalEntry[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const list = await fetchOccupationalEntries()
        if (!cancelled) setEntries(list)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'No se pudieron cargar las evaluaciones ocupacionales.')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries ?? []) map.set(e.patientId, (map.get(e.patientId) ?? 0) + 1)
    return map
  }, [entries])

  const internados = useMemo(() => patients.filter((p) => p.status === 'Activo' || p.status === 'Nuevo'), [patients])
  const canCreate = can('occupational', 'create')

  const pending: PendingItem[] | null = useMemo(() => {
    if (!entries) return null
    return internados
      .filter((p) => !counts.get(p.id))
      .map((p) => ({
        id: p.id,
        label: p.name,
        detail: canCreate ? 'Iniciar evaluación' : 'Sin evaluación',
        action: () => navigate(canCreate ? `/occupational/${p.id}/evaluacion` : `/occupational/${p.id}`),
      }))
  }, [entries, internados, counts, navigate, canCreate])

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
          <h2 className="text-2xl font-bold text-slate-800">Terapia Ocupacional</h2>
          <p className="text-slate-500">Evaluación por criterios: cumple, no cumple o no aplica</p>
        </div>
        {can('medical', 'view') && (
          <button onClick={() => navigate('/medical/formatos')} className="btn-secondary self-start sm:self-auto">
            🖨️ Formatos del expediente
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Evaluaciones registradas</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">{entries ? entries.length : '…'}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-sm text-slate-500">Internados evaluados</p>
          <p className="mt-1 text-3xl font-semibold text-slate-800">
            {entries ? `${internados.filter((p) => counts.get(p.id)).length} / ${internados.length}` : '…'}
          </p>
        </div>
      </div>

      {pending && (
        <div className="mb-8">
          <PendingList title="🧩 Internados sin evaluación ocupacional" tone="rose" items={pending} />
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
                <th className={cell}>Evaluaciones</th>
                <th className={cell}>Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map((p) => (
                <tr key={p.id} className="table-row">
                  <td className={`${cell} font-semibold text-slate-800`}>{p.name}</td>
                  <td className={`${cell} hidden md:table-cell`}>
                    <div className="flex flex-wrap gap-1">
                      <StatusBadge status={p.stage} variant="custom" />
                      <StatusBadge status={p.status} />
                    </div>
                  </td>
                  <td className={cell}>
                    {counts.get(p.id) ? (
                      <span className="text-slate-600">✅ {counts.get(p.id)}</span>
                    ) : (
                      <span className="status-badge status-pendiente">Pendiente</span>
                    )}
                  </td>
                  <td className={cell}>
                    <button
                      onClick={() => navigate(`/occupational/${p.id}`)}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                    >
                      Abrir
                    </button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-sm text-slate-400">
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
