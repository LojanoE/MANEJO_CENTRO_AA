import { useMemo, useState } from 'react'
import { useChecklist } from '../../hooks/useChecklist'
import { useAuthStore } from '../../stores/authStore'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import ChecklistItemForm from './ChecklistItemForm'
import {
  WEEKDAYS,
  WEEKDAY_SHORT,
  WEEKDAY_LABELS,
  CHECKLIST_SECTIONS,
  markId,
} from '../../types/checklist'
import { weekIdOf, weekDatesOf, shiftWeek, formatWeekRange, todayISO } from '../../utils/date'
import type { ChecklistItem, ChecklistItemInput, ChecklistSection, WeekdayKey } from '../../types/checklist'

const SECTION_SUBTITLE: Record<ChecklistSection, string> = {
  Actividades: 'Rutina diaria de los internos',
  Limpieza: 'Áreas del centro a limpiar cada día',
}

export default function WeeklyChecklist() {
  const [weekId, setWeekId] = useState(() => weekIdOf())
  const {
    items,
    marksById,
    loading,
    error,
    toggleMark,
    createItem,
    updateItem,
    removeItem,
    seedTemplate,
  } = useChecklist(weekId)

  const user = useAuthStore((s) => s.user)
  const canEditTemplate = user?.role === 'admin' || user?.role === 'administrativo'
  const toast = useToast()
  const confirm = useConfirm()

  const [editMode, setEditMode] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ChecklistItem | null>(null)
  const [formSection, setFormSection] = useState<ChecklistSection>('Actividades')
  const [seeding, setSeeding] = useState(false)

  const dates = useMemo(() => weekDatesOf(weekId), [weekId])
  const today = todayISO()
  const isCurrentWeek = weekId === weekIdOf()

  const bySection = useMemo(() => {
    const groups: Record<ChecklistSection, ChecklistItem[]> = { Actividades: [], Limpieza: [] }
    items.forEach((i) => groups[i.section]?.push(i))
    return groups
  }, [items])

  /** Casillas marcadas vs. aplicables, para el contador de progreso. */
  const progress = useMemo(() => {
    let total = 0
    let done = 0
    items.forEach((item) => {
      item.days.forEach((day) => {
        total += 1
        if (marksById.has(markId(weekId, item.id, day))) done += 1
      })
    })
    return { total, done }
  }, [items, marksById, weekId])

  async function handleToggle(item: ChecklistItem, day: WeekdayKey, date: string) {
    try {
      await toggleMark(item, day, date)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la casilla.')
    }
  }

  async function handleSeed() {
    setSeeding(true)
    try {
      await seedTemplate()
      toast.success('Plantilla cargada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo cargar la plantilla.')
    } finally {
      setSeeding(false)
    }
  }

  async function handleSubmitItem(input: ChecklistItemInput, id?: string) {
    if (id) {
      await updateItem(id, input)
      toast.success('Fila actualizada.')
    } else {
      await createItem(input)
      toast.success('Fila creada.')
    }
  }

  async function handleRemoveItem(item: ChecklistItem) {
    const ok = await confirm({
      title: 'Eliminar fila',
      message: `¿Eliminar "${item.label}" del checklist? Se perderán sus marcas históricas.`,
    })
    if (!ok) return
    try {
      await removeItem(item)
      toast.success('Fila eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la fila.')
    }
  }

  function openNew(section: ChecklistSection) {
    setEditing(null)
    setFormSection(section)
    setFormOpen(true)
  }

  function openEdit(item: ChecklistItem) {
    setEditing(item)
    setFormSection(item.section)
    setFormOpen(true)
  }

  function nextOrderFor(section: ChecklistSection) {
    const rows = bySection[section]
    return rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.order)) + 1
  }

  function scheduleText(item: ChecklistItem) {
    if (!item.startTime) return null
    return item.endTime ? `${item.startTime} - ${item.endTime}` : item.startTime
  }

  if (!loading && items.length === 0) {
    return (
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-6 py-12 text-center">
        <p className="text-4xl">🗓️</p>
        <h3 className="mt-3 text-lg font-bold text-slate-800">Aún no hay checklist configurado</h3>
        <p className="mt-1 text-sm text-slate-500">
          Carga la plantilla del centro (actividades diarias y áreas de limpieza) para empezar a marcar.
        </p>
        {canEditTemplate ? (
          <button onClick={handleSeed} disabled={seeding} className="btn-primary mt-5">
            {seeding ? 'Cargando…' : 'Cargar plantilla del centro'}
          </button>
        ) : (
          <p className="mt-5 text-sm text-slate-400">
            Pide a un administrador que cargue la plantilla.
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Navegador de semana */}
      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 px-4 lg:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeekId(shiftWeek(weekId, -1))}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 font-bold"
            aria-label="Semana anterior"
          >
            ←
          </button>
          <div className="text-center min-w-[14rem]">
            <p className="font-bold text-slate-800">{formatWeekRange(weekId)}</p>
            <p className="text-xs text-slate-400">{isCurrentWeek ? 'Semana actual' : weekId}</p>
          </div>
          <button
            onClick={() => setWeekId(shiftWeek(weekId, 1))}
            className="rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100 font-bold"
            aria-label="Semana siguiente"
          >
            →
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekId(weekIdOf())} className="btn-secondary text-xs px-3 py-2">
              Hoy
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">
            <span className="font-extrabold text-emerald-700">{progress.done}</span> / {progress.total} casillas
          </span>
          {canEditTemplate && (
            <button
              onClick={() => setEditMode((v) => !v)}
              className={`rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                editMode
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              ⚙️ {editMode ? 'Terminar edición' : 'Editar plantilla'}
            </button>
          )}
        </div>
      </div>

      {CHECKLIST_SECTIONS.map((section) => {
        const rows = bySection[section]
        if (rows.length === 0 && !editMode) return null
        return (
          <div key={section} className="rounded-2xl bg-white shadow-sm border border-slate-100">
            <div className="px-4 lg:px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-800">Checklist de {section}</h3>
                <p className="text-xs text-slate-400">{SECTION_SUBTITLE[section]}</p>
              </div>
              {editMode && (
                <button onClick={() => openNew(section)} className="btn-secondary text-xs px-3 py-2">
                  + Agregar fila
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                    <th className="px-4 lg:px-6 py-3.5 min-w-[14rem]">
                      {section === 'Limpieza' ? 'Área' : 'Actividad'}
                    </th>
                    {WEEKDAYS.map((d, i) => {
                      const isToday = dates[i] === today
                      return (
                        <th
                          key={d}
                          className={`px-2 py-3.5 text-center ${isToday ? 'bg-emerald-50 text-emerald-700' : ''}`}
                          title={`${WEEKDAY_LABELS[d]} ${dates[i]}`}
                        >
                          <div>{WEEKDAY_SHORT[d]}</div>
                          <div className="font-normal normal-case text-[10px] text-slate-400">
                            {dates[i].slice(8)}
                          </div>
                        </th>
                      )
                    })}
                    {editMode && <th className="px-4 py-3.5 text-center">Acciones</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {rows.map((item) => {
                    const schedule = scheduleText(item)
                    return (
                      <tr key={item.id} className="table-row">
                        <td className="px-4 lg:px-6 py-3">
                          <p className="font-semibold text-slate-800">{item.label}</p>
                          <p className="text-xs text-slate-500">
                            {[schedule, item.responsible].filter(Boolean).join(' · ') || ' '}
                          </p>
                        </td>
                        {WEEKDAYS.map((day, i) => {
                          const applies = item.days.includes(day)
                          const isToday = dates[i] === today
                          const cellClass = `px-2 py-3 text-center ${isToday ? 'bg-emerald-50/60' : ''}`
                          if (!applies) {
                            return (
                              <td key={day} className={cellClass}>
                                <span className="text-slate-300">—</span>
                              </td>
                            )
                          }
                          const mark = marksById.get(markId(weekId, item.id, day))
                          return (
                            <td key={day} className={cellClass}>
                              <button
                                onClick={() => handleToggle(item, day, dates[i])}
                                title={
                                  mark
                                    ? `Marcado por ${mark.byName ?? 'alguien'} · ${new Date(mark.at).toLocaleString('es', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
                                    : `Marcar ${item.label} — ${WEEKDAY_LABELS[day]} ${dates[i]}`
                                }
                                aria-label={`${item.label}, ${WEEKDAY_LABELS[day]}`}
                                aria-pressed={!!mark}
                                className={`h-8 w-8 rounded-lg border-2 font-bold transition ${
                                  mark
                                    ? 'bg-emerald-600 border-emerald-600 text-white hover:bg-emerald-700'
                                    : 'border-slate-200 text-transparent hover:border-emerald-400 hover:bg-emerald-50'
                                }`}
                              >
                                ✓
                              </button>
                            </td>
                          )
                        })}
                        {editMode && (
                          <td className="px-4 py-3">
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={() => openEdit(item)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
                                title="Editar"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleRemoveItem(item)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                                title="Eliminar"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    )
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={WEEKDAYS.length + (editMode ? 2 : 1)} className="px-6 py-8 text-center text-sm text-slate-400">
                        Sin filas en esta sección.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <p className="text-xs text-slate-400 px-1">
        Las casillas con “—” indican que la actividad no aplica ese día. Pasa el cursor sobre una
        casilla marcada para ver quién la marcó y cuándo.
      </p>

      <ChecklistItemForm
        open={formOpen}
        editing={editing}
        defaultSection={formSection}
        nextOrder={nextOrderFor(formSection)}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={handleSubmitItem}
      />
    </div>
  )
}
