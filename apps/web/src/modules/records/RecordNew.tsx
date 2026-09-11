import { todayISO } from '../../utils/date'
import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useRecords } from '../../hooks/useRecords'
import { usePatients } from '../../hooks/usePatients'
import type { RecordEntryInput } from '../../types/medicalRecord'
import { validateRecordEntryInput } from '../../schemas/medicalRecord'
import MspEntryFields from './MspEntryFields'

/** Abrir una ficha = primera consulta, siempre formulario MSP 002. */
const EMPTY: RecordEntryInput = {
  recordId: '',
  date: todayISO(),
  formType: '002',
  title: 'Consulta de ingreso',
  motivoConsulta: '',
  enfermedadActual: '',
  antecedentesPersonales: '',
  antecedentesFamiliares: '',
  signosVitales: undefined,
  examenFisico: {},
  diagnosticos: [],
  evolucion: '',
  prescripciones: [],
  planTratamiento: '',
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
    const validationError = validateRecordEntryInput(form)
    if (validationError) {
      setError(validationError)
      setSubmitting(false)
      return
    }
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
        <h2 className="text-2xl font-bold text-slate-800">Abrir Historia Clínica · Consulta Externa (MSP 002)</h2>
        <p className="text-slate-500">{patient?.name ?? '—'} · Primera atención — Historia Clínica Única MSP</p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <MspEntryFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} />

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : 'Abrir Historia Clínica'}
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
