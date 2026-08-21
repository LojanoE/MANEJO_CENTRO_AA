import { todayISO } from '../../utils/date'
import { useState } from 'react'
import { useMedicalAuths, AUTH_STATUSES } from '../../hooks/useMedicalAuths'
import { useAuthStore } from '../../stores/authStore'
import StatusBadge from '../../components/ui/StatusBadge'
import { SkeletonTableRows } from '../../components/ui/Skeleton'
import Modal from '../../components/ui/Modal'
import PatientSelect from '../../components/ui/PatientSelect'
import { useToast } from '../../components/ui/ToastProvider'
import { useConfirm } from '../../components/ui/ConfirmProvider'
import type { MedicalAuth, MedicalAuthInput, AuthStatus } from '../../types/medicalAuth'

const EMPTY: MedicalAuthInput = {
  patientId: null,
  date: todayISO(),
  type: 'Visita familiar',
  status: 'Pendiente',
  notes: '',
}

const PRESET_TYPES = ['Visita familiar', 'Visita familiar (menor)', 'Visita externa', 'Salida supervisada', 'Evaluación especial']

export default function MedicalAuths() {
  const { auths, patients, loading, error, create, setStatus, remove } = useMedicalAuths()
  const user = useAuthStore((s) => s.user)
  const canManage = user?.role === 'medico' || user?.role === 'admin'
  const isAdmin = user?.role === 'admin'
  const toast = useToast()
  const confirm = useConfirm()

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<MedicalAuthInput>(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  function openNew() {
    setForm(EMPTY)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      await create(form)
      toast.success('Autorización creada.')
      setOpen(false)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(a: MedicalAuth) {
    const ok = await confirm({
      title: 'Eliminar autorización',
      message: `¿Eliminar autorización de ${a.patientName}?`,
    })
    if (!ok) return
    try {
      await remove(a)
      toast.success('Autorización eliminada.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la autorización.')
    }
  }

  async function handleSetStatus(a: MedicalAuth, status: AuthStatus) {
    try {
      await setStatus(a, status)
      toast.success('Estado de la autorización actualizado.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'No se pudo actualizar la autorización.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Autorizaciones Médicas</h2>
          <p className="text-slate-500">Evaluación y emisión de autorizaciones para visitas</p>
        </div>
        {canManage && (
          <button onClick={openNew} className="btn-primary self-start sm:self-auto">+ Nueva Autorización</button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-2xl bg-white shadow-sm border border-slate-100 mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                <th className="px-4 lg:px-6 py-3.5">ID</th>
                <th className="px-4 lg:px-6 py-3.5">Paciente</th>
                <th className="px-4 lg:px-6 py-3.5 hidden md:table-cell">Médico</th>
                <th className="px-4 lg:px-6 py-3.5 hidden lg:table-cell">Fecha</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Tipo</th>
                <th className="px-4 lg:px-6 py-3.5">Estado</th>
                <th className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">Notas</th>
                <th className="px-4 lg:px-6 py-3.5">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading && <SkeletonTableRows columns={8} rows={5} />}
              {auths.map((a) => (
                <tr key={a.id} className="table-row">
                  <td className="px-4 lg:px-6 py-3.5 font-mono text-xs text-slate-500">{a.id.slice(-6)}</td>
                  <td className="px-4 lg:px-6 py-3.5 font-semibold text-slate-800">{a.patientName}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-slate-600 hidden md:table-cell">{a.doctorName ?? '—'}</td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden lg:table-cell">{a.date}</td>
                  <td className="px-4 lg:px-6 py-3.5 hidden xl:table-cell">
                    <StatusBadge status={a.type} variant="custom" />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <StatusBadge status={a.status} />
                  </td>
                  <td className="px-4 lg:px-6 py-3.5 text-xs text-slate-500 hidden xl:table-cell max-w-xs truncate">{a.notes}</td>
                  <td className="px-4 lg:px-6 py-3.5">
                    <div className="flex gap-1 flex-wrap">
                      {canManage && (a.status === 'Pendiente' || a.status === 'En revisión') && (
                        <select
                          value={a.status}
                          onChange={(e) => handleSetStatus(a, e.target.value as AuthStatus)}
                          className="form-input py-1 text-xs"
                          title="Cambiar estado"
                        >
                          {AUTH_STATUSES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      )}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(a)}
                          className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600 transition"
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {auths.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-sm text-slate-400">
                    No hay autorizaciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="font-bold text-amber-800 text-lg">Protocolo de Autorización Médica</p>
            <p className="text-sm text-amber-700 mt-2 leading-relaxed">
              Toda visita a menores de edad o personas en <strong>Fase 1</strong> requiere evaluación psicológica previa.
              Las visitas de personas externas al grupo familiar directo deben ser aprobadas por el médico tratante y registradas en el sistema con al menos <strong>24 horas de anticipación</strong>.
            </p>
          </div>
        </div>
      </div>

      {canManage && (
        <Modal open={open} title="Nueva Autorización Médica" onClose={() => setOpen(false)}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {formError && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{formError}</div>
            )}
            <div>
              <label className="form-label">Paciente *</label>
              <PatientSelect
                patients={patients}
                value={form.patientId}
                onChange={(patientId) => setForm({ ...form, patientId })}
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="form-label">Fecha</label>
                <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="form-input" />
              </div>
              <div>
                <label className="form-label">Tipo</label>
                <input
                  list="auth-types"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="form-input"
                  required
                />
                <datalist id="auth-types">
                  {PRESET_TYPES.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="form-label">Estado</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as AuthStatus })}
                  className="form-input"
                >
                  {AUTH_STATUSES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Notas / Evaluación *</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Describa la evaluación, condiciones del paciente, restricciones de la visita…"
                className="form-textarea"
                required
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Guardando…' : 'Emitir Autorización'}
              </button>
              <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
                Cancelar
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
