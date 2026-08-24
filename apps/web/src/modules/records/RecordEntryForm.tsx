import { todayISO } from '../../utils/date'
import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import type { EntryType, RecordEntryInput } from '../../types/medicalRecord'
import { validateRecordEntryInput } from '../../schemas/medicalRecord'

// 'Apertura' is the type RecordNew.tsx uses for a record's first entry; this
// form only offers follow-up types. When editing an 'Apertura' entry its
// current type is added to the options below so it isn't silently changed.
const ENTRY_TYPES: EntryType[] = ['Seguimiento', 'Emergencia', 'Evaluación pre-visita', 'Alta médica']

const EMPTY: RecordEntryInput = {
  recordId: '',
  date: todayISO(),
  type: 'Seguimiento',
  title: '',
  anamnesis: '',
  antecedentes: '',
  evaluacion: '',
  diagnostico: '',
  tratamiento: '',
  evolucion: '',
  observaciones: '',
}

export default function RecordEntryForm() {
  const { recordId, entryId } = useParams<{ recordId: string; entryId?: string }>()
  const navigate = useNavigate()
  const { addEntry, updateEntry, records } = useRecords()
  const { entries } = useRecordEntries(recordId)
  const record = records.find((r) => r.id === recordId)
  const editingEntry = entryId ? entries.find((e) => e.id === entryId) : undefined
  const isEditing = Boolean(entryId)

  const [form, setForm] = useState<RecordEntryInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill once the entry to edit has loaded from the live subscription.
  useEffect(() => {
    if (!editingEntry) return
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...rest } = editingEntry
    setForm(rest)
  }, [editingEntry])

  const typeOptions = form.type === 'Apertura' ? (['Apertura', ...ENTRY_TYPES] as EntryType[]) : ENTRY_TYPES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const validationError = validateRecordEntryInput(form)
    if (validationError) {
      setError(validationError)
      setSubmitting(false)
      return
    }
    try {
      if (isEditing && editingEntry) {
        await updateEntry(editingEntry, form)
      } else {
        await addEntry(recordId!, form)
      }
      navigate(`/records/${recordId}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar entrada')
      setSubmitting(false)
    }
  }

  if (isEditing && !editingEntry) {
    return (
      <div>
        <button onClick={() => navigate(`/records/${recordId}`)} className="text-sm text-emerald-700 hover:underline mb-4">← Volver</button>
        <div className="rounded-2xl bg-white p-8 border border-slate-100 text-center text-slate-500">
          Cargando entrada…
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate(`/records/${recordId}`)} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver al Historial
        </button>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">{isEditing ? 'Editar Entrada' : 'Nueva Entrada de Seguimiento'}</h2>
        <p className="text-slate-500">
          {record?.patientName ?? '—'} · {recordId ? recordId.slice(-6) : ''}
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Fecha de la Visita</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Tipo de Entrada</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EntryType })}
                className="form-input"
              >
                {typeOptions.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label">Título *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Ej: Visita de Control - Mes 7"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">Anamnesis / Subjetivo</label>
            <textarea
              value={form.anamnesis}
              onChange={(e) => setForm({ ...form, anamnesis: e.target.value })}
              placeholder="¿Cómo se siente el paciente? Síntomas, avances..."
              className="form-textarea"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Evaluación Objetiva</label>
              <textarea
                value={form.evaluacion}
                onChange={(e) => setForm({ ...form, evaluacion: e.target.value })}
                placeholder="Estado de ánimo, conducta, adherencia..."
                className="form-textarea"
              />
            </div>
            <div>
              <label className="form-label">Antecedentes relevantes</label>
              <textarea
                value={form.antecedentes}
                onChange={(e) => setForm({ ...form, antecedentes: e.target.value })}
                placeholder="Comorbilidades o cambios en antecedentes..."
                className="form-textarea"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Diagnóstico Actual</label>
            <input
              value={form.diagnostico}
              onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
              placeholder="Estado actual del diagnóstico principal..."
              className="form-input"
            />
          </div>

          <div>
            <label className="form-label">Plan de Tratamiento / Ajustes</label>
            <textarea
              value={form.tratamiento}
              onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
              placeholder="Cambios en medicación, nuevas terapias..."
              className="form-textarea"
            />
          </div>

          <div>
            <label className="form-label">Evolución y Pronóstico</label>
            <textarea
              value={form.evolucion}
              onChange={(e) => setForm({ ...form, evolucion: e.target.value })}
              placeholder="¿Avanza de fase? ¿Riesgo de recaída?"
              className="form-textarea"
            />
          </div>

          <div>
            <label className="form-label">Observaciones y Recomendaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Notas para el equipo, autorizaciones, alertas..."
              className="form-textarea"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Guardar Entrada'}
            </button>
            <button type="button" onClick={() => navigate(`/records/${recordId}`)} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
