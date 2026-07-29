import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import type { Patient, PatientInput, PatientStatus, PatientStage } from '../../types/patient'

interface PatientFormProps {
  open: boolean
  editing: Patient | null
  onClose: () => void
  onSubmit: (input: PatientInput, id?: string) => Promise<void>
}

const STAGES: PatientStage[] = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4']
const STATUSES: PatientStatus[] = ['Activo', 'Nuevo', 'Alta', 'Inactivo']

const EMPTY: PatientInput = {
  name: '',
  age: 18,
  stage: 'Fase 1',
  status: 'Nuevo',
  admission: new Date().toISOString().slice(0, 10),
  phone: '',
  email: '',
  address: '',
  sponsor: '',
  assignedDoctorId: null,
  monthlyFee: 150,
  nextPaymentDate: '',
}

export default function PatientForm({ open, editing, onClose, onSubmit }: PatientFormProps) {
  const [form, setForm] = useState<PatientInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      const { name, age, stage, status, admission, phone, email, address, sponsor, assignedDoctorId, monthlyFee, nextPaymentDate } = editing
      setForm({
        name,
        age,
        stage,
        status,
        admission,
        phone,
        email: email ?? '',
        address: address ?? '',
        sponsor: sponsor ?? '',
        assignedDoctorId: assignedDoctorId ?? null,
        monthlyFee: monthlyFee ?? 150,
        nextPaymentDate: nextPaymentDate ?? '',
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
      const payload: PatientInput = { ...form, age: Number(form.age) || 0 }
      await onSubmit(payload, editing?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const field = (label: string, fr: React.ReactNode) => (
    <div>
      <label className="form-label">{label}</label>
      {fr}
    </div>
  )

  const inputCls = 'form-input'
  const textareaCls = 'form-textarea'

  return (
    <Modal open={open} title={editing ? `Editar: ${editing.name}` : 'Nuevo Paciente'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {field(
            'Nombre completo *',
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />,
          )}
          {field(
            'Edad',
            <input
              type="number"
              min={0}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
              className={inputCls}
            />,
          )}
          {field(
            'Fase *',
            <select value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value as PatientStage })} className={inputCls}>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>,
          )}
          {field(
            'Estado',
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as PatientStatus })} className={inputCls}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>,
          )}
          {field(
            'Fecha de Ingreso',
            <input type="date" value={form.admission} onChange={(e) => setForm({ ...form, admission: e.target.value })} className={inputCls} />,
          )}
          {field(
            'Teléfono',
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputCls} />,
          )}
          {field(
            'Email',
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />,
          )}
          {field(
            'Padrino',
            <input value={form.sponsor} onChange={(e) => setForm({ ...form, sponsor: e.target.value })} className={inputCls} />,
          )}
          {field(
            'Cuota mensual ($)',
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.monthlyFee ?? ''}
              onChange={(e) => setForm({ ...form, monthlyFee: e.target.value === '' ? null : Number(e.target.value) })}
              className={inputCls}
            />,
          )}
          {field(
            'Próximo pago',
            <input
              type="date"
              value={form.nextPaymentDate ?? ''}
              onChange={(e) => setForm({ ...form, nextPaymentDate: e.target.value || null })}
              className={inputCls}
            />,
          )}
        </div>

        {field(
          'Dirección',
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={textareaCls} />,
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Paciente'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
