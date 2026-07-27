import { useMemo } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { usePatients } from '../../hooks/usePatients'
import type { Payment } from '../../types/payment'
import type { Task } from '../../types/task'
import type { Patient, PatientStage } from '../../types/patient'

const MONTHS_ES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const PHASE_COLOR: Record<PatientStage, { bg: string; ring: string; text: string }> = {
  'Fase 1': { bg: '#f87171', ring: 'bg-red-400', text: 'text-red-700' },
  'Fase 2': { bg: '#fbbf24', ring: 'bg-amber-400', text: 'text-amber-700' },
  'Fase 3': { bg: '#60a5fa', ring: 'bg-blue-400', text: 'text-blue-700' },
  'Fase 4': { bg: '#10b981', ring: 'bg-emerald-500', text: 'text-emerald-700' },
}

export default function Reports() {
  const { data: payments } = useCollection<Payment>('payments')
  const { data: tasks } = useCollection<Task>('tasks')
  const { patients } = usePatients()
  const now = new Date()

  /** Evolución de pacientes por mes (año actual) basado en fecha de admisión. */
  const evolution = useMemo(() => {
    const year = now.getFullYear()
    const counts = new Array(12).fill(0)
    patients.forEach((p: Patient) => {
      const d = new Date(p.admission)
      if (d.getFullYear() === year) counts[d.getMonth()] += 1
    })
    // Cumulative: count active patients per month
    const cumulative: number[] = []
    let acc = 0
    counts.forEach((c) => {
      acc += c
      cumulative.push(acc)
    })
    return counts.map((c, i) => ({ month: MONTHS_ES[i].slice(0, 3), label: MONTHS_ES[i], newAdmissions: c, cumulative: cumulative[i] }))
  }, [patients])

  /** Recaudación mensual del año actual (solo pagos Pagados). */
  const revenue = useMemo(() => {
    const year = now.getFullYear()
    const arr = new Array(12).fill(0)
    payments
      .filter((p) => p.status === 'Pagado')
      .forEach((p) => {
        const d = new Date(p.date)
        if (d.getFullYear() === year) arr[d.getMonth()] += Number(p.amount) || 0
      })
    return arr.map((v, idx) => ({ month: MONTHS_ES[idx].slice(0, 3), label: MONTHS_ES[idx], value: v }))
  }, [payments])

  /** Distribución por fase. */
  const distribution = useMemo(() => {
    const stages: PatientStage[] = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4']
    return stages.map((stage) => ({
      stage,
      count: patients.filter((p) => p.stage === stage).length,
    }))
  }, [patients])

  /** Resumen de tareas por categoría y estado. */
  const taskSummary = useMemo(() => {
    const categories = Array.from(new Set(tasks.map((t) => t.category)))
    return categories.map((cat) => ({
      category: cat,
      total: tasks.filter((t) => t.category === cat).length,
      done: tasks.filter((t) => t.category === cat && t.status === 'Hecha').length,
      pending: tasks.filter((t) => t.category === cat && (t.status === 'Pendiente' || t.status === 'En progreso')).length,
    }))
  }, [tasks])

  const maxEvolution = Math.max(...evolution.map((e) => e.newAdmissions), 1)
  const maxCumulative = Math.max(...evolution.map((e) => e.cumulative), 1)
  const maxRevenue = Math.max(...revenue.map((r) => r.value), 1)
  const totalPhaseCount = distribution.reduce((a, b) => a + b.count, 0) || 1

  // Donut angles
  let phaseAcc = 0
  const donutStops = distribution.map((d) => {
    const start = phaseAcc
    const pct = (d.count / totalPhaseCount) * 100
    phaseAcc += pct
    return { ...d, start, end: phaseAcc }
  })

  const maxCategoryTotal = Math.max(...taskSummary.map((s) => s.total), 1)

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Reportes</h2>
        <p className="text-slate-500">Estadísticas y análisis del centro — datos en vivo</p>
      </div>

      {patients.length === 0 && payments.length === 0 && tasks.length === 0 && (
        <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-700">
          Aún no hay datos suficientes para generar reportes. Crea pacientes, pagos y tareas primero.
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Evolución de pacientes */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="mb-5 font-bold text-slate-800 text-lg">
            Evolución de Pacientes ({now.getFullYear()})
          </h3>
          <div className="space-y-3">
            {evolution.map((e, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">{e.label}</span>
                  <span className="font-bold text-slate-800">
                    {e.newAdmissions} nuevos · {e.cumulative} acumulado
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100 relative overflow-hidden">
                  <div
                    className="h-2.5 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(e.newAdmissions / maxEvolution) * 100}%` }}
                  />
                  <div
                    className="absolute top-0 left-0 h-2.5 rounded-full bg-emerald-300/60 transition-all"
                    style={{ width: `${(e.cumulative / maxCumulative) * 100}%` }}
                    title={`${e.cumulative} acumulado`}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recaudación mensual */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="mb-5 font-bold text-slate-800 text-lg">Recaudación Mensual ($)</h3>
          <div className="space-y-3">
            {revenue.map((r, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-slate-600 font-medium">{r.label}</span>
                  <span className="font-bold text-slate-800">${r.value.toLocaleString()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-slate-100">
                  <div
                    className="h-2.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${(r.value / maxRevenue) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between text-sm">
            <span className="text-slate-500 font-medium">Total año:</span>
            <span className="font-extrabold text-blue-700">
              ${revenue.reduce((a, b) => a + b.value, 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Distribución por fase */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="mb-5 font-bold text-slate-800 text-lg">Distribución por Fase de Recuperación</h3>
          <div className="flex flex-col sm:flex-row items-center gap-8">
            <div className="flex-1 w-full space-y-4">
              {distribution.map((d) => (
                <div key={d.stage} className="flex items-center gap-3">
                  <div className={`h-4 w-4 rounded-full ${PHASE_COLOR[d.stage].ring} shadow-sm shrink-0`} />
                  <span className="text-sm text-slate-700 font-medium flex-1">{d.stage}</span>
                  <span className="text-sm font-bold text-slate-800">
                    {d.count} pacientes ({Math.round((d.count / totalPhaseCount) * 100)}%)
                  </span>
                </div>
              ))}
            </div>
            <div
              className="flex h-40 w-40 sm:h-48 sm:w-48 items-center justify-center rounded-full shadow-inner shrink-0"
              style={{
                background: `conic-gradient(${
                  donutStops
                    .map((s) => `${PHASE_COLOR[s.stage].bg} ${s.start}% ${s.end}%`)
                    .join(', ')
                })`,
              }}
            >
              <div className="flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-white shadow-lg text-center">
                <div>
                  <p className="text-2xl font-extrabold text-slate-800">{totalPhaseCount}</p>
                  <p className="text-xs text-slate-400 font-medium">pacientes</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen de tareas */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="mb-5 font-bold text-slate-800 text-lg">Tareas por Categoría</h3>
          {taskSummary.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No hay tareas registradas.</p>
          ) : (
            <div className="space-y-4">
              {taskSummary.map((s) => (
                <div key={s.category}>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-700 font-medium">{s.category}</span>
                    <span className="text-xs font-bold text-slate-600">
                      {s.done} hechas · {s.pending} pendientes · {s.total} total
                    </span>
                  </div>
                  <div className="h-3 rounded-full bg-slate-100 flex overflow-hidden">
                    <div
                      className="h-3 bg-emerald-500 transition-all"
                      style={{ width: `${(s.done / maxCategoryTotal) * 100}%` }}
                      title={`${s.done} hechas`}
                    />
                    <div
                      className="h-3 bg-blue-400 transition-all"
                      style={{ width: `${(s.pending / maxCategoryTotal) * 100}%` }}
                      title={`${s.pending} pendientes`}
                    />
                  </div>
                </div>
              ))}
              <div className="flex gap-4 pt-3 border-t border-slate-100 text-xs">
                <span className="flex items-center gap-1.5 text-emerald-700"><span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Hechas</span>
                <span className="flex items-center gap-1.5 text-blue-700"><span className="h-2.5 w-2.5 rounded-full bg-blue-400" /> Pendientes</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}