import { useMemo, useState } from 'react'
import { useTasks, TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES } from '../../hooks/useTasks'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import TaskForm from './TaskForm'
import type { Task, TaskInput, TaskPriority, TaskStatus } from '../../types/task'

const todayISO = () => new Date().toISOString().slice(0, 10)

const PRIORITY_COLOR: Record<TaskPriority, string> = {
  Baja: 'bg-slate-100 text-slate-600',
  Media: 'bg-blue-100 text-blue-700',
  Alta: 'bg-amber-100 text-amber-700',
  Urgente: 'bg-red-100 text-red-700',
}

const COLUMN_ORDER: TaskStatus[] = ['Pendiente', 'En progreso', 'Hecha', 'Cancelada']
const COLUMN_TITLE: Record<TaskStatus, string> = {
  'Pendiente': 'Pendiente',
  'En progreso': 'En progreso',
  'Hecha': 'Hecha',
  'Cancelada': 'Cancelada',
}

export default function Tasks() {
  const { tasks, loading, error, create, update, setStatus, remove } = useTasks()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'

  const [view, setView] = useState<'list' | 'kanban'>('list')
  const [search, setSearch] = useState('')
  const [catFilter, setCatFilter] = useState<string>('Todas')
  const [prioFilter, setPrioFilter] = useState<string>('Todas')
  const [statusFilter, setStatusFilter] = useState<string>('Todos')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Task | null>(null)

  const filtered = useMemo(() => {
    return tasks.filter((t) => {
      const s = !search || t.title.toLowerCase().includes(search.toLowerCase())
      const c = catFilter === 'Todas' || t.category === catFilter
      const p = prioFilter === 'Todas' || t.priority === prioFilter
      const st = statusFilter === 'Todos' || t.status === statusFilter
      return s && c && p && st
    })
  }, [tasks, search, catFilter, prioFilter, statusFilter])

  const stats = useMemo(() => {
    const today = todayISO()
    return {
      total: tasks.length,
      open: tasks.filter((t) => t.status === 'Pendiente' || t.status === 'En progreso').length,
      done: tasks.filter((t) => t.status === 'Hecha').length,
      overdue: tasks.filter(
        (t) => t.dueDate && t.dueDate < today && (t.status === 'Pendiente' || t.status === 'En progreso'),
      ).length,
    }
  }, [tasks])

  async function handleSubmit(input: TaskInput, id?: string) {
    if (id) await update(id, input)
    else await create(input)
  }

  async function handleDelete(t: Task) {
    if (confirm(`¿Eliminar tarea "${t.title}"?`)) await remove(t)
  }

  function openNew() {
    setEditing(null)
    setFormOpen(true)
  }
  function openEdit(t: Task) {
    setEditing(t)
    setFormOpen(true)
  }

  const kanbanGroups = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = { 'Pendiente': [], 'En progreso': [], 'Hecha': [], 'Cancelada': [] }
    filtered.forEach((t) => groups[t.status].push(t))
    return groups
  }, [filtered])

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tareas del Centro</h2>
          <p className="text-slate-500">Limpieza, mantenimiento, terapias, administración del centro</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden">
            <button
              onClick={() => setView('list')}
              className={`px-3 py-2 text-sm font-semibold ${view === 'list' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setView('kanban')}
              className={`px-3 py-2 text-sm font-semibold ${view === 'kanban' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              🗂️ Kanban
            </button>
          </div>
          <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Nueva Tarea</button>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-extrabold text-slate-700">{stats.total}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Abiertas</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-700">{stats.open}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Completadas</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">{stats.done}</p>
        </div>
        <div className="card-hover rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Vencidas</p>
          <p className={`mt-2 text-2xl font-extrabold ${stats.overdue > 0 ? 'text-red-700' : 'text-slate-700'}`}>{stats.overdue}</p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Buscar tarea..."
          className="form-input w-full sm:w-72"
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="form-input w-full sm:w-auto">
          <option>Todas</option>
          {TASK_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <select value={prioFilter} onChange={(e) => setPrioFilter(e.target.value)} className="form-input w-full sm:w-auto">
          <option>Todas</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input w-full sm:w-auto">
          <option>Todos</option>
          {TASK_STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      {view === 'list' ? (
        <div className="rounded-2xl bg-white shadow-sm border border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                  <th className="px-4 lg:px-6 py-3.5">Título</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Categoría</th>
                  <th className="px-4 lg:px-6 py-3.5">Prioridad</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Fecha límite</th>
                  <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Recurrencia</th>
                  <th className="px-4 lg:px-6 py-3.5">Estado</th>
                  <th className="px-4 lg:px-6 py-3.5">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((t) => {
                  const overdue = t.dueDate && t.dueDate < todayISO() && (t.status === 'Pendiente' || t.status === 'En progreso')
                  return (
                    <tr key={t.id} className="table-row">
                      <td className="px-4 lg:px-6 py-3.5">
                        <div>
                          <p className="font-semibold text-slate-800">{t.title}</p>
                          {t.description && (
                            <p className="text-xs text-slate-500 truncate max-w-xs">{t.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 hidden md:table-cell">
                        <StatusBadge status={t.category} variant="custom" />
                      </td>
                      <td className="px-4 lg:px-6 py-3.5">
                        <span className={`status-badge ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">
                        <span className={`text-xs ${overdue ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                          {t.dueDate ?? '—'} {overdue && '⚠'}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell">
                        {t.recurring.type !== 'Única' ? `${t.recurring.type}${t.recurring.interval && t.recurring.interval > 1 ? ` (x${t.recurring.interval})` : ''}` : '—'}
                      </td>
                      <td className="px-4 lg:px-6 py-3.5">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-4 lg:px-6 py-3.5">
                        <div className="flex gap-1 flex-wrap">
                          {t.status !== 'Hecha' && t.status !== 'Cancelada' && (
                            <button
                              onClick={() => setStatus(t, 'Hecha')}
                              className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                            >
                              ✓ Hecha
                            </button>
                          )}
                          <button
                            onClick={() => openEdit(t)}
                            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(t)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                              title="Eliminar"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-sm text-slate-400">
                      No hay tareas con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {COLUMN_ORDER.map((col) => (
            <div key={col} className="rounded-2xl bg-slate-100/70 border border-slate-200 p-3">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">{COLUMN_TITLE[col]}</h3>
                <span className="text-xs font-bold text-slate-500 bg-white rounded-full px-2 py-0.5">
                  {kanbanGroups[col].length}
                </span>
              </div>
              <div className="space-y-2">
                {kanbanGroups[col].map((t) => {
                  const overdue = t.dueDate && t.dueDate < todayISO() && (t.status === 'Pendiente' || t.status === 'En progreso')
                  return (
                    <div key={t.id} className="rounded-xl bg-white p-3 border border-slate-100 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-800 text-sm">{t.title}</p>
                        <span className={`text-xs font-bold shrink-0 ${overdue ? 'text-red-600' : 'text-slate-400'}`}>
                          {t.dueDate ?? ''}
                        </span>
                      </div>
                      {t.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-2">
                        <StatusBadge status={t.category} variant="custom" />
                        <span className={`status-badge ${PRIORITY_COLOR[t.priority]}`}>{t.priority}</span>
                        {t.recurring.type !== 'Única' && (
                          <span className="status-badge bg-violet-100 text-violet-700">🔄 {t.recurring.type}</span>
                        )}
                      </div>
                      <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50">
                        {t.status !== 'Hecha' && t.status !== 'Cancelada' && (
                          <button
                            onClick={() => setStatus(t, 'Hecha')}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition"
                          >
                            ✓ Hecha
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(t)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(t)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
                {kanbanGroups[col].length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">Sin tareas</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <TaskForm
        open={formOpen}
        editing={editing}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmit}
      />
    </div>
  )
}