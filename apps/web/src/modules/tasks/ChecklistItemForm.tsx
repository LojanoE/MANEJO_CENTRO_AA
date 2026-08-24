import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import {
  WEEKDAYS,
  WEEKDAY_LABELS,
  CHECKLIST_SECTIONS,
} from '../../types/checklist'
import type { ChecklistItem, ChecklistItemInput, ChecklistSection, WeekdayKey } from '../../types/checklist'

interface ChecklistItemFormProps {
  open: boolean
  editing: ChecklistItem | null
  /** Sección sugerida al crear una fila nueva. */
  defaultSection: ChecklistSection
  /** Siguiente `order` libre en esa sección. */
  nextOrder: number
  onClose: () => void
  onSubmit: (input: ChecklistItemInput, id?: string) => Promise<void>
}

export default function ChecklistItemForm({
  open,
  editing,
  defaultSection,
  nextOrder,
  onClose,
  onSubmit,
}: ChecklistItemFormProps) {
  const [form, setForm] = useState<ChecklistItemInput>({
    section: defaultSection,
    label: '',
    startTime: null,
    endTime: null,
    responsible: null,
    days: WEEKDAYS,
    order: nextOrder,
    active: true,
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        section: editing.section,
        label: editing.label,
        startTime: editing.startTime ?? null,
        endTime: editing.endTime ?? null,
        responsible: editing.responsible ?? null,
        days: editing.days ?? [],
        order: editing.order,
        active: editing.active,
      })
    } else {
      setForm({
        section: defaultSection,
        label: '',
        startTime: null,
        endTime: null,
        responsible: null,
        days: WEEKDAYS,
        order: nextOrder,
        active: true,
      })
    }
    setError(null)
  }, [editing, open, defaultSection, nextOrder])

  function toggleDay(day: WeekdayKey) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.days.length === 0) {
      setError('Selecciona al menos un día.')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      // Guardar los días en el orden canónico lunes→domingo, no en el de clic.
      const days = WEEKDAYS.filter((d) => form.days.includes(d))
      await onSubmit({ ...form, days }, editing?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      open={open}
      title={editing ? `Editar: ${editing.label}` : 'Nueva fila del checklist'}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="form-label">Sección</label>
            <select
              value={form.section}
              onChange={(e) => setForm({ ...form, section: e.target.value as ChecklistSection })}
              className="form-input"
            >
              {CHECKLIST_SECTIONS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Orden</label>
            <input
              type="number"
              min={1}
              value={form.order}
              onChange={(e) => setForm({ ...form, order: Number(e.target.value) })}
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Nombre *</label>
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Ej: Terapia psicológica"
            className="form-input"
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div>
            <label className="form-label">Hora de inicio</label>
            <input
              type="time"
              value={form.startTime ?? ''}
              onChange={(e) => setForm({ ...form, startTime: e.target.value || null })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Hora de fin</label>
            <input
              type="time"
              value={form.endTime ?? ''}
              onChange={(e) => setForm({ ...form, endTime: e.target.value || null })}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">Responsable</label>
            <input
              value={form.responsible ?? ''}
              onChange={(e) => setForm({ ...form, responsible: e.target.value || null })}
              placeholder="Ej: Marco Ramírez"
              className="form-input"
            />
          </div>
        </div>

        <div>
          <label className="form-label">Días en que aplica *</label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAYS.map((d) => {
              const on = form.days.includes(d)
              return (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold border transition ${
                    on
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {WEEKDAY_LABELS[d]}
                </button>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Los días no seleccionados se muestran como “—” en la tabla.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
          />
          Activa (desmarcar la retira de la tabla sin borrar el historial)
        </label>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Fila'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
