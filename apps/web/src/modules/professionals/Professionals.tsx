import { useEffect, useState } from 'react'
import { useProfessionals } from '../../hooks/useProfessionals'
import { useAuthStore } from '../../stores/authStore'
import Modal from '../../components/ui/Modal'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import { ROLE_LABELS } from '../../config/nav'
import type { Professional, ProfessionalInput } from '../../types/professional'
import type { Role } from '../../types/user'

const ROLES: Role[] = ['medico', 'administrativo', 'admin']
const SPECIALTY_PRESETS = [
  'Médico general',
  'Psiquiatría',
  'Psicología clínica',
  'Trabajo social',
  'Enfermería',
  'Administración',
  'Coordinación',
  'Otros',
]

const EMPTY: ProfessionalInput = {
  name: '',
  role: 'medico',
  specialty: '',
  phone: '',
  email: '',
  active: true,
  uid: null,
}

export default function Professionals() {
  const { professionals, loading, error, create, update, remove } = useProfessionals()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const toast = useToast()
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Professional | null>(null)
  const [form, setForm] = useState<ProfessionalInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        role: editing.role,
        specialty: editing.specialty ?? '',
        phone: editing.phone ?? '',
        email: editing.email ?? '',
        active: editing.active,
        uid: editing.uid ?? null,
      })
    } else {
      setForm(EMPTY)
    }
    setFormError(null)
  }, [editing, open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      if (editing) {
        await update(editing.id, form)
        toast.success('Profesional actualizado.')
      } else {
        await create(form)
        toast.success('Profesional creado.')
      }
      setOpen(false)
      setEditing(null)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(p: Professional) {
    const ok = await confirm({ title: 'Eliminar profesional', message: `¿Eliminar a ${p.name}?` })
    if (!ok) return
    try {
      await remove(p)
      toast.success('Profesional eliminado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar al profesional.')
    }
  }

  function openNew() {
    setEditing(null)
    setOpen(true)
  }
  function openEdit(p: Professional) {
    setEditing(p)
    setOpen(true)
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Profesionales</h2>
          <p className="text-slate-500">Médicos, terapeutas y personal del centro</p>
        </div>
        <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Nuevo Profesional</button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {professionals.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 card-hover">
            <div className="flex items-start gap-3">
              <div className="h-16 w-16 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center text-2xl shrink-0">
                👤
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-800 truncate">{p.name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{p.specialty || '—'}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  <span className="status-badge role-medico">{ROLE_LABELS[p.role]}</span>
                  <span className={`status-badge ${p.active ? 'status-activo' : 'bg-slate-100 text-slate-500'}`}>
                    {p.active ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50 space-y-1 text-xs text-slate-500">
              {p.phone && <p>📞 {p.phone}</p>}
              {p.email && <p className="truncate">✉️ {p.email}</p>}
            </div>
            <div className="mt-3 flex gap-1">
              <button
                onClick={() => openEdit(p)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition text-sm"
                title="Editar"
              >
                ✏️ Editar
              </button>
              {isAdmin && (
                <button
                  onClick={() => handleDelete(p)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition text-sm"
                  title="Eliminar"
                >
                  🗑️
                </button>
              )}
            </div>
          </div>
        ))}
        {professionals.length === 0 && !loading && (
          <div className="col-span-full rounded-2xl bg-white p-8 border border-slate-100 text-center text-sm text-slate-400">
            No hay profesionales registrados.
          </div>
        )}
      </div>

      <Modal open={open} title={editing ? `Editar: ${editing.name}` : 'Nuevo Profesional'} onClose={() => { setOpen(false); setEditing(null) }} size="md">
        <form onSubmit={handleSubmit} className="space-y-5">
          {formError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
          )}

          <div>
            <label className="form-label">Nombre completo *</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="form-input" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="form-label">Rol</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })} className="form-input">
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">Especialidad</label>
              <input
                list="specialty-presets"
                value={form.specialty}
                onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                className="form-input"
              />
              <datalist id="specialty-presets">
                {SPECIALTY_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="form-label">Teléfono</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="form-input" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="form-input" />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            Activo
          </label>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Guardando…' : editing ? 'Guardar Cambios' : 'Crear Profesional'}
            </button>
            <button type="button" onClick={() => { setOpen(false); setEditing(null) }} className="btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
