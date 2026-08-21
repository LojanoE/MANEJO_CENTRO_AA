import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import ImageUpload from '../../components/ui/ImageUpload'
import type { Patient, PatientInput, PatientStatus, PatientStage } from '../../types/patient'
import { validatePatientInput } from '../../schemas/patient'

interface PatientFormProps {
  open: boolean
  editing: Patient | null
  onClose: () => void
  onSubmit: (input: PatientInput, id?: string) => Promise<void>
}

const STAGES: PatientStage[] = ['Fase 1', 'Fase 2', 'Fase 3', 'Fase 4']
const STATUSES: PatientStatus[] = ['Activo', 'Nuevo', 'Alta', 'Inactivo']

function calculateAge(birthDate: string): number {
  if (!birthDate) return 0
  const today = new Date()
  const birth = new Date(birthDate + 'T00:00:00')
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age > 0 ? age : 0
}

const EMPTY: PatientInput = {
  name: '',
  age: 18,
  stage: 'Fase 1',
  status: 'Nuevo',
  admission: new Date().toISOString().slice(0, 10),
  phone: '',
  idCard: '',
  birthDate: '',
  maritalStatus: '',
  religion: '',
  occupation: '',
  education: '',
  email: '',
  address: '',
  sponsor: '',
  assignedDoctorId: null,
  monthlyFee: 150,
  nextPaymentDate: '',
  photoFileId: null,
  photoUrl: null,
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-2">
        {title}
      </h4>
      {children}
    </div>
  )
}

export default function PatientForm({ open, editing, onClose, onSubmit }: PatientFormProps) {
  const [form, setForm] = useState<PatientInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      const {
        name,
        age,
        stage,
        status,
        admission,
        phone,
        idCard,
        birthDate,
        maritalStatus,
        religion,
        occupation,
        education,
        email,
        address,
        sponsor,
        assignedDoctorId,
        monthlyFee,
        nextPaymentDate,
        photoFileId,
        photoUrl,
      } = editing
      setForm({
        name,
        age,
        stage,
        status,
        admission,
        phone: phone ?? '',
        idCard: idCard ?? '',
        birthDate: birthDate ?? '',
        maritalStatus: maritalStatus ?? '',
        religion: religion ?? '',
        occupation: occupation ?? '',
        education: education ?? '',
        email: email ?? '',
        address: address ?? '',
        sponsor: sponsor ?? '',
        assignedDoctorId: assignedDoctorId ?? null,
        monthlyFee: monthlyFee ?? 150,
        nextPaymentDate: nextPaymentDate ?? '',
        photoFileId: photoFileId ?? null,
        photoUrl: photoUrl ?? null,
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
      const payload: PatientInput = {
        ...form,
        age: form.birthDate ? calculateAge(form.birthDate) : Number(form.age) || 0,
      }
      const validationError = validatePatientInput(payload)
      if (validationError) {
        setError(validationError)
        setSubmitting(false)
        return
      }
      await onSubmit(payload, editing?.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  const inputCls = 'form-input min-h-[44px]'
  const textareaCls = 'form-textarea'

  return (
    <Modal open={open} title={editing ? `Editar: ${editing.name}` : 'Nuevo Paciente'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{error}</div>
        )}

        <Section title="Fotografía del paciente">
          <ImageUpload
            folderPath={editing ? `patients/${editing.id}` : 'patients/pending'}
            fileName={editing ? `patient-${editing.id}.jpg` : undefined}
            value={{ fileId: form.photoFileId ?? null, url: form.photoUrl ?? null }}
            onChange={({ fileId, url }) => setForm({ ...form, photoFileId: fileId, photoUrl: url })}
            label="Foto del paciente"
          />
        </Section>

        <Section title="Datos personales">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nombre completo *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className={inputCls}
                placeholder="Ej. Juan Pérez"
              />
            </div>
            <div>
              <label className="form-label">Cédula</label>
              <input
                value={form.idCard ?? ''}
                onChange={(e) => setForm({ ...form, idCard: e.target.value })}
                className={inputCls}
                placeholder="Número de cédula"
              />
            </div>
            <div>
              <label className="form-label">Fecha de nacimiento</label>
              <input
                type="date"
                value={form.birthDate ?? ''}
                onChange={(e) => {
                  const birthDate = e.target.value
                  const age = birthDate ? calculateAge(birthDate) : form.age
                  setForm({ ...form, birthDate, age })
                }}
                className={inputCls}
              />
            </div>
            <div>
              <label className="form-label">Edad</label>
              <input
                type="number"
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="form-label">Estado civil</label>
              <input
                value={form.maritalStatus ?? ''}
                onChange={(e) => setForm({ ...form, maritalStatus: e.target.value })}
                className={inputCls}
                placeholder="Soltero/a, Casado/a, etc."
              />
            </div>
            <div>
              <label className="form-label">Religión</label>
              <input
                value={form.religion ?? ''}
                onChange={(e) => setForm({ ...form, religion: e.target.value })}
                className={inputCls}
                placeholder="Ej. Católica"
              />
            </div>
          </div>
        </Section>

        <Section title="Contacto y ubicación">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Teléfono</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className={inputCls}
                placeholder="0991234567"
              />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className={inputCls}
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div className="lg:col-span-2">
              <label className="form-label">Dirección</label>
              <textarea
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className={textareaCls}
                placeholder="Dirección completa"
                rows={2}
              />
            </div>
          </div>
        </Section>

        <Section title="Información adicional">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Ocupación</label>
              <input
                value={form.occupation ?? ''}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
                className={inputCls}
                placeholder="Ej. Comerciante"
              />
            </div>
            <div>
              <label className="form-label">Instrucción</label>
              <input
                value={form.education ?? ''}
                onChange={(e) => setForm({ ...form, education: e.target.value })}
                className={inputCls}
                placeholder="Ej. Secundaria"
              />
            </div>
            <div>
              <label className="form-label">Padrino</label>
              <input
                value={form.sponsor}
                onChange={(e) => setForm({ ...form, sponsor: e.target.value })}
                className={inputCls}
                placeholder="Nombre del padrino"
              />
            </div>
          </div>
        </Section>

        <Section title="Gestión del centro">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha de ingreso</label>
              <input
                type="date"
                value={form.admission}
                onChange={(e) => setForm({ ...form, admission: e.target.value })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="form-label">Fase *</label>
              <select
                value={form.stage}
                onChange={(e) => setForm({ ...form, stage: e.target.value as PatientStage })}
                className={inputCls}
              >
                {STAGES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Estado</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as PatientStatus })}
                className={inputCls}
              >
                {STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Cuota mensual ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.monthlyFee ?? ''}
                onChange={(e) => setForm({ ...form, monthlyFee: e.target.value === '' ? null : Number(e.target.value) })}
                className={inputCls}
              />
            </div>
            <div>
              <label className="form-label">Próximo pago</label>
              <input
                type="date"
                value={form.nextPaymentDate ?? ''}
                onChange={(e) => setForm({ ...form, nextPaymentDate: e.target.value || null })}
                className={inputCls}
              />
            </div>
          </div>
        </Section>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary w-full sm:w-auto">
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary w-full sm:w-auto">
            {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Paciente'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
