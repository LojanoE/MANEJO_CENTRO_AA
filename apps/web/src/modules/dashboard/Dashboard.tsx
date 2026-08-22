import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { usePatients } from '../../hooks/usePatients'
import { useCollection } from '../../hooks/useCollection'
import { useActivity } from '../../hooks/useActivity'
import CardStat from '../../components/ui/CardStat'
import { SkeletonCardStat, SkeletonTableRows } from '../../components/ui/Skeleton'
import StatusBadge from '../../components/ui/StatusBadge'
import type { Payment } from '../../types/payment'
import type { Visit } from '../../types/visit'
import type { Task } from '../../types/task'
import type { ActivityEntry } from '../../types/activity'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'

interface ActivityRowProps {
  entry: ActivityEntry
}

function ActivityRow({ entry }: ActivityRowProps) {
  const ts =
    entry.timestamp instanceof Date
      ? entry.timestamp
      : (entry.timestamp as { toDate?: () => Date } | null)?.toDate?.() ?? new Date()
  return (
    <div className="flex gap-3">
      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${entry.color ?? 'bg-slate-400'}`} />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800">{entry.message}</p>
        {entry.submessage && <p className="text-xs text-slate-500">{entry.submessage}</p>}
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDistanceToNow(ts, { addSuffix: true, locale: es })}
        </p>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { patients, loading: pLoading } = usePatients()
  const { data: payments, loading: payLoading, error: payError } = useCollection<Payment>('payments')
  const { data: visits, loading: vLoading, error: vError } = useCollection<Visit>('visits')
  const { data: tasks, loading: tLoading, error: tError } = useCollection<Task>('tasks')
  const { data: activity } = useActivity(8)

  const error = payError ?? vError ?? tError

  const stats = useMemo(() => {
    const activePatients = patients.filter((p) => p.status === 'Activo' || p.status === 'Nuevo').length
    const now = new Date()
    const monthRevenue = payments
      .filter((p) => p.status === 'Pagado' && new Date(p.date).getMonth() === now.getMonth() && new Date(p.date).getFullYear() === now.getFullYear())
      .reduce((a, b) => a + (b.amount || 0), 0)
    const todayISO = now.toISOString().slice(0, 10)
    const todayVisits = visits.filter((v) => v.date === todayISO).length
    // No hay campo de fecha de alta en el modelo todavía: se cuenta el total histórico,
    // no "este año", para no insinuar una fecha que no se registra.
    const totalDischarges = patients.filter((p) => p.status === 'Alta').length
    const pendingPayments = payments.filter((p) => p.status === 'Pendiente').reduce((a, b) => a + (b.amount || 0), 0)
    const openTasks = tasks.filter((t) => t.status === 'Pendiente' || t.status === 'En progreso').length
    const overdueTasks = tasks.filter(
      (t) => t.dueDate && t.dueDate < todayISO && (t.status === 'Pendiente' || t.status === 'En progreso'),
    ).length
    return { activePatients, monthRevenue, todayVisits, totalDischarges, pendingPayments, openTasks, overdueTasks }
  }, [patients, payments, visits, tasks])

  const recentPatients = useMemo(() => {
    return [...patients].sort((a, b) => (b.admission ?? '').localeCompare(a.admission ?? '')).slice(0, 5)
  }, [patients])

  const loading = pLoading || payLoading || vLoading || tLoading

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>
        <p className="text-slate-500">Resumen general del centro de rehabilitación</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCardStat key={i} />
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCardStat key={i} />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <CardStat label="Pacientes Activos" value={stats.activePatients} icon="👤" color="emerald" foot={`${patients.length - stats.activePatients} dados de alta`} />
            <CardStat label="Recaudación del Mes" value={`$${stats.monthRevenue.toFixed(2)}`} icon="💰" color="blue" foot={`${stats.pendingPayments > 0 ? `$${stats.pendingPayments.toFixed(2)} pendiente` : 'Sin pendientes'}`} />
            <CardStat label="Visitas Hoy" value={stats.todayVisits} icon="📅" color="amber" foot="Programadas para hoy" />
            <CardStat label="Total de Altas" value={stats.totalDischarges} icon="🎓" color="violet" foot="Histórico del centro" />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <CardStat label="Tareas Abiertas" value={stats.openTasks} icon="✅" color="emerald" foot={`${stats.overdueTasks} vencidas`} />
            <CardStat label="Tareas Vencidas" value={stats.overdueTasks} icon="⚠️" color={stats.overdueTasks > 0 ? 'red' : 'emerald'} foot="Requiere acción" />
          </div>
        </>
      )}

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Pacientes Recientes</h3>
            <Link to="/patients" className="text-xs font-semibold text-emerald-600 hover:text-emerald-800">
              Ver todos →
            </Link>
          </div>
          {recentPatients.length === 0 && !loading ? (
            <p className="text-sm text-slate-400 py-6 text-center">Aún no hay pacientes. Crea el primero en /Pacientes.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                    <th className="pb-3 pr-4">ID</th>
                    <th className="pb-3 pr-4">Nombre</th>
                    <th className="pb-3 pr-4">Fase</th>
                    <th className="pb-3 pr-4">Estado</th>
                    <th className="pb-3">Ingreso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading && <SkeletonTableRows columns={5} rows={5} />}
                  {recentPatients.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-500">{p.id.slice(-5)}</td>
                      <td className="py-3 pr-4 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={p.stage} variant="custom" />
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={p.status} />
                      </td>
                      <td className="py-3 text-xs text-slate-500">{p.admission}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h3 className="mb-4 text-lg font-bold text-slate-800">Actividad Reciente</h3>
          {activity.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">Sin actividad registrada todavía.</p>
          ) : (
            <div className="space-y-4">
              {activity.map((e) => (
                <ActivityRow key={e.id} entry={e} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}