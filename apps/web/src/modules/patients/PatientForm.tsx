import { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import type { Patient, PatientInput, PatientStatus, PatientStage } from '../../types/patient'
import { uploadDriveFile } from '../../firebase/drive'
import { updateDocHelper } from '../../firebase/firestore'

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
}

export default function PatientForm({ open, editing, onClose, onSubmit }: PatientFormProps) {
  const [form, setForm] = useState<PatientInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [photo, setPhoto] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  useEffect(() => {
    if (editing) {
      const { name, age, stage, status, admission, phone, email, address, sponsor, assignedDoctorId } = editing
      setForm({ name, age, stage, status, admission, phone, email: email ?? '', address: address ?? '', sponsor: sponsor ?? '', assignedDoctorId: assignedDoctorId ?? null })
      setPhotoPreview(editing.photoUrl ?? null)
    } else {
      setForm(EMPTY)
      setPhotoPreview(null)
    }
    setError(null)
    setPhoto(null)
  }, [editing, open])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('La foto no debe superar 5MB')
      return
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      let photoDriveId: string | null = null
      let photoUrl: string | null = null
      if (photo && editing) {
        setUploadingPhoto(true)
        const res = await uploadDriveFile(
          `pacientes/${editing.id}/fotos`,
          `profile-${Date.now()}.${photo.name.split('.').pop() || 'jpg'}`,
          photo,
        )
        photoDriveId = res.fileId
        photoUrl = res.webViewLink
        setUploadingPhoto(false)
      }

      const payload: PatientInput = { ...form, age: Number(form.age) || 0 }
      const id = await onSubmit(payload, editing?.id)

      // If new patient, upload the photo now that we have its id
      if (photo && !editing && id) {
        setUploadingPhoto(true)
        try {
          const res = await uploadDriveFile(
            `pacientes/${id}/fotos`,
            `profile-${Date.now()}.${photo.name.split('.').pop() || 'jpg'}`,
            photo,
          )
          await updateDocHelper('patients', id, { photoDriveId: res.fileId, photoUrl: res.webViewLink })
        } catch (err) {
          console.warn('[patients] photo upload failed', err)
        }
        setUploadingPhoto(false)
      } else if (photoDriveId && editing) {
        await updateDocHelper('patients', editing.id, { photoDriveId, photoUrl })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
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

        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-2xl">
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="h-full w-full object-cover" />
            ) : (
              '👤'
            )}
          </div>
          <div>
            <label className="form-label">Foto del paciente (opcional, Drive)</label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFile}
              className="block text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-emerald-700 file:font-semibold file:cursor-pointer hover:file:bg-emerald-100"
            />
            <p className="mt-1 text-xs text-slate-400">Se guardará en Google Drive. Max 5MB.</p>
          </div>
        </div>

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
        </div>

        {field(
          'Dirección',
          <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={textareaCls} />,
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={submitting || uploadingPhoto} className="btn-primary">
            {submitting ? 'Guardando…' : uploadingPhoto ? 'Subiendo foto…' : editing ? 'Guardar Cambios' : 'Crear Paciente'}
          </button>
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}