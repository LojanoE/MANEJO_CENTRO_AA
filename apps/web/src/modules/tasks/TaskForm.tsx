import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import PatientSelect from '../../components/ui/PatientSelect'
import { useTasks, TASK_CATEGORIES, TASK_PRIORITIES, TASK_STATUSES, RECURRING_TYPES } from '../../hooks/useTasks'
import type { Task, TaskInput, TaskCategory, TaskPriority, TaskStatus, Recurring } from '../../types/task'

interface TaskFormProps {
  open: boolean
  editing: Task | null
  onClose: () => void
  onSubmit: (input: TaskInput, id?: string) => Promise<void>
}

const todayISO = () => new Date().toISOString().slice(0, 10)

const EMPTY: TaskInput = {
  title: '',
  description: '',
  category: 'Limpieza',
  assignedToId: null,
  patientId: null,
  dueDate: todayISO(),
  priority: 'Media',
  status: 'Pendiente',
  recurring: { type: 'Única' },
}

export default function TaskForm({ open, editing, onClose, onSubmit }: TaskFormProps) {
  const { patients } = useTasks()
  const [form, setForm] = useState<TaskInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        description: editing.description ?? '',
        category: editing.category,
        assignedToId: editing.assignedToId ?? null,
        patientId: editing.patientId ?? null,
        dueDate: editing.dueDate ?? todayISO(),
        priority: editing.priority,
        status: editing.status,
        recurring: editing.recurring ?? { type: 'Única' },
      })
    } else {
      setForm(EMPTY)
    }
    setError(null)
  }, [editing, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await onSubmit(form, editing?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} title={editing ? `Editar: ${editing.title}` : 'Nueva Tarea'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <div>
          <label className="form-label">Título *</label>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Ej: Limpiar sala de terapia"
            className="form-input"
            required
          />
        </div>
        <div>
          <label className="form-label">Descripción</label>
          <textarea
            value={form.description ?? ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Detalles, instrucciones, insumos requeridos…"
            className="form-textarea"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Categoría</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as TaskCategory })}
              className="form-input"
            >
              {TASK_CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Prioridad</label>
            <select
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value as TaskPriority })}
              className="form-input"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Estado</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as TaskStatus })}
              className="form-input"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Fecha límite</label>
            <input type="date" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value || null })} className="form-input" />
          </div>
          <div>
            <label className="form-label">Recurrencia</label>
            <select
              value={form.recurring.type}
              onChange={(e) => setForm({ ...form, recurring: { type: e.target.value as Recurring['type'], interval: form.recurring.interval ?? 1 } })}
              className="form-input"
            >
              {RECURRING_TYPES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          {form.recurring.type !== 'Única' && (
            <div>
              <label className="form-label">Intervalo (cada N)</label>
              <input
                type="number"
                min={1}
                value={form.recurring.interval ?? 1}
                onChange={(e) => setForm({ ...form, recurring: { ...form.recurring, interval: Number(e.target.value) } })}
                className="form-input"
              />
            </div>
          )}
          <div className="md:col-span-2">
            <label className="form-label">Paciente vinculado (opcional)</label>
            <PatientSelect
              patients={patients}
              value={form.patientId}
              onChange={(patientId) => setForm({ ...form, patientId })}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Tarea'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}