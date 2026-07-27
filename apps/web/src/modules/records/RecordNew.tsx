import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import type { EntryType, RecordEntryInput } from '../../types/medicalRecord'

const ENTRY_TYPES: EntryType[] = ['Apertura', 'Seguimiento', 'Emergencia', 'Evaluación pre-visita', 'Alta médica']
const todayISO = () => new Date().toISOString().slice(0, 10)

const EMPTY: RecordEntryInput = {
  recordId: '',
  date: todayISO(),
  type: 'Apertura',
  title: '',
  anamnesis: '',
  antecedentes: '',
  evaluacion: '',
  diagnostico: '',
  tratamiento: '',
  evolucion: '',
  observaciones: '',
}

export default function RecordNew() {
  const { patientId } = useParams<{ patientId: string }>()
  const navigate = useNavigate()
  const { openRecord } = useRecords()
  const { patients } = usePatients()
  const patient = patients.find((p) => p.id === patientId)

  const [form, setForm] = useState<RecordEntryInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const id = await openRecord(patientId!, form)
      navigate(`/records/${id}`, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al abrir ficha')
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="mb-4">
        <button onClick={() => navigate('/records')} className="text-sm font-medium text-slate-500 hover:text-emerald-700 transition">
          ← Volver a Fichas Médicas
        </button>
      </div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Abrir Ficha Médica Inicial</h2>
        <p className="text-slate-500">{patient?.name ?? '—'} · Primera evaluación clínica</p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Fecha de Evaluación</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Tipo de Entrada</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as EntryType })}
                className="form-input"
              >
                {ENTRY_TYPES.map((t) => (
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
              placeholder="Ej: Ficha de Ingreso - Historial Inicial"
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">Motivo de Ingreso / Anamnesis</label>
            <textarea
              value={form.anamnesis}
              onChange={(e) => setForm({ ...form, anamnesis: e.target.value })}
              placeholder="Describa el motivo de ingreso, historial de consumo, factores desencadenantes..."
              className="form-textarea"
            />
          </div>
          <div>
            <label className="form-label">Antecedentes Médicos y Psiquiátricos</label>
            <textarea
              value={form.antecedentes}
              onChange={(e) => setForm({ ...form, antecedentes: e.target.value })}
              placeholder="Enfermedades previas, alergias, cirugías, tratamientos..."
              className="form-textarea"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Evaluación del Estado Mental</label>
              <textarea
                value={form.evaluacion}
                onChange={(e) => setForm({ ...form, evaluacion: e.target.value })}
                placeholder="Conciencia, orientación, lenguaje, afecto..."
                className="form-textarea"
              />
            </div>
            <div>
              <label className="form-label">Diagnóstico (CIE-10)</label>
              <textarea
                value={form.diagnostico}
                onChange={(e) => setForm({ ...form, diagnostico: e.target.value })}
                placeholder="Ej: Trastorno por uso de alcohol (F10.2)"
                className="form-textarea"
              />
            </div>
          </div>

          <div>
            <label className="form-label">Plan de Tratamiento</label>
            <textarea
              value={form.tratamiento}
              onChange={(e) => setForm({ ...form, tratamiento: e.target.value })}
              placeholder="Terapias, medicación, seguimiento..."
              className="form-textarea"
            />
          </div>
          <div>
            <label className="form-label">Evolución y Pronóstico</label>
            <textarea
              value={form.evolucion}
              onChange={(e) => setForm({ ...form, evolucion: e.target.value })}
              placeholder="Evaluación de evolución inicial..."
              className="form-textarea"
            />
          </div>
          <div>
            <label className="form-label">Observaciones y Recomendaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              placeholder="Restricciones de visitas, alertas, manejo familiar..."
              className="form-textarea"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : 'Guardar Ficha Inicial'}
            </button>
            <button type="button" onClick={() => navigate('/records')} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}