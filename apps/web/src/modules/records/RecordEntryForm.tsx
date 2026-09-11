import { todayISO } from '../../utils/date'
import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useRecords, useRecordEntries } from '../../hooks/useRecords'
import type { RecordEntryInput, MspFormType } from '../../types/medicalRecord'
import { MSP_FORM_LABELS } from '../../types/medicalRecord'
import { validateRecordEntryInput } from '../../schemas/medicalRecord'
import MspEntryFields from './MspEntryFields'

const EMPTY: RecordEntryInput = {
  recordId: '',
  date: todayISO(),
  formType: '002',
  title: '',
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

export default function RecordEntryForm() {
  const { recordId, entryId } = useParams<{ recordId: string; entryId?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { addEntry, updateEntry, records } = useRecords()
  const { entries } = useRecordEntries(recordId)
  const record = records.find((r) => r.id === recordId)
  const editingEntry = entryId ? entries.find((e) => e.id === entryId) : undefined
  const isEditing = Boolean(entryId)

  // Al crear, el formulario puede venir fijado desde la tarjeta del Área
  // Médica (?form=005). Al editar, manda el formType de la propia entrada.
  const initialForm: MspFormType = searchParams.get('form') === '005' ? '005' : '002'
  const initial = useMemo(() => ({ ...EMPTY, formType: initialForm }), [initialForm])

  const [form, setForm] = useState<RecordEntryInput>(initial)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Prefill once the entry to edit has loaded from the live subscription.
  useEffect(() => {
    if (!editingEntry) return
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, authorId: _a, authorName: _an, ...rest } = editingEntry
    setForm({ ...initial, ...rest, formType: editingEntry.formType ?? initialForm })
  }, [editingEntry, initial, initialForm])

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
        <h2 className="text-2xl font-bold text-slate-800">
          {isEditing ? 'Editar registro' : 'Nuevo registro'} · {MSP_FORM_LABELS[form.formType ?? '002']}
        </h2>
        <p className="text-slate-500">
          {record?.patientName ?? '—'} · Historia Clínica Única MSP
        </p>
      </div>

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 p-6 lg:p-8">
        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}
        {editingEntry?.pendienteCompletar && (
          <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-sm text-amber-800">
            Registro migrado del formato anterior: los datos que no existían quedaron en blanco.
            Complete signos vitales, CIE-10 o lo que necesite y guarde.
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <MspEntryFields form={form} onChange={(patch) => setForm((f) => ({ ...f, ...patch }))} allowFormSwitch={!isEditing} />

          <div className="flex gap-3 pt-4">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : isEditing ? 'Guardar Cambios' : 'Guardar Registro'}
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
